import { describe, it, expect } from 'vitest';
import { prisma } from '../../infrastructure/database/prisma';
import { createPayment, processPaymentWebhook } from './payments.service';

describe('Payments Module', () => {
  it('should allow a patient to initiate a payment and pull the correct fee', async () => {
    // 1. Create Patient
    const patientUser = await prisma.user.create({
      data: { email: `pat_pay_${Date.now()}@test.com`, password: 'hash', role: 'PATIENT' }
    });
    const patientProfile = await prisma.profile.create({
      data: { userId: patientUser.id, firstName: 'Patient', lastName: 'Pay' }
    });

    // 2. Create Doctor
    const doctorUser = await prisma.user.create({
      data: { email: `doc_pay_${Date.now()}@test.com`, password: 'hash', role: 'DOCTOR' }
    });
    const doctorProfile = await prisma.doctor.create({
      data: { userId: doctorUser.id, specialty: 'TEST', qualification: 'MBBS', experience: 5, consultationFee: 1500 } // 1500 Fee
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

    // 4. Initiate Payment
    const paymentResult = await createPayment(patientUser.id, consultation.id);
    
    expect(paymentResult.paymentId).toBeDefined();
    expect(paymentResult.amount.toString()).toBe('1500'); // Pulled from doctorProfile!
    expect(paymentResult.status).toBe('PENDING');
    expect(paymentResult.checkoutUrl).toContain(paymentResult.providerReference);

    // 5. Try duplicate payment
    await expect(createPayment(patientUser.id, consultation.id))
      .rejects.toThrow('A payment record already exists for this consultation');

    // 6. Simulate Webhook
    const updatedPayment = await processPaymentWebhook(paymentResult.providerReference, 'SUCCESS');
    expect(updatedPayment.status).toBe('SUCCESS');

    // 7. Try re-processing webhook
    await expect(processPaymentWebhook(paymentResult.providerReference, 'FAILED'))
      .rejects.toThrow('Payment has already been processed');
  });

  it('should reject a random user trying to initiate payment', async () => {
    const randomUser = await prisma.user.create({
      data: { email: `hacker_pay_${Date.now()}@test.com`, password: 'hash', role: 'PATIENT' }
    });
    const consultation = await prisma.consultation.findFirst();

    if (consultation) {
      await expect(createPayment(randomUser.id, consultation.id))
        .rejects.toThrow('Unauthorized to pay for this consultation');
    }
  });
});
