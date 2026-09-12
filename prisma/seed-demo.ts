import { prisma } from '../src/infrastructure/database/prisma';
import * as argon2 from 'argon2';

async function hashPassword(password: string) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,
    parallelism: 1
  });
}

async function main() {
  console.log('🌱 Starting demo database seed...');

  // 1. Clean existing demo data (if any)
  console.log('Cleaning existing demo data...');
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'admin@example.com',
          'doctor.a@example.com',
          'doctor.b@example.com',
          'patient.a@example.com',
          'patient.b@example.com',
        ],
      },
    },
  });

  const passwordHash = await hashPassword('password123');

  // 2. Create Admin
  console.log('Creating Admin...');
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: passwordHash,
      role: 'ADMIN',
      profile: {
        create: { firstName: 'System', lastName: 'Admin' },
      },
    },
  });

  // 3. Create Doctor A
  console.log('Creating Doctor A...');
  const doctorA = await prisma.user.create({
    data: {
      email: 'doctor.a@example.com',
      password: passwordHash,
      role: 'DOCTOR',
      profile: {
        create: { firstName: 'Alice', lastName: 'Smith' },
      },
      doctor: {
        create: {
          specialty: 'Cardiology',
          qualification: 'MD',
          experience: 10,
          consultationFee: 500,
        },
      },
    },
    include: { doctor: true },
  });

  // 4. Create Doctor B (for IDOR tests)
  console.log('Creating Doctor B...');
  await prisma.user.create({
    data: {
      email: 'doctor.b@example.com',
      password: passwordHash,
      role: 'DOCTOR',
      profile: {
        create: { firstName: 'Bob', lastName: 'Jones' },
      },
      doctor: {
        create: {
          specialty: 'Dermatology',
          qualification: 'MBBS',
          experience: 5,
          consultationFee: 300,
        },
      },
    },
  });

  // 5. Create Patient A
  console.log('Creating Patient A...');
  const patientA = await prisma.user.create({
    data: {
      email: 'patient.a@example.com',
      password: passwordHash,
      role: 'PATIENT',
      profile: {
        create: { firstName: 'Charlie', lastName: 'Brown' },
      },
    },
  });

  // 6. Create Patient B (for IDOR tests)
  console.log('Creating Patient B...');
  await prisma.user.create({
    data: {
      email: 'patient.b@example.com',
      password: passwordHash,
      role: 'PATIENT',
      profile: {
        create: { firstName: 'David', lastName: 'White' },
      },
    },
  });

  // 7. Create Availability Slot for Doctor A (Tomorrow 10 AM)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(11, 0, 0, 0);

  console.log('Creating Availability Slot for Doctor A...');
  const slot = await prisma.availabilitySlot.create({
    data: {
      doctorId: doctorA.doctor!.id,
      startTime: tomorrow,
      endTime: tomorrowEnd,
      status: 'BOOKED',
    },
  });

  // 8. Create a Consultation for Patient A with Doctor A
  console.log('Creating Consultation...');
  const consultation = await prisma.consultation.create({
    data: {
      slotId: slot.id,
      patientId: patientA.id,
      status: 'COMPLETED', // Set to completed so we can add a prescription
    },
  });

  // 9. Create a Prescription for that Consultation
  console.log('Creating Prescription...');
  await prisma.prescription.create({
    data: {
      consultationId: consultation.id,
      doctorId: doctorA.doctor!.id,
      notes: 'Patient should rest for 3 days.',
      items: {
        create: [
          {
            medicine: 'Paracetamol',
            dosage: '500mg',
            frequency: '1-1-1',
            duration: '3 days',
            instructions: 'Take after meals',
          },
        ],
      },
    },
  });

  console.log('✅ Demo database seed complete!');
  console.log('---');
  console.log('Accounts (all passwords are "password123"):');
  console.log('- admin@example.com');
  console.log('- doctor.a@example.com');
  console.log('- doctor.b@example.com');
  console.log('- patient.a@example.com');
  console.log('- patient.b@example.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
