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
      id: '11111111-1111-1111-1111-111111111111',
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
      id: '22222222-2222-2222-2222-222222222222',
      email: 'doctor.a@example.com',
      password: passwordHash,
      role: 'DOCTOR',
      profile: {
        create: { firstName: 'Alice', lastName: 'Smith' },
      },
      doctor: {
        create: {
          id: 'd2222222-2222-2222-2222-222222222222',
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
      id: '33333333-3333-3333-3333-333333333333',
      email: 'doctor.b@example.com',
      password: passwordHash,
      role: 'DOCTOR',
      profile: {
        create: { firstName: 'Bob', lastName: 'Jones' },
      },
      doctor: {
        create: {
          id: 'd3333333-3333-3333-3333-333333333333',
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
      id: '44444444-4444-4444-4444-444444444444',
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
      id: '55555555-5555-5555-5555-555555555555',
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

  console.log('Creating Completed Consultation Slot for Doctor A...');
  const completedSlot = await prisma.availabilitySlot.create({
    data: {
      id: '66666666-6666-6666-6666-666666666666',
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
      id: 'c1111111-1111-1111-1111-111111111111',
      slotId: completedSlot.id,
      patientId: patientA.id,
      status: 'COMPLETED', // Set to completed so we can add a prescription
    },
  });

  // 9. Create a Prescription for that Consultation
  console.log('Creating Prescription...');
  await prisma.prescription.create({
    data: {
      id: 'p1111111-1111-1111-1111-111111111111',
      consultationId: consultation.id,
      doctorId: doctorA.doctor!.id,
      notes: 'Patient should rest for 3 days.',
      items: {
        create: [
          {
            id: 'i1111111-1111-1111-1111-111111111111',
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

  // 10. Create an AVAILABLE slot for the live booking demo
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 0, 0, 0);
  const nextWeekEnd = new Date(nextWeek);
  nextWeekEnd.setHours(15, 0, 0, 0);

  console.log('Creating Available Slot for Doctor A (For Booking Demo)...');
  await prisma.availabilitySlot.create({
    data: {
      id: '77777777-7777-7777-7777-777777777777',
      doctorId: doctorA.doctor!.id,
      startTime: nextWeek,
      endTime: nextWeekEnd,
      status: 'AVAILABLE',
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
