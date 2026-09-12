import { z } from 'zod';

export const createBookingSchema = z.object({
  slotId: z.string().uuid()
});

export const getBookingsSchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'CANCELLED']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0)
});
