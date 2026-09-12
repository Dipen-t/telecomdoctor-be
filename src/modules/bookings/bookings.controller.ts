import { FastifyRequest, FastifyReply } from 'fastify';
import { createBooking, generateLivekitToken } from './bookings.service';
import { prisma } from '../../infrastructure/database/prisma';
import { createBookingSchema, getBookingsSchema } from './bookings.schema';
import * as bookingsService from './bookings.service';

export async function createBookingHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = createBookingSchema.parse(request.body);
    const userId = request.user!.userId;
    const idempotencyKey = request.idempotencyKey!;
    const requestHash = request.requestHash || '';

    const result = await bookingsService.createBooking(userId, data.slotId, idempotencyKey, requestHash);
    return reply.code(201).send(result);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.errors } });
    }
    
    if (error.message === 'Slot not found') {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: error.message } });
    }
    
    if (error.message === 'Slot is no longer available') {
      return reply.code(409).send({ error: { code: 'CONFLICT', message: error.message } });
    }

    if (error.code === 'P2002' && error.meta?.target?.includes('key')) {
      // Rare race condition on idempotency key insert
      return reply.code(409).send({ error: { code: 'CONFLICT', message: 'Concurrent request detected' } });
    }

    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}

export async function getMyBookingsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = request.user!.userId;
    const query = getBookingsSchema.parse(request.query);

    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Profile not found' } });
    }

    const whereClause: any = { patientId: profile.id };
    if (query.status) {
      whereClause.status = query.status;
    }

    const consultations = await prisma.consultation.findMany({
      where: whereClause,
      include: {
        doctor: { include: { user: { include: { profile: true } } } },
        slot: true
      },
      skip: query.offset,
      take: query.limit,
      orderBy: { createdAt: 'desc' }
    });

    return reply.send({ consultations });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.errors } });
    }
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}

export async function getVideoToken(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const userId = request.user!.userId;
    const consultationId = request.params.id;
    const token = await generateLivekitToken(userId, consultationId);

    return reply.code(200).send({ token });
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: error.message } });
    }
    if (error.message.includes('Unauthorized')) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: error.message } });
    }
    throw error;
  }
}
