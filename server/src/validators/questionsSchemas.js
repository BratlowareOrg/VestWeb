import { z } from '../middlewares/schemaValidationMiddleware.js';

const coerceRequiredInt = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  return value;
}, z.coerce.number().int().positive());

const coerceOptionalNonNegativeInt = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  return value;
}, z.coerce.number().int().min(0).optional());

export const submitAnswerBodySchema = z.object({
  session_id: coerceRequiredInt,
  question_id: coerceRequiredInt,
  chosen_alternative_id: coerceRequiredInt,
  response_time_seconds: coerceOptionalNonNegativeInt,
}).strict();

export const setTargetVestibularBodySchema = z.object({
  vestibular_id: z.preprocess((value) => {
    if (value === null || value === undefined || value === '') return null;
    return value;
  }, z.union([z.coerce.number().int().positive(), z.null()])),
}).strict();