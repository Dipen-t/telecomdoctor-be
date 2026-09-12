import { prisma } from '../../infrastructure/database/prisma';

export async function createPayment(userId: string, consultationId: string) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch consultation, verify ownership, and lock to prevent concurrent payment creations
    const consultations = await tx.$queryRaw<any[]>`
      SELECT "id", "patientId", "slotId"
      FROM "Consultation"
      WHERE "id" = ${consultationId}
      FOR UPDATE
    `;

    if (consultations.length === 0) {
      throw new Error('Consultation not found');
    }
    const consultation = consultations[0];

    // Verify patient
    const profile = await tx.profile.findUnique({
      where: { id: consultation.patientId }
    });

    if (!profile || profile.userId !== userId) {
      throw new Error('Unauthorized to pay for this consultation');
    }

    // 2. Prevent duplicate payments
    const existingPayment = await tx.payment.findUnique({
      where: { consultationId }
    });

    if (existingPayment) {
      throw new Error('A payment record already exists for this consultation');
    }

    // 3. Fetch Doctor to get the fee
    const slot = await tx.availabilitySlot.findUnique({
      where: { id: consultation.slotId },
      include: { doctor: true }
    });

    if (!slot) {
      throw new Error('Slot not found');
    }

    // 4. Create PENDING Payment
    const providerReference = `pi_mock_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const payment = await tx.payment.create({
      data: {
        consultationId,
        amount: slot.doctor.consultationFee,
        currency: 'INR',
        status: 'PENDING',
        providerReference
      }
    });

    return {
      paymentId: payment.id,
      amount: payment.amount,
      providerReference,
      status: payment.status,
      checkoutUrl: `https://mock-gateway.com/pay/${providerReference}` // Mock URL for the frontend to redirect to
    };
  });
}

export async function processPaymentWebhook(providerReference: string, status: 'SUCCESS' | 'FAILED') {
  const payment = await prisma.payment.findFirst({
    where: { providerReference }
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  // Only allow updating if it's currently PENDING to avoid replay attacks
  if (payment.status !== 'PENDING') {
    throw new Error('Payment has already been processed');
  }

  return await prisma.payment.update({
    where: { id: payment.id },
    data: { status }
  });
}
