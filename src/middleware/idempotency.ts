import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../infrastructure/database/prisma';
import crypto from 'crypto';

declare module 'fastify' {
  interface FastifyRequest {
    idempotencyKey?: string;
    requestHash?: string;
  }
}

/**
 * Intercepts requests that have an Idempotency-Key header.
 * If the key has been processed before, returns the cached response.
 * Otherwise, allows the request to proceed.
 */
export async function idempotencyInterceptor(request: FastifyRequest, reply: FastifyReply) {
  const key = request.headers['idempotency-key'] as string;

  if (!key) {
    // We are strict: For endpoints where this is applied, we require the key
    return reply.code(400).send({
      error: {
        code: 'MISSING_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key header is required for this operation.'
      }
    });
  }

  // Attach key to request for the controller to use
  request.idempotencyKey = key;

  // Check if we already processed this key
  const existingRecord = await prisma.idempotencyKey.findUnique({
    where: { key }
  });

  // Calculate body hash to prevent mutation attacks
  const bodyString = request.body ? JSON.stringify(request.body) : '';
  const requestHash = crypto.createHash('sha256').update(bodyString).digest('hex');
  request.requestHash = requestHash;

  if (existingRecord) {
    if (existingRecord.requestHash !== requestHash) {
      return reply.code(400).send({
        error: {
          code: 'IDEMPOTENCY_MISMATCH',
          message: 'Idempotency-Key is reused with a different request payload'
        }
      });
    }

    // Return cached response
    return reply
      .code(existingRecord.responseStatus)
      .send(existingRecord.responseBody);
  }

  // If not found, let the controller handle it.
  // The controller MUST save the idempotency record at the end of its transaction.
}
