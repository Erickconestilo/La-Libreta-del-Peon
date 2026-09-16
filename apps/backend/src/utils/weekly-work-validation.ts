import { z } from 'zod';

import { AppError } from '../lib/app-error.js';

const weeklyWorkCategorySchema = z.enum(['leveling', 'manual', 'other']);
const weeklyWorkStatusSchema = z.enum(['planned', 'in_progress', 'done', 'blocked']);
const isoDateSchema = z.string().date();

const isMonday = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === 1;
};

export const weeklyWorkQuerySchema = z.object({
  weekStart: isoDateSchema.refine(isMonday, 'weekStart must be a Monday')
});

export const createWeeklyWorkItemSchema = z.object({
  category: weeklyWorkCategorySchema,
  clientRequestId: z.string().uuid(),
  notes: z.string().trim().max(2000).nullable().optional(),
  status: weeklyWorkStatusSchema.default('planned'),
  title: z.string().trim().min(1).max(200),
  workDate: isoDateSchema
});

export const updateWeeklyWorkItemSchema = z
  .object({
    category: weeklyWorkCategorySchema.optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
    status: weeklyWorkStatusSchema.optional(),
    title: z.string().trim().min(1).max(200).optional(),
    version: z.number().int().positive(),
    workDate: isoDateSchema.optional()
  })
  .refine(
    (input) => Object.keys(input).some((key) => key !== 'version'),
    'At least one editable field is required'
  );

export const deleteWeeklyWorkItemQuerySchema = z.object({
  version: z.coerce.number().int().positive()
});

export type ValidatedCreateWeeklyWorkItemInput = z.infer<typeof createWeeklyWorkItemSchema>;
export type ValidatedUpdateWeeklyWorkItemInput = z.infer<typeof updateWeeklyWorkItemSchema>;

const parseOrThrow = <T>(schema: z.ZodType<T>, input: unknown, code: string, message: string): T => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(message, 400, code, parsed.error.flatten());
  }
  return parsed.data;
};

export const validateWeeklyWorkQuery = (input: unknown) =>
  parseOrThrow(weeklyWorkQuerySchema, input, 'INVALID_WEEKLY_WORK_QUERY', 'Invalid weekly work query');

export const validateCreateWeeklyWorkItemInput = (input: unknown) =>
  parseOrThrow(
    createWeeklyWorkItemSchema,
    input,
    'INVALID_WEEKLY_WORK_PAYLOAD',
    'Invalid weekly work payload'
  );

export const validateUpdateWeeklyWorkItemInput = (input: unknown) =>
  parseOrThrow(
    updateWeeklyWorkItemSchema,
    input,
    'INVALID_WEEKLY_WORK_UPDATE_PAYLOAD',
    'Invalid weekly work update payload'
  );

export const validateDeleteWeeklyWorkItemQuery = (input: unknown) =>
  parseOrThrow(
    deleteWeeklyWorkItemQuerySchema,
    input,
    'INVALID_WEEKLY_WORK_DELETE_QUERY',
    'Invalid weekly work delete query'
  );
