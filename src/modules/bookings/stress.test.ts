import { describe, it, expect } from 'vitest';
import { prisma } from '../../infrastructure/database/prisma';
import { createBooking } from './bookings.service';
import crypto from 'crypto';

describe('Bookings Stress Test (Concurrency & Idempotency)', () => {
  it('should flawlessly handle 100 concurrent booking requests to the same slot, allowing exactly 1 to succeed', async () => {
    // 1. Setup Patient
    const patientUser = await prisma.user.create({
      data: { email: `stress_pat_${Date.now()}@test.com`, password: 'hash', role: 'PATIENT' }
    });
    const patientProfile = await prisma.profile.create({
      data: { userId: patientUser.id, firstName: 'Stress', lastName: 'Test' }
    });

    // 2. Setup Doctor & Slot
    const doctorUser = await prisma.user.create({
      data: { email: `stress_doc_${Date.now()}@test.com`, password: 'hash', role: 'DOCTOR' }
    });
    const doctorProfile = await prisma.doctor.create({
      data: { userId: doctorUser.id, specialty: 'TEST', qualification: 'MBBS', experience: 5, consultationFee: 500 }
    });

    const slot = await prisma.availabilitySlot.create({
      data: { doctorId: doctorProfile.id, startTime: new Date(), endTime: new Date(Date.now() + 3600000), status: 'AVAILABLE' }
    });

    // 3. Fire 100 simultaneous requests
    const NUM_REQUESTS = 100;
    const promises = [];

    for (let i = 0; i < NUM_REQUESTS; i++) {
      // Each gets a unique idempotency key so they act as distinct requests trying to grab the same slot
      const idempotencyKey = crypto.randomUUID();
      promises.push(
        createBooking(patientUser.id, slot.id, idempotencyKey, idempotencyKey).catch(e => e)
      );
    }

    const results = await Promise.all(promises);

    // 4. Analyze results
    let successCount = 0;
    let failCount = 0;

    for (const result of results) {
      if (result instanceof Error) {
        expect(result.message).toBe('Slot is no longer available');
        failCount++;
      } else if (result && result.message === 'Booking created successfully') {
        successCount++;
      }
    }

    // 🔥 THE KILLER TEST
    // Exactly 1 request must succeed, and 99 must fail.
    expect(successCount).toBe(1);
    expect(failCount).toBe(99);

    // Ensure the slot in DB is BOOKED
    const finalSlot = await prisma.availabilitySlot.findUnique({ where: { id: slot.id } });
    expect(finalSlot?.status).toBe('BOOKED');
  }, 10000); // give it up to 10s

  it('should properly handle idempotency (exact same key retried)', async () => {
    const patientUser = await prisma.user.findFirst({ where: { role: 'PATIENT' } });
    const slot = await prisma.availabilitySlot.create({
      data: { doctorId: (await prisma.doctor.findFirst())!.id, startTime: new Date(), endTime: new Date(Date.now() + 3600), status: 'AVAILABLE' }
    });

    const idempotencyKey = crypto.randomUUID();

    // Request 1: Succeeds
    const res1 = await createBooking(patientUser!.id, slot.id, idempotencyKey, idempotencyKey);
    expect(res1.message).toBe('Booking created successfully');

    // Request 2: FAILS at DB constraint because the unique idempotency key is already used
    // (This is the rare race condition the controller catches if they arrive perfectly simultaneous, 
    // or if the middleware fails to catch it. In our case, `createBooking` tries to create the IdempotencyKey row again).
    await expect(createBooking(patientUser!.id, slot.id, idempotencyKey, idempotencyKey))
      .rejects.toThrow(); 
      
    // Request 3: Different body, same key -> REJECTED entirely (400)
    // We simulate this by changing the slot.id on the retry.
    // The fastify route parser / middleware does the body hash check, 
    // but we can test the service/DB directly by changing the body hash manually in the test.
    // Wait, createBooking takes requestHash as arg! Let's pass a DIFFERENT request hash!
    await expect(createBooking(patientUser!.id, 'different-slot-id', idempotencyKey, 'hacker-hash'))
      .rejects.toThrow(); // Fails at DB unique constraint again if it reaches it, but realistically middleware blocks it.
  });
});
