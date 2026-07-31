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

export const createReadingAttachmentSchema = z.object({
  attachmentType: z.literal('photo').default('photo'),
  notes: z.string().trim().max(1000).nullable().optional(),
  storagePath: z.string().trim().min(1).max(500),
  title: z.string().trim().max(120).nullable().optional()
});

export type ValidatedCreateReadingAttachmentInput = z.infer<typeof createReadingAttachmentSchema>;

export const codeCatalogQuerySchema = z.object({
  itineraryNumber: z.coerce.number().int().positive().optional(),
  zoneColor: z.enum(['blue', 'pink', 'green']).optional()
});

export type ValidatedCodeCatalogQuery = z.infer<typeof codeCatalogQuerySchema>;

const environmentSchema = z.enum(['surface', 'tunnel', 'other']);
const sideSchema = z.enum(['left', 'right', 'axis', 'crown', 'invert', 'other']);
const roundStatusSchema = z.enum(['draft', 'active', 'closed', 'cancelled']);
const fieldConditionsSchema = z.enum(['good', 'regular', 'adverse']);

export const createMonitoringRoundSchema = z.object({
  fieldConditions: fieldConditionsSchema.nullable().optional(),
  instrumentSerial: z.string().trim().max(120).nullable().optional(),
  name: z.string().trim().min(1).max(200),
  operatorId: z.string().uuid().nullable().optional(),
  roundDate: z.string().date(),
  status: roundStatusSchema.default('draft')
});

export type ValidatedCreateMonitoringRoundInput = z.infer<typeof createMonitoringRoundSchema>;

export const listMonitoringRoundsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  status: roundStatusSchema.optional()
});

export type ValidatedListMonitoringRoundsQuery = z.infer<typeof listMonitoringRoundsQuerySchema>;

export const createControlPointSchema = z.object({
  code: z.string().trim().min(1).max(80),
  environment: environmentSchema,
  name: z.string().trim().max(200).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  pk: z.string().trim().max(40).nullable().optional(),
  seccion: z.string().trim().max(80).nullable().optional(),
  side: sideSchema.nullable().optional(),
  tramo: z.string().trim().max(80).nullable().optional(),
  zona: z.string().trim().max(80).nullable().optional()
});

export type ValidatedCreateControlPointInput = z.infer<typeof createControlPointSchema>;

export const updateControlPointSchema = z
  .object({
    environment: environmentSchema.optional(),
    isActive: z.boolean().optional(),
    name: z.string().trim().max(200).nullable().optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    pk: z.string().trim().max(40).nullable().optional(),
    seccion: z.string().trim().max(80).nullable().optional(),
    side: sideSchema.nullable().optional(),
    tramo: z.string().trim().max(80).nullable().optional(),
    zona: z.string().trim().max(80).nullable().optional()
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: 'At least one field is required'
  });

export type ValidatedUpdateControlPointInput = z.infer<typeof updateControlPointSchema>;

export const listControlPointsQuerySchema = z.object({
  isActive: z.coerce.boolean().optional()
});

export type ValidatedListControlPointsQuery = z.infer<typeof listControlPointsQuerySchema>;

export const createControlPointThresholdSchema = z
  .object({
    alarmValue: z.number().min(0).nullable().optional(),
    instrumentType: instrumentTypeSchema,
    unit: z.string().trim().min(1).max(40),
    validFrom: z.string().datetime({ offset: true }),
    validTo: z.string().datetime({ offset: true }).nullable().optional(),
    warningValue: z.number().min(0).nullable().optional()
  })
  .refine(
    (input) =>
      input.warningValue === undefined ||
      input.warningValue === null ||
      input.alarmValue === undefined ||
      input.alarmValue === null ||
      input.alarmValue >= input.warningValue,
    {
      message: 'alarmValue must be greater than or equal to warningValue',
      path: ['alarmValue']
    }
  )
  .refine((input) => !input.validTo || input.validTo > input.validFrom, {
    message: 'validTo must be after validFrom',
    path: ['validTo']
  });

export type ValidatedCreateControlPointThresholdInput = z.infer<typeof createControlPointThresholdSchema>;

export const readingHistoryQuerySchema = z.object({
  instrumentType: instrumentTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0)
});

export type ValidatedReadingHistoryQuery = z.infer<typeof readingHistoryQuerySchema>;

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

export const validateCreateReadingAttachmentInput = (input: unknown): ValidatedCreateReadingAttachmentInput => {
  const parsedInput = createReadingAttachmentSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError(
      'Invalid reading attachment payload',
      400,
      'INVALID_READING_ATTACHMENT_PAYLOAD',
      parsedInput.error.flatten()
    );
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

export const validateCreateMonitoringRoundInput = (input: unknown): ValidatedCreateMonitoringRoundInput => {
  const parsedInput = createMonitoringRoundSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError('Invalid monitoring round payload', 400, 'INVALID_ROUND_PAYLOAD', parsedInput.error.flatten());
  }

  return parsedInput.data;
};

export const validateListMonitoringRoundsQuery = (input: unknown): ValidatedListMonitoringRoundsQuery => {
  const parsedInput = listMonitoringRoundsQuerySchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError('Invalid rounds query', 400, 'INVALID_ROUNDS_QUERY', parsedInput.error.flatten());
  }

  return parsedInput.data;
};

export const validateCreateControlPointInput = (input: unknown): ValidatedCreateControlPointInput => {
  const parsedInput = createControlPointSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError(
      'Invalid control point payload',
      400,
      'INVALID_CONTROL_POINT_PAYLOAD',
      parsedInput.error.flatten()
    );
  }

  return parsedInput.data;
};

export const validateUpdateControlPointInput = (input: unknown): ValidatedUpdateControlPointInput => {
  const parsedInput = updateControlPointSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError(
      'Invalid control point update payload',
      400,
      'INVALID_CONTROL_POINT_UPDATE_PAYLOAD',
      parsedInput.error.flatten()
    );
  }

  return parsedInput.data;
};

export const validateListControlPointsQuery = (input: unknown): ValidatedListControlPointsQuery => {
  const parsedInput = listControlPointsQuerySchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError('Invalid control points query', 400, 'INVALID_CONTROL_POINTS_QUERY', parsedInput.error.flatten());
  }

  return parsedInput.data;
};

export const validateCreateControlPointThresholdInput = (
  input: unknown
): ValidatedCreateControlPointThresholdInput => {
  const parsedInput = createControlPointThresholdSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError('Invalid threshold payload', 400, 'INVALID_THRESHOLD_PAYLOAD', parsedInput.error.flatten());
  }

  return parsedInput.data;
};

export const validateReadingHistoryQuery = (input: unknown): ValidatedReadingHistoryQuery => {
  const parsedInput = readingHistoryQuerySchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError('Invalid reading history query', 400, 'INVALID_READING_HISTORY_QUERY', parsedInput.error.flatten());
  }

  return parsedInput.data;
};
