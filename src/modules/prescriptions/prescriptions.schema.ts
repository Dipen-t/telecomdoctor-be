import { z } from 'zod';

export const createPrescriptionSchema = z.object({
  notes: z.string().optional(),
  items: z.array(
    z.object({
      medicine: z.string().min(1, 'Medicine name is required'),
      dosage: z.string().min(1, 'Dosage is required (e.g. 500mg)'),
      frequency: z.string().min(1, 'Frequency is required (e.g. 1-0-1)'),
      duration: z.string().min(1, 'Duration is required (e.g. 5 days)'),
      instructions: z.string().optional()
    })
  ).min(1, 'At least one prescription item is required')
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
