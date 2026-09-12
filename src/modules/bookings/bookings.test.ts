import { describe, it, expect } from 'vitest';
import { prisma } from '../../infrastructure/database/prisma';
import { createBooking } from './bookings.service';

describe('Bookings Service Transactions', () => {
  it('should correctly row-lock and reject double bookings for the same slot', async () => {
    // 1. Create a fake doctor and slot for testing
    const patient = await prisma.user.create({
      data: { email: `patient${Date.now()}@test.com`, password: 'hash', role: 'PATIENT' }
    });
    await prisma.profile.create({
      data: { userId: patient.id, firstName: 'Test', lastName: 'Patient' }
    });
    const doctorUser = await prisma.user.create({
      data: { email: `doc${Date.now()}@test.com`, password: 'hash', role: 'DOCTOR' }
    });
    const doctorProfile = await prisma.doctor.create({
      data: { userId: doctorUser.id, specialty: 'TEST', qualification: 'MBBS', experience: 5, consultationFee: 500 }
    });
    const slot = await prisma.availabilitySlot.create({
      data: { doctorId: doctorProfile.id, startTime: new Date(), endTime: new Date(Date.now() + 3600000), status: 'AVAILABLE' }
    });

    // 2. Attempt double booking concurrently
    const booking1 = createBooking(patient.id, slot.id, 'idem-123', 'hash-123');
    const booking2 = createBooking(patient.id, slot.id, 'idem-123', 'hash-123');

    const results = await Promise.allSettled([booking1, booking2]);
    
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');

    // EXACTLY 1 should succeed, and 1 should fail because of row-level lock & status check!
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    if (rejected[0].status === 'rejected') {
      expect(rejected[0].reason.message).toMatch(/Slot is no longer available/);
    }
  });
});
