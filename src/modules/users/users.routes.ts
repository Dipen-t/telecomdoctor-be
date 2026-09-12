import { FastifyInstance } from 'fastify';
import { getMeHandler, updateMeHandler } from './users.controller';
import { authenticate } from '../../middleware/authentication';

export async function usersRoutes(server: FastifyInstance) {
  server.addHook('preHandler', authenticate);
  
  server.get('/me', getMeHandler);
  server.patch('/me', updateMeHandler);
}
