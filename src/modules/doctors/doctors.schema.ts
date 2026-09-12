import { z } from 'zod';

export const createDoctorSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  specialty: z.string(),
  qualification: z.string(),
  experience: z.number().int().min(0),
  consultationFee: z.number().positive()
});

export const searchDoctorsSchema = z.object({
  specialty: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  offset: z.coerce.number().int().min(0).default(0)
});
