import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';

export function globalErrorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  // Zod Validation Errors
  if (error instanceof ZodError || error.name === 'ZodError') {
    return reply.code(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request payload validation failed',
        details: (error as any).errors || error.message
      }
    });
  }

  // Prisma Errors
  if (error.code && typeof error.code === 'string') {
    // Unique constraint failed
    if (error.code === 'P2002') {
      return reply.code(409).send({
        error: {
          code: 'CONFLICT',
          message: 'A record with this value already exists.'
        }
      });
    }
    // Record not found
    if (error.code === 'P2025') {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'The requested resource was not found.'
        }
      });
    }
  }

  // Custom App Errors thrown from Services
  if (error.message === 'Slot not found' || error.message === 'User not found') {
    return reply.code(404).send({
      error: { code: 'NOT_FOUND', message: error.message }
    });
  }

  if (error.message === 'Slot is no longer available' || error.message === 'MFA challenge not found or expired') {
    return reply.code(409).send({
      error: { code: 'CONFLICT', message: error.message }
    });
  }
  
  if (error.message === 'Invalid credentials' || error.message === 'Invalid MFA token') {
    return reply.code(401).send({
      error: { code: 'UNAUTHORIZED', message: error.message }
    });
  }

  // Fastify internal or generic errors
  request.log.error(error);
  
  // Don't leak stack traces in production
  const isProd = process.env.NODE_ENV === 'production';
  return reply.code(500).send({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      ...(isProd ? {} : { detail: error.message })
    }
  });
}
