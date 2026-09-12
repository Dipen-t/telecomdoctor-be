import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../../infrastructure/database/prisma';
import { generateLivekitToken } from './bookings.service';
import { AccessToken, TokenVerifier } from 'livekit-server-sdk';

describe('LiveKit Token Generation & RBAC', () => {
  it('should allow the assigned patient to generate a token', async () => {
    // 1. Create Patient
    const patientUser = await prisma.user.create({
      data: { email: `pat_lk_${Date.now()}@test.com`, password: 'hash', role: 'PATIENT' }
    });
    const patientProfile = await prisma.profile.create({
      data: { userId: patientUser.id, firstName: 'Patient', lastName: 'LK' }
    });

    // 2. Create Doctor
    const doctorUser = await prisma.user.create({
      data: { email: `doc_lk_${Date.now()}@test.com`, password: 'hash', role: 'DOCTOR' }
    });
    const doctorProfile = await prisma.doctor.create({
      data: { userId: doctorUser.id, specialty: 'TEST', qualification: 'MBBS', experience: 5, consultationFee: 500 }
    });

    // 3. Create Slot & Consultation
    const slot = await prisma.availabilitySlot.create({
      data: { doctorId: doctorProfile.id, startTime: new Date(), endTime: new Date(Date.now() + 3600000), status: 'BOOKED' }
    });

    const consultation = await prisma.consultation.create({
      data: {
        patientId: patientProfile.id,
        slotId: slot.id,
        status: 'SCHEDULED'
      }
    });

    // 4. Generate Token as Patient
    const token = await generateLivekitToken(patientUser.id, consultation.id);
    expect(token).toBeDefined();
    
    // 5. Verify Token content using SDK (Since we know the mock secret is "secret")
    const verifier = new TokenVerifier('devkey', 'secret');
    const decoded = await verifier.verify(token) as any;
    console.log(decoded);
    
    expect(decoded.video?.room).toBe(consultation.id);
    expect(decoded.video?.roomJoin).toBe(true);
    expect(decoded.sub).toBe(`patient_${patientProfile.id}`);
  });

  it('should reject a random user trying to join the room', async () => {
    // 1. Create a random user
    const randomUser = await prisma.user.create({
      data: { email: `hacker_${Date.now()}@test.com`, password: 'hash', role: 'PATIENT' }
    });
    const randomProfile = await prisma.profile.create({
      data: { userId: randomUser.id, firstName: 'Hacker', lastName: 'LK' }
    });

    // 2. Fetch the existing consultation
    const consultation = await prisma.consultation.findFirst();
    
    if (consultation) {
      await expect(generateLivekitToken(randomUser.id, consultation.id))
        .rejects
        .toThrow('Unauthorized to join this consultation');
    }
  });
});
