import { FastifyInstance } from 'fastify';
import { createBookingHandler, getMyBookingsHandler, getVideoToken } from './bookings.controller';
import { authenticate } from '../../middleware/authentication';
import { authorizeRoles } from '../../middleware/authorization';
import { rateLimiter } from '../../middleware/rate-limit';
import { idempotencyInterceptor } from '../../middleware/idempotency';

export async function bookingsRoutes(server: FastifyInstance) {
  // Get Patient's bookings
  server.get(
    '/',
    { preHandler: [authenticate, authorizeRoles(['PATIENT'])] },
    getMyBookingsHandler
  );

  // Book a slot (Critical Route: Rate limited to 10 requests per minute, Idempotency required)
  server.post(
    '/',
    { 
      preHandler: [
        authenticate, 
        authorizeRoles(['PATIENT']), 
        rateLimiter(10, 60),
        idempotencyInterceptor
      ] 
    },
    createBookingHandler
  );

  // Generate LiveKit Video Token
  server.post(
    '/:id/video/token',
    { preHandler: [authenticate, authorizeRoles(['PATIENT', 'DOCTOR'])] },
    getVideoToken
  );
}
