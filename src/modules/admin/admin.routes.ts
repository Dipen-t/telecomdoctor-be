import { FastifyInstance } from 'fastify';
import { getAnalyticsHandler } from './admin.controller';
import { authenticate } from '../../middleware/authentication';
import { authorizeRoles } from '../../middleware/authorization';

export async function adminRoutes(server: FastifyInstance) {
  server.get(
    '/analytics',
    { preHandler: [authenticate, authorizeRoles(['ADMIN'])] },
    getAnalyticsHandler
  );
}
