import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma';
import { updateProfileSchema } from './users.schema';

export async function getMeHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = request.user!.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, doctor: true }
    });
    
    if (!user) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    // Omit sensitive data
    const { password, mfaSecret, ...safeUser } = user;
    return reply.send({ user: safeUser });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}

export async function updateMeHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = request.user!.userId;
    const data = updateProfileSchema.parse(request.body);

    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data
    });

    return reply.send({ profile: updatedProfile });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.errors } });
    }
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}
