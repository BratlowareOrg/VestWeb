import { describe, it, expect, beforeEach, afterAll } from '@jest/globals';

const originalAuthWindowMs = process.env.RATE_LIMIT_AUTH_WINDOW_MS;
const originalAuthMax = process.env.RATE_LIMIT_AUTH_MAX;
const originalPaymentWindowMs = process.env.RATE_LIMIT_PAYMENT_WINDOW_MS;
const originalPaymentMax = process.env.RATE_LIMIT_PAYMENT_MAX;

process.env.RATE_LIMIT_AUTH_WINDOW_MS = '60000';
process.env.RATE_LIMIT_AUTH_MAX = '10';
process.env.RATE_LIMIT_PAYMENT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_PAYMENT_MAX = '2';

const { default: express } = await import('express');
const { default: supertest } = await import('supertest');
const { paymentRateLimit } = await import('../../../src/middlewares/rateLimitMiddleware.js');

const buildApp = () => {
  const app = express();
  app.set('trust proxy', 1);
  app.get('/limited', paymentRateLimit, (req, res) => {
    res.status(200).json({ ok: true });
  });
  return app;
};

const resetLimiter = () => {
  if (typeof paymentRateLimit.resetKey !== 'function') return;
  ['::ffff:127.0.0.1', '::1', '127.0.0.1'].forEach((key) => {
    paymentRateLimit.resetKey(key);
  });
};

describe('paymentRateLimit middleware', () => {
  beforeEach(() => {
    resetLimiter();
  });

  it('should enforce request limit and return Retry-After header', async () => {
    const request = supertest(buildApp());

    const first = await request.get('/limited');
    const second = await request.get('/limited');
    const third = await request.get('/limited');

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    expect(third.status).toBe(429);
    expect(third.body).toEqual({
      message: 'Limite de tentativas de pagamento excedido. Tente novamente em alguns minutos.',
    });
    expect(third.headers).toHaveProperty('retry-after');
    expect(Number.parseInt(third.headers['retry-after'], 10)).toBeGreaterThanOrEqual(0);
  });
});

afterAll(() => {
  if (originalAuthWindowMs === undefined) delete process.env.RATE_LIMIT_AUTH_WINDOW_MS;
  else process.env.RATE_LIMIT_AUTH_WINDOW_MS = originalAuthWindowMs;

  if (originalAuthMax === undefined) delete process.env.RATE_LIMIT_AUTH_MAX;
  else process.env.RATE_LIMIT_AUTH_MAX = originalAuthMax;

  if (originalPaymentWindowMs === undefined) delete process.env.RATE_LIMIT_PAYMENT_WINDOW_MS;
  else process.env.RATE_LIMIT_PAYMENT_WINDOW_MS = originalPaymentWindowMs;

  if (originalPaymentMax === undefined) delete process.env.RATE_LIMIT_PAYMENT_MAX;
  else process.env.RATE_LIMIT_PAYMENT_MAX = originalPaymentMax;
});
