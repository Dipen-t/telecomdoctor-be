import { prisma } from '../../infrastructure/database/prisma';
import { CreatePrescriptionInput } from './prescriptions.schema';

export async function createPrescription(userId: string, consultationId: string, data: CreatePrescriptionInput) {
  // 1. Get the doctor profile for the user
  const doctor = await prisma.doctor.findUnique({
    where: { userId }
  });

  if (!doctor) {
    throw new Error('Only doctors can create prescriptions');
  }

  // 2. Fetch the consultation
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    include: { slot: true, prescription: true }
  });

  if (!consultation) {
    throw new Error('Consultation not found');
  }

  // 3. RBAC Check: Ensure the doctor owns this consultation
  if (consultation.slot.doctorId !== doctor.id) {
    throw new Error('Unauthorized to write prescription for this consultation');
  }

  // 4. State Check: Ensure no prescription already exists
  if (consultation.prescription) {
    throw new Error('Prescription already exists for this consultation');
  }

  // 5. Create Prescription and Items in a transaction
  const prescription = await prisma.prescription.create({
    data: {
      consultationId,
      doctorId: doctor.id,
      notes: data.notes,
      items: {
        create: data.items.map(item => ({
          medicine: item.medicine,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions
        }))
      }
    },
    include: {
      items: true
    }
  });

  return prescription;
}

export async function getPrescription(userId: string, consultationId: string) {
  const consultation = await prisma.consultation.findUnique({
    where: { id: consultationId },
    include: { 
      slot: { include: { doctor: true } },
      prescription: { include: { items: true } }
    }
  });

  if (!consultation) {
    throw new Error('Consultation not found');
  }

  if (!consultation.prescription) {
    throw new Error('Prescription not found');
  }

  // We need to resolve patientProfile to verify patient access
  const patientProfile = await prisma.profile.findUnique({
    where: { id: consultation.patientId }
  });

  const isPatient = patientProfile?.userId === userId;
  const isDoctor = consultation.slot.doctor.userId === userId;

  if (!isPatient && !isDoctor) {
    throw new Error('Unauthorized to view this prescription');
  }

  return consultation.prescription;
}
