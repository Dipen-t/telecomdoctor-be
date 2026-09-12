import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../infrastructure/database/prisma';
import { createDoctorSchema, searchDoctorsSchema } from './doctors.schema';
import { hashPassword } from '../../security/password';

export async function createDoctorHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const data = createDoctorSchema.parse(request.body);

    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) {
      return reply.code(409).send({ error: { code: 'USER_EXISTS', message: 'User already exists' } });
    }

    const hashedPassword = await hashPassword(data.password);

    const doctorUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email: data.email, password: hashedPassword, role: 'DOCTOR' }
      });

      await tx.profile.create({
        data: { userId: user.id, firstName: data.firstName, lastName: data.lastName, phone: data.phone }
      });

      await tx.doctor.create({
        data: {
          userId: user.id,
          specialty: data.specialty,
          qualification: data.qualification,
          experience: data.experience,
          consultationFee: data.consultationFee
        }
      });

      return user;
    });

    return reply.code(201).send({ success: true, userId: doctorUser.id });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.errors } });
    }
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}

export async function searchDoctorsHandler(request: FastifyRequest, reply: FastifyReply) {
  try {
    const query = searchDoctorsSchema.parse(request.query);
    
    const whereClause = query.specialty ? { specialty: { contains: query.specialty, mode: 'insensitive' as const } } : {};

    const doctors = await prisma.doctor.findMany({
      where: whereClause,
      include: {
        user: { include: { profile: true } }
      },
      skip: query.offset,
      take: query.limit
    });

    const result = doctors.map(d => ({
      id: d.id,
      specialty: d.specialty,
      consultationFee: d.consultationFee,
      experience: d.experience,
      qualification: d.qualification,
      firstName: d.user.profile?.firstName,
      lastName: d.user.profile?.lastName
    }));

    return reply.send({ doctors: result });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: error.errors } });
    }
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}

export async function getDoctorByIdHandler(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  try {
    const { id } = request.params;
    const doctor = await prisma.doctor.findUnique({
      where: { id },
      include: { user: { include: { profile: true } } }
    });

    if (!doctor) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Doctor not found' } });
    }

    return reply.send({
      doctor: {
        id: doctor.id,
        specialty: doctor.specialty,
        consultationFee: doctor.consultationFee,
        experience: doctor.experience,
        qualification: doctor.qualification,
        firstName: doctor.user.profile?.firstName,
        lastName: doctor.user.profile?.lastName
      }
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  }
}
