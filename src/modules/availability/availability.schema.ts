import { z } from 'zod';

export const createSlotSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime()
}).refine(data => new Date(data.endTime) > new Date(data.startTime), {
  message: "End time must be after start time",
  path: ["endTime"]
});
