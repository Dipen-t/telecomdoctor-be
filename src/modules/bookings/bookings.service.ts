import { prisma } from '../../infrastructure/database/prisma';

export async function createBooking(userId: string, slotId: string, idempotencyKey: string, requestHash: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Row-Level Lock the slot to prevent concurrent bookings
    const slots = await tx.$queryRaw<any[]>`
      SELECT id, "doctorId", status 
      FROM "AvailabilitySlot" 
      WHERE id = ${slotId}
      FOR UPDATE
    `;

    if (slots.length === 0) {
      throw new Error('Slot not found');
    }

    const slot = slots[0];

    // 2. Verify slot is still available
    if (slot.status !== 'AVAILABLE') {
      throw new Error('Slot is no longer available');
    }

    // 3. Mark the slot as BOOKED
    await tx.availabilitySlot.update({
      where: { id: slotId },
      data: { status: 'BOOKED' }
    });

    // 4. Find the patient profile
    const patientProfile = await tx.profile.findUnique({
      where: { userId }
    });
    
    if (!patientProfile) {
      throw new Error('Patient profile missing');
    }

    // 5. Create the Consultation
    const consultation = await tx.consultation.create({
      data: {
        patientId: patientProfile.id,
        slotId: slot.id,
        status: 'SCHEDULED'
      }
    });

    // 6. Insert Outbox Event for Background Jobs (e.g. Email/Notification)
    await tx.outboxEvent.create({
      data: {
        type: 'BOOKING_CREATED',
        payload: {
          consultationId: consultation.id,
          patientId: patientProfile.id,
          doctorId: slot.doctorId
        },
        status: 'PENDING'
      }
    });

    const responseBody = {
      message: 'Booking created successfully',
      consultationId: consultation.id
    };

    // 7. Save Idempotency Key record
    await tx.idempotencyKey.create({
      data: {
        key: idempotencyKey,
        userId: userId,
        requestHash: requestHash, 
        responseStatus: 201,
        responseBody: responseBody as any,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      }
    });

    return responseBody;
  });
}

export async function generateLivekitToken(userId: string, consultationId: string) {
  // 1. Fetch consultation and verify user is part of it
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    include: {
      slot: {
        include: { doctor: true }
      }
    }
  });

  if (!consultation) {
    throw new Error('Consultation not found');
  }

  const patientProfile = await prisma.profile.findUnique({
    where: { id: consultation.patientId }
  });

  if (!patientProfile) {
    throw new Error('Patient profile not found');
  }

  // 2. Identify role
  const isPatient = patientProfile.userId === userId;
  const isDoctor = consultation.slot.doctor.userId === userId;

  if (!isPatient && !isDoctor) {
    throw new Error('Unauthorized to join this consultation');
  }

  const participantName = isPatient ? `Patient` : `Doctor`;
  const identity = isPatient ? `patient_${patientProfile.id}` : `doctor_${consultation.slot.doctor.id}`;

  const { AccessToken } = require('livekit-server-sdk');

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity,
      name: participantName,
    }
  );

  at.addGrant({
    roomJoin: true,
    room: consultationId,
  });

  return await at.toJwt();
}
