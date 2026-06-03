import { z } from 'zod';

import { AppError } from '../lib/app-error.js';

export const createProjectSchema = z.object({
  code: z.string().trim().min(1).max(80).nullable().optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  isActive: z.boolean().default(true),
  name: z.string().trim().min(1).max(160)
});

export type ValidatedCreateProjectInput = z.infer<typeof createProjectSchema>;

export const validateCreateProjectInput = (input: unknown): ValidatedCreateProjectInput => {
  const parsedInput = createProjectSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError('Invalid project payload', 400, 'INVALID_PROJECT_PAYLOAD', parsedInput.error.flatten());
  }

  return parsedInput.data;
};
