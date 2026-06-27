import { z } from 'zod';

import { AppError } from '../lib/app-error.js';

const instrumentTypeSchema = z.enum([
  'total_station',
  'digital_level',
  'piezometer',
  'distometer',
  'linometer',
  'inclinometer',
  'cant_rule'
]);

export const createRoundPointSchema = z.object({
  controlPointId: z.string().uuid(),
  expectedInstrumentType: instrumentTypeSchema,
  notes: z.string().trim().max(2000).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  status: z.literal('pending').default('pending')
});

export type ValidatedCreateRoundPointInput = z.infer<typeof createRoundPointSchema>;

export const createInstrumentReadingSchema = z
  .object({
    clientRequestId: z.string().uuid(),
    measuredAt: z.string().datetime({ offset: true }),
    notes: z.string().trim().max(2000).nullable().optional(),
    rawPayload: z.record(z.string(), z.unknown()).nullable().optional(),
    unit: z.string().trim().max(40).nullable().optional(),
    valueNumeric: z.number().nullable().optional(),
    valueText: z.string().trim().max(500).nullable().optional()
  })
  .refine(
    (input) => (input.valueNumeric !== undefined && input.valueNumeric !== null) || Boolean(input.valueText?.trim()),
    {
      message: 'Reading requires valueNumeric or valueText',
      path: ['valueNumeric']
    }
  );

export type ValidatedCreateInstrumentReadingInput = z.infer<typeof createInstrumentReadingSchema>;

export const codeCatalogQuerySchema = z.object({
  itineraryNumber: z.coerce.number().int().positive().optional(),
  zoneColor: z.enum(['blue', 'pink', 'green']).optional()
});

export type ValidatedCodeCatalogQuery = z.infer<typeof codeCatalogQuerySchema>;

export const validateCreateRoundPointInput = (input: unknown): ValidatedCreateRoundPointInput => {
  const parsedInput = createRoundPointSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError('Invalid round point payload', 400, 'INVALID_ROUND_POINT_PAYLOAD', parsedInput.error.flatten());
  }

  return parsedInput.data;
};

export const validateCreateInstrumentReadingInput = (input: unknown): ValidatedCreateInstrumentReadingInput => {
  const parsedInput = createInstrumentReadingSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError('Invalid instrument reading payload', 400, 'INVALID_READING_PAYLOAD', parsedInput.error.flatten());
  }

  return parsedInput.data;
};

export const validateCodeCatalogQuery = (input: unknown): ValidatedCodeCatalogQuery => {
  const parsedInput = codeCatalogQuerySchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError('Invalid code catalog query', 400, 'INVALID_CODE_CATALOG_QUERY', parsedInput.error.flatten());
  }

  return parsedInput.data;
};
