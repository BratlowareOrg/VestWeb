import { jest, describe, it, expect } from '@jest/globals';

const mockCreateCheckoutSession = jest.fn();
const mockCreatePixCheckoutSession = jest.fn();
const mockHandleWebhook = jest.fn();
const mockCreatePortalSession = jest.fn();
const mockGetSubscription = jest.fn();
const mockAuthMiddleware = jest.fn((req, res, next) => next());
const mockPaymentRateLimit = jest.fn((req, res, next) => next());
const mockValidateBody = jest.fn(() => (req, res, next) => next());

jest.unstable_mockModule('../../../src/controllers/paymentController.js', () => ({
  createCheckoutSession: mockCreateCheckoutSession,
  createPixCheckoutSession: mockCreatePixCheckoutSession,
  handleWebhook: mockHandleWebhook,
  createPortalSession: mockCreatePortalSession,
  getSubscription: mockGetSubscription,
}));

jest.unstable_mockModule('../../../src/middlewares/authMiddleware.js', () => ({
  default: mockAuthMiddleware,
}));

jest.unstable_mockModule('../../../src/middlewares/rateLimitMiddleware.js', () => ({
  paymentRateLimit: mockPaymentRateLimit,
}));

jest.unstable_mockModule('../../../src/middlewares/schemaValidationMiddleware.js', async () => {
  const { z } = await import('zod');

  return {
    validateBody: mockValidateBody,
    z,
  };
});

const { default: router } = await import('../../../src/routes/paymentRoutes.js');

const getRouteHandlers = (path, method) => {
  const layer = router.stack.find(
    (entry) => entry.route?.path === path && entry.route.methods?.[method]
  );

  if (!layer) {
    throw new Error(`Route ${method.toUpperCase()} ${path} not found`);
  }

  return layer.route.stack.map((stackLayer) => stackLayer.handle);
};

describe('paymentRoutes', () => {
  it('requires auth middleware on GET /subscription', () => {
    const handlers = getRouteHandlers('/subscription', 'get');
    expect(handlers).toHaveLength(2);
    expect(handlers[0]).toBe(mockAuthMiddleware);
    expect(handlers[1]).toBe(mockGetSubscription);
  });

  it('requires auth middleware on POST /portal', () => {
    const handlers = getRouteHandlers('/portal', 'post');
    expect(handlers).toHaveLength(2);
    expect(handlers[0]).toBe(mockAuthMiddleware);
    expect(handlers[1]).toBe(mockCreatePortalSession);
  });

  it('keeps webhook route public and rate limits + validates checkout routes', () => {
    const checkoutHandlers = getRouteHandlers('/create-checkout-session', 'post');
    const pixHandlers = getRouteHandlers('/create-pix-session', 'post');
    const webhookHandlers = getRouteHandlers('/webhook', 'post');

    expect(checkoutHandlers).toHaveLength(3);
    expect(checkoutHandlers[0]).toBe(mockPaymentRateLimit);
    expect(checkoutHandlers[2]).toBe(mockCreateCheckoutSession);

    expect(pixHandlers).toHaveLength(3);
    expect(pixHandlers[0]).toBe(mockPaymentRateLimit);
    expect(pixHandlers[2]).toBe(mockCreatePixCheckoutSession);

    expect(webhookHandlers).toEqual([mockHandleWebhook]);
  });
});
