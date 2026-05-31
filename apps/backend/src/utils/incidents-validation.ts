import { z } from 'zod';

import { AppError } from '../lib/app-error.js';

const incidentSuggestionSchema = z.object({
  kind: z.enum(['new_station', 'alternate_prism', 'free_note']),
  notes: z.string().trim().max(1200).nullable().default(null),
  proposedLat: z.number().finite().nullable().default(null),
  proposedLng: z.number().finite().nullable().default(null),
  proposedPrismCode: z.string().trim().max(80).nullable().default(null),
  proposedStationName: z.string().trim().max(160).nullable().default(null)
});

const createIncidentSchema = z.object({
  description: z.string().trim().min(1).max(1600),
  photoUrl: z.null().optional().default(null),
  prismId: z.string().uuid().nullable().optional().default(null),
  stationId: z.string().uuid().nullable().optional().default(null),
  suggestion: incidentSuggestionSchema.nullable().optional().default(null),
  type: z.enum(['obstaculo_estacionamiento', 'prisma_no_visible', 'otro'])
});

export type ValidatedCreateIncidentInput = z.infer<typeof createIncidentSchema>;

export const validateCreateIncidentInput = (input: unknown) => {
  const parsedInput = createIncidentSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AppError('Invalid incident payload', 400, 'INVALID_INCIDENT_PAYLOAD', parsedInput.error.flatten());
  }

  return parsedInput.data;
};
