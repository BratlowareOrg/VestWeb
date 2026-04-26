import rateLimit from 'express-rate-limit';

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const createLimiter = ({ windowMs, limit, message }) => rateLimit({
  windowMs,
  limit,
  message: { message },
  standardHeaders: true,
  legacyHeaders: false,
});

const authWindowMs = toPositiveInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 15 * 60 * 1000);
const authMax = toPositiveInt(process.env.RATE_LIMIT_AUTH_MAX, 10);

const paymentWindowMs = toPositiveInt(process.env.RATE_LIMIT_PAYMENT_WINDOW_MS, 15 * 60 * 1000);
const paymentMax = toPositiveInt(process.env.RATE_LIMIT_PAYMENT_MAX, 5);

export const authRateLimit = createLimiter({
  windowMs: authWindowMs,
  limit: authMax,
  message: 'Muitas tentativas de login. Tente novamente em alguns minutos.',
});

export const paymentRateLimit = createLimiter({
  windowMs: paymentWindowMs,
  limit: paymentMax,
  message: 'Limite de tentativas de pagamento excedido. Tente novamente em alguns minutos.',
});
