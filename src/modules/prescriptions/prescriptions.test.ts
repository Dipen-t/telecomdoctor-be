import { describe, it, expect } from 'vitest';
import { prisma } from '../../infrastructure/database/prisma';
import { createPrescription, getPrescription } from './prescriptions.service';

describe('Prescriptions Module', () => {
  it('should allow a doctor to create a prescription and patient to view it', async () => {
    // 1. Create Patient
    const patientUser = await prisma.user.create({
      data: { email: `pat_rx_${Date.now()}@test.com`, password: 'hash', role: 'PATIENT' }
    });
    const patientProfile = await prisma.profile.create({
      data: { userId: patientUser.id, firstName: 'Patient', lastName: 'Rx' }
    });

    // 2. Create Doctor
    const doctorUser = await prisma.user.create({
      data: { email: `doc_rx_${Date.now()}@test.com`, password: 'hash', role: 'DOCTOR' }
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
        status: 'COMPLETED'
      }
    });

    // 4. Create Prescription as Doctor
    const prescription = await createPrescription(doctorUser.id, consultation.id, {
      notes: 'Take rest',
      items: [
        {
          medicine: 'Paracetamol',
          dosage: '500mg',
          frequency: '1-0-1',
          duration: '3 days'
        }
      ]
    });

    expect(prescription.id).toBeDefined();
    expect(prescription.items.length).toBe(1);

    // 5. Patient views prescription
    const viewed = await getPrescription(patientUser.id, consultation.id);
    expect(viewed.notes).toBe('Take rest');
    expect(viewed.items[0].medicine).toBe('Paracetamol');
  });

  it('should reject a patient trying to create a prescription', async () => {
    const patientUser = await prisma.user.findFirst({ where: { role: 'PATIENT' } });
    const consultation = await prisma.consultation.findFirst();

    if (patientUser && consultation) {
      await expect(createPrescription(patientUser.id, consultation.id, {
        items: [{ medicine: 'Test', dosage: '1', frequency: '1', duration: '1' }]
      })).rejects.toThrow('Only doctors can create prescriptions');
    }
  });

  it('should reject a doctor trying to create prescription for another doctors consultation', async () => {
    // 1. Create a DIFFERENT Doctor
    const otherDoctorUser = await prisma.user.create({
      data: { email: `other_doc_rx_${Date.now()}@test.com`, password: 'hash', role: 'DOCTOR' }
    });
    const otherDoctorProfile = await prisma.doctor.create({
      data: { userId: otherDoctorUser.id, specialty: 'TEST', qualification: 'MBBS', experience: 5, consultationFee: 500 }
    });

    const consultation = await prisma.consultation.findFirst();

    if (consultation) {
      await expect(createPrescription(otherDoctorUser.id, consultation.id, {
        items: [{ medicine: 'Test', dosage: '1', frequency: '1', duration: '1' }]
      })).rejects.toThrow('Unauthorized to write prescription for this consultation');
    }
  });
});
