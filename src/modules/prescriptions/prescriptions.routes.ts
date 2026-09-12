import { FastifyInstance } from 'fastify';
import { createPrescriptionHandler, getPrescriptionHandler } from './prescriptions.controller';
import { authenticate } from '../../middleware/authentication';
import { authorizeRoles } from '../../middleware/authorization';

export async function prescriptionsRoutes(server: FastifyInstance) {
  // Create a prescription (Doctors only)
  server.post(
    '/:id/prescriptions',
    { preHandler: [authenticate, authorizeRoles(['DOCTOR'])] },
    createPrescriptionHandler
  );

  // Get a prescription (Doctor or Patient)
  server.get(
    '/:id/prescriptions',
    { preHandler: [authenticate, authorizeRoles(['DOCTOR', 'PATIENT'])] },
    getPrescriptionHandler
  );
}
