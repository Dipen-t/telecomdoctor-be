import { FastifyInstance } from 'fastify';
import { registerHandler, loginHandler, mfaVerifyHandler } from './auth.controller';
import { z } from 'zod';

export async function authRoutes(server: FastifyInstance) {
  server.post('/register', registerHandler);
  server.post('/login', loginHandler);
  server.post('/mfa/verify', mfaVerifyHandler);
}
