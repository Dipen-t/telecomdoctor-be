import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma';
import { createSlotSchema } from './availability.schema';

export async function createSlotHandler(request: FastifyRequest<{ Params: { doctorId: string } }>, reply: FastifyReply) {
  try {
    const { doctorId } = request.params;
    const data = createSlotSchema.parse(request.body);

    const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
    if (!doctor) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Doctor not found' } });
    }

    // Ensure the logged in user is this doctor (or admin)
    const user = request.user!;
    if (user.role !== 'ADMIN' && doctor.userId !== user.userId) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Cannot manage slots for another doctor' } });
    }

    const slot = await prisma.availabilitySlot.create({
      data: {
        doctorId,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        status: 'AVAILABLE'
      }
    });

    return reply.code(201).send({ slot });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.errors } });
    }
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}

export async function getSlotsHandler(request: FastifyRequest<{ Params: { doctorId: string } }>, reply: FastifyReply) {
  try {
    const { doctorId } = request.params;
    
    // Default fetch future available slots
    const slots = await prisma.availabilitySlot.findMany({
      where: {
        doctorId,
        status: 'AVAILABLE',
        startTime: { gte: new Date() }
      },
      orderBy: { startTime: 'asc' }
    });

    return reply.send({ slots });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}

export async function deleteSlotHandler(request: FastifyRequest<{ Params: { slotId: string } }>, reply: FastifyReply) {
  try {
    const { slotId } = request.params;
    const user = request.user!;

    const slot = await prisma.availabilitySlot.findUnique({
      where: { id: slotId },
      include: { doctor: true }
    });

    if (!slot) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Slot not found' } });
    }

    // Authorization
    if (user.role !== 'ADMIN' && slot.doctor.userId !== user.userId) {
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Cannot manage slots for another doctor' } });
    }

    // Business rule: Cannot delete booked slots directly
    if (slot.status === 'BOOKED' || slot.status === 'IN_PROGRESS') {
      return reply.code(400).send({ error: { code: 'SLOT_BOOKED', message: 'Cannot delete a booked slot' } });
    }

    await prisma.availabilitySlot.delete({ where: { id: slotId } });

    return reply.code(204).send();
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}
