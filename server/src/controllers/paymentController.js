import Stripe from 'stripe';
import { Op } from 'sequelize';
import { Subscription, PendingStudent, Student } from '../db/models/index.js';
import { hashPassword } from '../services/hashService.js';
import { getRequestLogger } from '../services/logger.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function generateEnrollment() {
  const random = Math.floor(10000000 + Math.random() * 90000000);
  return random.toString();
}

// PreÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§os em centavos (BRL) por plano individual e perÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­odo
const INDIVIDUAL_PLAN_PRICES = {
  'B\u00E1sico': { mensal: 1490, trimestral: 4023,  anual: 11988 },
  Plus:   { mensal: 2490, trimestral: 6723,  anual: 19992 },
  Pro:    { mensal: 3990, trimestral: 10773, anual: 32076 },
  Elite:  { mensal: 4490, trimestral: 12123, anual: 36084 },
};

const BILLING_INTERVAL = {
  mensal:     { interval: 'month', interval_count: 1 },
  trimestral: { interval: 'month', interval_count: 3 },
  anual:      { interval: 'year',  interval_count: 1 },
};

// POST /api/payments/create-pix-session  (pagamento ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºnico ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â PIX nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o suporta recorrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âªncia)
export const createPixCheckoutSession = async (req, res) => {
  try {
    const {
      planType,
      planTier,
      billingPeriod,
      name,
      email,
      password,
      targetVestibularId,
      numStudents,
      companyName,
    } = req.body;

    if (!planType || !billingPeriod || !email || !name) {
      return res.status(400).json({ message: 'Campos obrigatÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³rios ausentes.' });
    }

    if (planType === 'individual' && !password) {
      return res.status(400).json({ message: 'Senha obrigatÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ria.' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    let unitAmount;
    let productName;

    if (planType === 'individual') {
      const planPrices = INDIVIDUAL_PLAN_PRICES[planTier];
      if (!planPrices) return res.status(400).json({ message: 'Plano invÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡lido.' });
      unitAmount = planPrices[billingPeriod];
      if (!unitAmount) return res.status(400).json({ message: 'PerÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­odo de cobranÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§a invÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡lido.' });
      productName = `VestWeb ${planTier} ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ${billingPeriod.charAt(0).toUpperCase() + billingPeriod.slice(1)}`;
    } else {
      return res.status(400).json({ message: 'Tipo de plano invÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡lido.' });
    }

    // Calcula data de expiraÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o do acesso com base no perÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­odo escolhido
    const periodMonths = { mensal: 1, trimestral: 3, anual: 12 };
    const accessEndDate = new Date();
    accessEndDate.setMonth(accessEndDate.getMonth() + (periodMonths[billingPeriod] || 1));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['pix'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'brl',
          product_data: {
            name: productName,
            description: planType === 'individual'
              ? 'Acesso completo ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  plataforma VestWeb'
              : `Plano empresarial VestWeb para ${numStudents || 1} aluno(s)`,
          },
          unit_amount: unitAmount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/payment/cancel`,
      metadata: {
        plan_type: planType,
        plan_tier: planTier || 'individual',
        billing_period: billingPeriod,
        customer_name: name,
        customer_email: email,
        num_students: (numStudents || 1).toString(),
        company_name: companyName || '',
        access_end_date: accessEndDate.toISOString(),
        payment_method: 'pix',
      },
      locale: 'pt-BR',
      expires_at: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // QR Code vÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡lido por 24h
    });

    // Salva dados do aluno temporariamente
    if (planType === 'individual') {
      const password_hash = await hashPassword(password);
      await PendingStudent.upsert({
        stripe_session_id: session.id,
        name,
        email,
        password_hash,
        target_vestibular_id: targetVestibularId || null,
      }, { conflictFields: ['stripe_session_id'] });
    }

    res.json({ url: session.url });
  } catch (err) {
    getRequestLogger(req).error({ err, event: 'payment_create_pix_session_error' }, 'Stripe createPixCheckoutSession error');
    res.status(500).json({ message: 'Erro ao criar sessÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o PIX.' });
  }
};

// POST /api/payments/create-checkout-session
export const createCheckoutSession = async (req, res) => {
  try {
    const {
      planType,      // 'individual' | 'empresa'
      planTier,      // 'individual' | 'Starter' | 'BÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡sico' | 'Profissional' | 'Enterprise'
      billingPeriod, // 'mensal' | 'trimestral' | 'anual'
      name,
      email,
      password,
      targetVestibularId,
      numStudents,
      companyName,
    } = req.body;

    if (!planType || !billingPeriod || !email || !name) {
      return res.status(400).json({ message: 'Campos obrigatÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³rios ausentes.' });
    }

    if (planType === 'individual' && !password) {
      return res.status(400).json({ message: 'Senha obrigatÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ria.' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    let lineItems;
    let productName;
    let unitAmount;
    let recurring;
    let trialDays = 0;

    if (planType === 'individual') {
      const planPrices = INDIVIDUAL_PLAN_PRICES[planTier];
      if (!planPrices) return res.status(400).json({ message: 'Plano invÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡lido.' });

      unitAmount = planPrices[billingPeriod];
      if (!unitAmount) return res.status(400).json({ message: 'PerÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­odo de cobranÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§a invÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡lido.' });

      const { interval, interval_count } = BILLING_INTERVAL[billingPeriod];
      recurring = { interval, interval_count };
      productName = `VestWeb ${planTier} ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ${billingPeriod.charAt(0).toUpperCase() + billingPeriod.slice(1)}`;

    } else {
      return res.status(400).json({ message: 'Tipo de plano invÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡lido.' });
    }

    lineItems = [{
      price_data: {
        currency: 'brl',
        product_data: {
          name: productName,
          description: planType === 'individual'
            ? 'Acesso completo ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â  plataforma VestWeb'
            : `Plano empresarial VestWeb para ${numStudents || 1} aluno(s)`,
        },
        unit_amount: unitAmount,
        recurring,
      },
      quantity: 1,
    }];

    const sessionConfig = {
      payment_method_types: ['card'],
      customer_email: email,
      line_items: lineItems,
      mode: 'subscription',
      success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/payment/cancel`,
      metadata: {
        plan_type: planType,
        plan_tier: planTier || 'individual',
        billing_period: billingPeriod,
        customer_name: name,
        customer_email: email,
        num_students: (numStudents || 1).toString(),
        company_name: companyName || '',
      },
      locale: 'pt-BR',
    };

    if (trialDays > 0) {
      sessionConfig.subscription_data = { trial_period_days: trialDays };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Salva dados do aluno temporariamente ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â serÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ criado no banco apÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³s pagamento confirmar
    if (planType === 'individual') {
      const password_hash = await hashPassword(password);
      await PendingStudent.upsert({
        stripe_session_id: session.id,
        name,
        email,
        password_hash,
        target_vestibular_id: targetVestibularId || null,
      }, { conflictFields: ['stripe_session_id'] });
    }

    res.json({ url: session.url });
  } catch (err) {
    getRequestLogger(req).error({ err, event: 'payment_create_checkout_session_error' }, 'Stripe createCheckoutSession error');
    res.status(500).json({ message: 'Erro ao criar sessÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o de pagamento.' });
  }
};

// POST /api/payments/webhook  (raw body obrigatÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³rio ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â configurado em app.js)
export const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    getRequestLogger(req).warn({ err, event: 'payment_webhook_signature_error' }, 'Webhook signature error');
    return res.status(400).send('Webhook Error');
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const meta = session.metadata || {};
        const isPix = meta.payment_method === 'pix';

        // Para PIX: sÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â³ processa se o pagamento foi confirmado
        // Para assinaturas: processa mesmo em trial (payment_status = 'no_payment_required')
        const isPaid = session.payment_status === 'paid';
        const isTrialing = session.payment_status === 'no_payment_required';
        if (!isPaid && !isTrialing) break;

        const currentPeriodEnd = isPix && meta.access_end_date
          ? new Date(meta.access_end_date)
          : null;

        const subscriptionData = {
          customer_email: meta.customer_email || session.customer_email,
          customer_name: meta.customer_name || '',
          stripe_customer_id: session.customer,
          stripe_subscription_id: isPix ? null : session.subscription,
          stripe_session_id: session.id,
          plan_type: meta.plan_type || 'individual',
          plan_tier: meta.plan_tier || 'individual',
          billing_period: meta.billing_period || 'mensal',
          status: isPaid ? 'active' : 'trialing',
          student_count: parseInt(meta.num_students) || 1,
          company_name: meta.company_name || null,
          current_period_end: currentPeriodEnd,
        };

        if (isPix) {
          const existing = await Subscription.findOne({ where: { stripe_session_id: session.id } });
          if (!existing) await Subscription.create(subscriptionData);
        } else {
          await Subscription.upsert(subscriptionData, { conflictFields: ['stripe_subscription_id'] });
        }

        // Cria o Student se for plano individual e ainda nÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o existir
        if (meta.plan_type === 'individual') {
          const pending = await PendingStudent.findOne({ where: { stripe_session_id: session.id } });
          if (pending) {
            const alreadyExists = await Student.findOne({ where: { email: pending.email } });
            if (!alreadyExists) {
              // Garante enrollment ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Âºnico
              let enrollment;
              let enrollmentTaken = true;
              while (enrollmentTaken) {
                enrollment = generateEnrollment();
                enrollmentTaken = !!(await Student.findOne({ where: { enrollment } }));
              }

              await Student.create({
                name: pending.name,
                email: pending.email,
                password_hash: pending.password_hash,
                enrollment,
                target_vestibular_id: pending.target_vestibular_id || null,
                role: 'student',
              });
            }
            await pending.destroy();
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object;
        await Subscription.update(
          {
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000),
          },
          { where: { stripe_subscription_id: sub.id } }
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await Subscription.update(
          { status: 'canceled' },
          { where: { stripe_subscription_id: sub.id } }
        );
        break;
      }

      // PIX pago de forma assÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â­ncrona (usuÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡rio fechou a tela e pagou depois)
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        // Atualiza status caso a subscription tenha sido criada mas ainda estava pendente
        await Subscription.update(
          { status: 'active' },
          { where: { stripe_session_id: pi.metadata?.session_id || '', status: 'incomplete' } }
        );
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    getRequestLogger(req).error({ err, event: 'payment_webhook_handler_error' }, 'Webhook handler error');
    res.status(500).json({ message: 'Erro interno ao processar webhook.' });
  }
};

// POST /api/payments/portal  (requer autenticaÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â§ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â£o)
export const createPortalSession = async (req, res) => {
  try {
    const authenticatedEmail = req.user?.email;
    if (!authenticatedEmail) {
      return res.status(401).json({ message: 'Usuario nao autenticado.' });
    }

    const subscription = await Subscription.findOne({
      where: {
        customer_email: authenticatedEmail,
        status: { [Op.in]: ['active', 'trialing', 'past_due'] },
      },
      order: [['created_at', 'DESC']],
    });

    if (!subscription?.stripe_customer_id) {
      return res.status(404).json({ message: 'Nenhuma assinatura ativa encontrada.' });
    }

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const portal = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${clientUrl}/classroom/settings`,
    });

    res.json({ url: portal.url });
  } catch (err) {
    getRequestLogger(req).error({ err, event: 'payment_create_portal_session_error' }, 'Portal session error');
    res.status(500).json({ message: 'Erro ao abrir portal de assinatura.' });
  }
};

// GET /api/payments/subscription
export const getSubscription = async (req, res) => {
  try {
    const authenticatedEmail = req.user?.email;
    if (!authenticatedEmail) {
      return res.status(401).json({ message: 'Usuario nao autenticado.' });
    }

    const subscription = await Subscription.findOne({
      where: { customer_email: authenticatedEmail },
      order: [['created_at', 'DESC']],
    });

    if (!subscription) {
      return res.json({ subscription: null });
    }

    res.json({ subscription });
  } catch (err) {
    getRequestLogger(req).error({ err, event: 'payment_get_subscription_error' }, 'Get subscription error');
    res.status(500).json({ message: 'Erro ao buscar assinatura.' });
  }
};

