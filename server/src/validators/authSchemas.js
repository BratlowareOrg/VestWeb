import { z } from '../middlewares/schemaValidationMiddleware.js';

const trimString = (value) => (typeof value === 'string' ? value.trim() : value);
const emptyToUndefined = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};
const emptyToNull = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const enrollmentSchema = z.preprocess(trimString, z.string().min(1).max(32));
const passwordSchema = z.string().min(1).max(128);

export const loginBodySchema = z.object({
  enrollment: enrollmentSchema,
  password: passwordSchema,
});

export const updateProfileBodySchema = z.object({
  name: z.preprocess(emptyToUndefined, z.string().min(1).max(120)).optional(),
  email: z.preprocess(emptyToUndefined, z.string().email().max(320)).optional(),
  avatar_url: z.preprocess(
    emptyToNull,
    z.union([z.string().url().max(2048), z.null()]),
  ).optional(),
})
  .strict()
  .refine(
    (payload) => payload.name !== undefined || payload.email !== undefined || payload.avatar_url !== undefined,
    { message: 'At least one profile field must be provided.' },
  );

export const changePasswordBodySchema = z.object({
  current_password: passwordSchema,
  new_password: z.string().min(6).max(128),
}).strict();
