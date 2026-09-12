import { FastifyRequest, FastifyReply } from 'fastify';
import { createPrescriptionSchema } from './prescriptions.schema';
import * as prescriptionsService from './prescriptions.service';

export async function createPrescriptionHandler(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const data = createPrescriptionSchema.parse(request.body);
    const userId = request.user!.userId;
    const consultationId = request.params.id;

    const prescription = await prescriptionsService.createPrescription(userId, consultationId, data);
    return reply.code(201).send(prescription);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.errors } });
    }
    if (error.message.includes('not found')) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: error.message } });
    }
    if (error.message.includes('Unauthorized') || error.message.includes('Only doctors')) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: error.message } });
    }
    if (error.message.includes('already exists')) {
      return reply.code(409).send({ error: { code: 'CONFLICT', message: error.message } });
    }
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}

export async function getPrescriptionHandler(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const userId = request.user!.userId;
    const consultationId = request.params.id;

    const prescription = await prescriptionsService.getPrescription(userId, consultationId);
    return reply.code(200).send(prescription);
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: error.message } });
    }
    if (error.message.includes('Unauthorized')) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: error.message } });
    }
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}
