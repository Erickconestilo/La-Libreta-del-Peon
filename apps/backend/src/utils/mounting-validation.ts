import { z } from 'zod';

import { AppError } from '../lib/app-error.js';

const mountingVisitSchema = z.object({
  visitedAt: z.string().datetime({ offset: true }).optional(),
  status: z.enum(['draft', 'completed', 'blocked']).default('draft'),
  notes: z.string().trim().max(2000).nullable().optional(),
  changeSummary: z.string().trim().max(2000).nullable().optional(),
  clientRequestId: z.string().uuid()
});

const mountingEvidenceSchema = z.object({
  prismId: z.string().uuid().nullable().optional(),
  kind: z.enum(['general', 'prism', 'reference', 'access', 'other']).default('general'),
  storagePath: z.string().trim().min(1).max(500),
  title: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  positionX: z.number().min(0).max(1).nullable().optional(),
  positionY: z.number().min(0).max(1).nullable().optional(),
  clientRequestId: z.string().uuid()
});

export type ValidatedCreateMountingVisitInput = z.infer<typeof mountingVisitSchema>;
export type ValidatedCreateMountingEvidenceInput = z.infer<typeof mountingEvidenceSchema>;

export const validateCreateMountingVisitInput = (input: unknown): ValidatedCreateMountingVisitInput => {
  const parsed = mountingVisitSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(
      'Invalid mounting visit payload',
      400,
      'INVALID_MOUNTING_VISIT_PAYLOAD',
      parsed.error.flatten()
    );
  }

  return parsed.data;
};

export const validateCreateMountingEvidenceInput = (input: unknown): ValidatedCreateMountingEvidenceInput => {
  const parsed = mountingEvidenceSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(
      'Invalid mounting evidence payload',
      400,
      'INVALID_MOUNTING_EVIDENCE_PAYLOAD',
      parsed.error.flatten()
    );
  }

  return parsed.data;
};
