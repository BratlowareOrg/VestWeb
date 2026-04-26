import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockCheckoutSessionsCreate = jest.fn();
const mockWebhooksConstructEvent = jest.fn();
const mockSubscriptionFindOne = jest.fn();
const mockSubscriptionCreate = jest.fn();
const mockSubscriptionUpsert = jest.fn();
const mockSubscriptionUpdate = jest.fn();
const mockPendingStudentUpsert = jest.fn();
const mockPendingStudentFindOne = jest.fn();
const mockStudentFindOne = jest.fn();
const mockStudentCreate = jest.fn();
const mockHashPassword = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerWarn = jest.fn();

const mockStripeConstructor = jest.fn(() => ({
  checkout: { sessions: { create: mockCheckoutSessionsCreate } },
  billingPortal: { sessions: { create: jest.fn() } },
  webhooks: { constructEvent: mockWebhooksConstructEvent },
}));

jest.unstable_mockModule('stripe', () => ({
  default: mockStripeConstructor,
}));

jest.unstable_mockModule('../../../src/db/models/index.js', () => ({
  Subscription: {
    findOne: mockSubscriptionFindOne,
    create: mockSubscriptionCreate,
    upsert: mockSubscriptionUpsert,
    update: mockSubscriptionUpdate,
  },
  PendingStudent: {
    upsert: mockPendingStudentUpsert,
    findOne: mockPendingStudentFindOne,
  },
  Student: {
    findOne: mockStudentFindOne,
    create: mockStudentCreate,
  },
}));

jest.unstable_mockModule('../../../src/services/hashService.js', () => ({
  hashPassword: mockHashPassword,
}));

jest.unstable_mockModule('../../../src/services/logger.js', () => ({
  getRequestLogger: () => ({ error: mockLoggerError, warn: mockLoggerWarn }),
  default: { error: mockLoggerError, warn: mockLoggerWarn },
}));

const {
  createCheckoutSession,
  handleWebhook,
} = await import('../../../src/controllers/paymentController.js');

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
});

const makeCheckoutPayload = () => ({
  planType: 'individual',
  planTier: 'Plus',
  billingPeriod: 'mensal',
  name: 'Ana Lima',
  email: 'ana@vestweb.com',
  password: 'SenhaForte123',
});

describe('paymentController - checkout and webhook flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createCheckoutSession should return session URL and persist pending student', async () => {
    mockCheckoutSessionsCreate.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.local/cs_test_123',
    });
    mockHashPassword.mockResolvedValue('hashed_password');

    const req = { body: makeCheckoutPayload(), log: { error: mockLoggerError, warn: mockLoggerWarn } };
    const res = makeRes();

    await createCheckoutSession(req, res);

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'subscription',
      customer_email: 'ana@vestweb.com',
    }));
    expect(mockPendingStudentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_session_id: 'cs_test_123',
        email: 'ana@vestweb.com',
        password_hash: 'hashed_password',
      }),
      expect.objectContaining({ conflictFields: ['stripe_session_id'] }),
    );
    expect(res.json).toHaveBeenCalledWith({ url: 'https://checkout.stripe.local/cs_test_123' });
  });

  it('createCheckoutSession should return 500 when Stripe checkout creation fails', async () => {
    mockCheckoutSessionsCreate.mockRejectedValue(new Error('Stripe unavailable'));

    const req = { body: makeCheckoutPayload(), log: { error: mockLoggerError, warn: mockLoggerWarn } };
    const res = makeRes();

    await createCheckoutSession(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    expect(mockLoggerError).toHaveBeenCalled();
  });

  it('handleWebhook should return 400 on invalid signature', async () => {
    mockWebhooksConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const req = {
      headers: { 'stripe-signature': 'sig_invalid' },
      body: Buffer.from('{}'),
      log: { error: mockLoggerError, warn: mockLoggerWarn },
    };
    const res = makeRes();

    await handleWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Webhook Error');
    expect(mockLoggerWarn).toHaveBeenCalled();
  });

  it('handleWebhook should process customer.subscription.deleted', async () => {
    mockWebhooksConstructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_123' } },
    });

    const req = {
      headers: { 'stripe-signature': 'sig_ok' },
      body: Buffer.from('{}'),
      log: { error: mockLoggerError, warn: mockLoggerWarn },
    };
    const res = makeRes();

    await handleWebhook(req, res);

    expect(mockSubscriptionUpdate).toHaveBeenCalledWith(
      { status: 'canceled' },
      { where: { stripe_subscription_id: 'sub_123' } },
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('handleWebhook should process payment_intent.succeeded and activate incomplete records', async () => {
    mockWebhooksConstructEvent.mockReturnValue({
      type: 'payment_intent.succeeded',
      data: { object: { metadata: { session_id: 'cs_pi_123' } } },
    });

    const req = {
      headers: { 'stripe-signature': 'sig_ok' },
      body: Buffer.from('{}'),
      log: { error: mockLoggerError, warn: mockLoggerWarn },
    };
    const res = makeRes();

    await handleWebhook(req, res);

    expect(mockSubscriptionUpdate).toHaveBeenCalledWith(
      { status: 'active' },
      { where: { stripe_session_id: 'cs_pi_123', status: 'incomplete' } },
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('handleWebhook should ignore payment_intent.failed and still ack receipt', async () => {
    mockWebhooksConstructEvent.mockReturnValue({
      type: 'payment_intent.failed',
      data: { object: { metadata: { session_id: 'cs_failed' } } },
    });

    const req = {
      headers: { 'stripe-signature': 'sig_ok' },
      body: Buffer.from('{}'),
      log: { error: mockLoggerError, warn: mockLoggerWarn },
    };
    const res = makeRes();

    await handleWebhook(req, res);

    expect(mockSubscriptionUpdate).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('handleWebhook should upsert subscription on checkout.session.completed', async () => {
    mockWebhooksConstructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_done_1',
          payment_status: 'paid',
          customer: 'cus_1',
          subscription: 'sub_1',
          customer_email: 'ana@vestweb.com',
          metadata: {
            plan_type: 'individual',
            plan_tier: 'Plus',
            billing_period: 'mensal',
            customer_name: 'Ana Lima',
            customer_email: 'ana@vestweb.com',
            num_students: '1',
          },
        },
      },
    });
    mockPendingStudentFindOne.mockResolvedValue(null);

    const req = {
      headers: { 'stripe-signature': 'sig_ok' },
      body: Buffer.from('{}'),
      log: { error: mockLoggerError, warn: mockLoggerWarn },
    };
    const res = makeRes();

    await handleWebhook(req, res);

    expect(mockSubscriptionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_subscription_id: 'sub_1',
        stripe_session_id: 'cs_done_1',
        status: 'active',
      }),
      { conflictFields: ['stripe_subscription_id'] },
    );
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});
