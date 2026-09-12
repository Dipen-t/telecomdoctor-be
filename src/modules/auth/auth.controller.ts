import { FastifyRequest, FastifyReply } from 'fastify';
import { registerSchema, loginSchema, mfaVerifySchema } from './auth.schema';
import * as authService from './auth.service';

export async function registerHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = registerSchema.parse(request.body);
    const result = await authService.register(data);
    return reply.code(201).send(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.errors } });
    }
    if (error.message === 'User already exists') {
      return reply.code(409).send({ error: { code: 'USER_EXISTS', message: error.message } });
    }
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = loginSchema.parse(request.body);
    const result = await authService.login(data.email, data.password);
    return reply.send(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.errors } });
    }
    if (error.message === 'Invalid credentials') {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: error.message } });
    }
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}

export async function mfaVerifyHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = mfaVerifySchema.parse(request.body);
    const result = await authService.verifyMfaLogin(data.challengeToken, data.mfaToken);
    return reply.send(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.errors } });
    }
    if (error.message === 'Invalid or expired challenge token' || error.message === 'Invalid MFA code') {
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: error.message } });
    }
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}
