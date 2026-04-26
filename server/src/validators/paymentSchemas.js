import { z } from '../middlewares/schemaValidationMiddleware.js';

const BILLING_PERIODS = ['mensal', 'trimestral', 'anual'];
const PLAN_TYPES = ['individual', 'empresa'];

const trimOrUndefined = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const positiveInt = z.coerce.number().int().positive();

const optionalPositiveInt = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}, positiveInt);

const optionalStudentCount = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  return value;
}, positiveInt.max(100000));

export const checkoutBodySchema = z.object({
  planType: z.enum(PLAN_TYPES),
  planTier: z.preprocess(trimOrUndefined, z.string().min(1).max(32)).optional(),
  billingPeriod: z.enum(BILLING_PERIODS),
  name: z.preprocess(trimOrUndefined, z.string().min(1).max(120)),
  email: z.preprocess(trimOrUndefined, z.string().email().max(320)),
  password: z.preprocess(trimOrUndefined, z.string().min(6).max(128)).optional(),
  targetVestibularId: optionalPositiveInt.optional(),
  numStudents: optionalStudentCount.optional(),
  companyName: z.preprocess(trimOrUndefined, z.string().min(1).max(180)).optional(),
})
  .strict()
  .superRefine((payload, ctx) => {
    if (payload.planType === 'individual' && !payload.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'password is required for individual plan',
      });
    }
  });
