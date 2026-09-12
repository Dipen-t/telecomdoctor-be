import { FastifyRequest, FastifyReply } from 'fastify';
import { paymentWebhookSchema } from './payments.schema';
import * as paymentsService from './payments.service';

export async function createPaymentHandler(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const userId = request.user!.userId;
    const consultationId = request.params.id;

    const result = await paymentsService.createPayment(userId, consultationId);
    return reply.code(201).send(result);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: error.message } });
    }
    if (error.message.includes('Unauthorized')) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: error.message } });
    }
    if (error.message.includes('already exists')) {
      return reply.code(409).send({ error: { code: 'CONFLICT', message: error.message } });
    }
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}

export async function processWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    // 1. Verify mock cryptographic signature
    const signature = request.headers['x-mock-signature'];
    if (signature !== 'valid-mock-signature') {
      return reply.code(401).send({ error: 'Invalid webhook signature' });
    }

    // 2. Validate payload
    const data = paymentWebhookSchema.parse(request.body);

    // 3. Process
    await paymentsService.processPaymentWebhook(data.providerReference, data.status);
    
    return reply.code(200).send({ message: 'Webhook processed successfully' });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.errors } });
    }
    if (error.message.includes('not found')) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: error.message } });
    }
    if (error.message.includes('already been processed')) {
      return reply.code(409).send({ error: { code: 'CONFLICT', message: error.message } });
    }
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}
