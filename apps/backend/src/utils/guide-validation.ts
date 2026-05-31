import { z } from 'zod';

import { AppError } from '../lib/app-error.js';

export const createGuideEntrySchema = z.object({
  body: z.string().trim().min(1).max(8000),
  category: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200)
});

export const updateGuideEntrySchema = createGuideEntrySchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'At least one field is required'
);

export type CreateGuideEntryInput = z.infer<typeof createGuideEntrySchema>;
export type UpdateGuideEntryInput = z.infer<typeof updateGuideEntrySchema>;

export const validateCreateGuideEntryInput = (input: unknown) => {
  const parsedInput = createGuideEntrySchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError(
      'Invalid guide entry payload',
      400,
      'INVALID_GUIDE_ENTRY_PAYLOAD',
      parsedInput.error.flatten()
    );
  }

  return parsedInput.data;
};

export const validateUpdateGuideEntryInput = (input: unknown) => {
  const parsedInput = updateGuideEntrySchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError(
      'Invalid guide entry update payload',
      400,
      'INVALID_GUIDE_ENTRY_UPDATE_PAYLOAD',
      parsedInput.error.flatten()
    );
  }

  return parsedInput.data;
};
