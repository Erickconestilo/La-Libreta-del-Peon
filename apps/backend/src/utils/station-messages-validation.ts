import { z } from 'zod';

import { AppError } from '../lib/app-error.js';

const createStationMessageSchema = z.object({
  body: z.string().trim().min(1).max(1200)
});

export type ValidatedCreateStationMessageInput = z.infer<typeof createStationMessageSchema>;

export const validateCreateStationMessageInput = (input: unknown) => {
  const parsedInput = createStationMessageSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError('Invalid station message payload', 400, 'INVALID_STATION_MESSAGE_PAYLOAD', parsedInput.error.flatten());
  }

  return parsedInput.data;
};
