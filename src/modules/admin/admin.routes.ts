import { FastifyInstance } from 'fastify';
import { getAnalyticsHandler } from './admin.controller';
import { authenticate } from '../../middleware/authentication';
import { authorizeRoles } from '../../middleware/authorization';

export async function adminRoutes(server: FastifyInstance) {
  server.get('/analytics', {
    schema: {
      tags: ['Admin'],
      summary: 'Get platform analytics (Admin only)',
      description: 'Returns aggregate analytics for the platform including total users, doctors, consultations, and revenue. Requires ADMIN role.',
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          description: 'Platform analytics overview',
          type: 'object',
          properties: {
            totalUsers: { type: 'integer' },
            totalDoctors: { type: 'integer' },
            totalConsultations: { type: 'integer' },
            completedConsultations: { type: 'integer' },
            cancelledConsultations: { type: 'integer' },
            totalRevenue: { type: 'number', description: 'Total revenue in INR' },
            totalBookings: { type: 'integer' }
          }
        },
        403: { description: 'Forbidden — requires ADMIN role', type: 'object', properties: { error: { type: 'string' } } }
      }
    },
    preHandler: [authenticate, authorizeRoles(['ADMIN'])]
  }, getAnalyticsHandler);
}
