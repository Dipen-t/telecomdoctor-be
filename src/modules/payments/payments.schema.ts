import { z } from 'zod';

export const paymentWebhookSchema = z.object({
  providerReference: z.string().min(1),
  status: z.enum(['SUCCESS', 'FAILED']),
});

export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;
