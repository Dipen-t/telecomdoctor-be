import 'dotenv/config';
import crypto from 'crypto';
import Fastify from 'fastify';
import { authRoutes } from '../modules/auth/auth.routes';
import { usersRoutes } from '../modules/users/users.routes';
import { doctorsRoutes } from '../modules/doctors/doctors.routes';
import { availabilityRoutes } from '../modules/availability/availability.routes';
import { bookingsRoutes } from '../modules/bookings/bookings.routes';
import { webhooksRoutes } from '../modules/webhooks/webhooks.routes';
import { prescriptionsRoutes } from '../modules/prescriptions/prescriptions.routes';
import { paymentsRoutes, paymentWebhookRoutes } from '../modules/payments/payments.routes';
import { adminRoutes } from '../modules/admin/admin.routes';
import { startOutboxWorker } from '../workers/outbox.worker';
import { globalErrorHandler } from '../middleware/error-handler';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyMetrics from 'fastify-metrics';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import { setupRateLimiter } from '../middleware/rate-limiter';

// Assert required environment variables before starting
const requiredEnv = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'REFRESH_TOKEN_SECRET'];
for (const env of requiredEnv) {
  if (!process.env[env] && process.env.NODE_ENV !== 'test') {
    console.error(`CRITICAL ERROR: Missing required environment variable: ${env}`);
    process.exit(1);
  }
}

const server = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          hostname: request.hostname,
          remoteAddress: request.ip,
          remotePort: request.socket.remotePort
        };
      }
    }
  },
  genReqId: () => crypto.randomUUID() // Ensure every request has an ID
});

// Register Global Error Handler
server.setErrorHandler(globalErrorHandler);

// Health check endpoint
server.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const start = async () => {
  try {
    // 1. Setup Rate Limiter (Fail open)
    await setupRateLimiter(server);

    // 2. Setup Security Headers (Helmet & CORS)
    await server.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
        },
      }
    });
    await server.register(cors, {
      origin: process.env.CORS_ORIGIN || (process.env.NODE_ENV === 'production' ? 'https://app.amrutam.example' : '*'),
      credentials: true
    });

    // 3. Setup Metrics (Prometheus)
    await server.register(fastifyMetrics, { endpoint: '/metrics' });

    // 4. Setup Swagger Documentation
    await server.register(swagger, {
      openapi: {
        info: {
          title: 'Amrutam Telemedicine API',
          description: '## Production-Grade Telemedicine Backend\n\n' +
            'A modular, secure, and observable REST API for managing telemedicine consultations.\n\n' +
            '### Key Engineering Features\n' +
            '- **Concurrency-safe bookings** via PostgreSQL `SELECT ... FOR UPDATE` row-level locking\n' +
            '- **Write idempotency** via `Idempotency-Key` header with SHA-256 body hashing\n' +
            '- **Transactional Outbox** for reliable async event delivery (notifications, emails)\n' +
            '- **Defense-in-depth security**: Helmet, CORS, RBAC, resource ownership checks, rate limiting\n' +
            '- **Observability**: Structured JSON logging (Pino), Prometheus metrics at `/metrics`\n\n' +
            '### Authentication\n' +
            'All protected endpoints require a `Bearer` JWT token in the `Authorization` header. ' +
            'Obtain tokens via `POST /api/v1/auth/login`.\n\n' +
            '### Rate Limiting\n' +
            'Critical write endpoints are rate-limited. Exceeding the limit returns `429 Too Many Requests`.',
          version: '1.0.0',
          contact: {
            name: 'Amrutam Engineering',
            url: 'https://github.com/Dipen-t/telecomdoctor-be'
          }
        },
        servers: [
          { url: 'http://localhost:3000', description: 'Local Development' }
        ],
        tags: [
          { name: 'Authentication', description: 'User registration, login, MFA, and token management' },
          { name: 'Users', description: 'User profile management (authenticated)' },
          { name: 'Doctors', description: 'Doctor profiles, search, and filtering' },
          { name: 'Availability', description: 'Doctor availability slot management' },
          { name: 'Bookings', description: 'Consultation booking with concurrency protection and idempotency' },
          { name: 'Prescriptions', description: 'Medical prescription creation and retrieval' },
          { name: 'Payments', description: 'Payment initiation and webhook processing' },
          { name: 'Admin', description: 'Platform analytics and administration (ADMIN role required)' },
          { name: 'Webhooks', description: 'External service webhooks (payment gateway, LiveKit)' }
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'JWT access token obtained from POST /api/v1/auth/login'
            }
          }
        }
      }
    });

    await server.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'full',
        deepLinking: false
      }
    });

    // Register routes
    server.register(authRoutes, { prefix: '/api/v1/auth' });
    server.register(usersRoutes, { prefix: '/api/v1/users' });
    server.register(doctorsRoutes, { prefix: '/api/v1/doctors' });
    server.register(availabilityRoutes, { prefix: '/api/v1' });
    server.register(bookingsRoutes, { prefix: '/api/v1/bookings' });
    server.register(prescriptionsRoutes, { prefix: '/api/v1/consultations' });
    server.register(paymentsRoutes, { prefix: '/api/v1' });
    server.register(webhooksRoutes, { prefix: '/api/v1/webhooks' });
    server.register(paymentWebhookRoutes, { prefix: '/api/v1/webhooks' });
    server.register(adminRoutes, { prefix: '/api/v1/admin' });
    const port = parseInt(process.env.PORT || '3000', 10);
    const address = await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`Server listening on ${address}`);
    
    // Start background jobs
    startOutboxWorker();

  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
