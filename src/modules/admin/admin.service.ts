import { prisma } from '../../infrastructure/database/prisma';

export async function getPlatformAnalytics() {
  // Execute aggregation queries concurrently for performance
  const [
    totalConsultations,
    activeDoctors,
    totalPatients,
    revenueAggregation
  ] = await Promise.all([
    prisma.consultation.count(),
    prisma.doctor.count({ where: { status: 'ACTIVE' } }),
    prisma.user.count({ where: { role: 'PATIENT' } }),
    prisma.payment.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true }
    })
  ]);

  return {
    totalConsultations,
    activeDoctors,
    totalPatients,
    totalRevenue: revenueAggregation._sum.amount?.toString() || '0'
  };
}
