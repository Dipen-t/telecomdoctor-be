import { FastifyInstance } from 'fastify';
import { createDoctorHandler, searchDoctorsHandler, getDoctorByIdHandler } from './doctors.controller';
import { authenticate } from '../../middleware/authentication';
import { authorizeRoles } from '../../middleware/authorization';

export async function doctorsRoutes(server: FastifyInstance) {
  server.get('/', searchDoctorsHandler);
  server.get('/:id', getDoctorByIdHandler);

  // Protected Admin Route
  server.post(
    '/',
    { preHandler: [authenticate, authorizeRoles(['ADMIN'])] },
    createDoctorHandler
  );
}
