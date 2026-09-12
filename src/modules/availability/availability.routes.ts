import { FastifyInstance } from 'fastify';
import { createSlotHandler, getSlotsHandler, deleteSlotHandler } from './availability.controller';
import { authenticate } from '../../middleware/authentication';
import { authorizeRoles } from '../../middleware/authorization';

export async function availabilityRoutes(server: FastifyInstance) {
  // Public
  server.get('/doctors/:doctorId/availability', getSlotsHandler);

  // Doctor Only
  server.post(
    '/doctors/:doctorId/availability',
    { preHandler: [authenticate, authorizeRoles(['DOCTOR', 'ADMIN'])] },
    createSlotHandler
  );

  server.delete(
    '/availability/:slotId',
    { preHandler: [authenticate, authorizeRoles(['DOCTOR', 'ADMIN'])] },
    deleteSlotHandler
  );
}
