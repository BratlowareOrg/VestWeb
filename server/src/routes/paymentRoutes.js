import { Router } from 'express';
import {
  createCheckoutSession,
  createPixCheckoutSession,
  handleWebhook,
  createPortalSession,
  getSubscription,
} from '../controllers/paymentController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { paymentRateLimit } from '../middlewares/rateLimitMiddleware.js';
import { validateBody } from '../middlewares/schemaValidationMiddleware.js';
import { checkoutBodySchema } from '../validators/paymentSchemas.js';

const router = Router();

// Rota publica - recebe eventos do Stripe (raw body configurado em app.js)
router.post('/webhook', handleWebhook);

// Rotas publicas - criacao de sessao de checkout
router.post('/create-checkout-session', paymentRateLimit, validateBody(checkoutBodySchema), createCheckoutSession);
router.post('/create-pix-session', paymentRateLimit, validateBody(checkoutBodySchema), createPixCheckoutSession);

// Consultar assinatura do usuario autenticado
router.get('/subscription', authMiddleware, getSubscription);

// Portal de gerenciamento da assinatura do usuario autenticado
router.post('/portal', authMiddleware, createPortalSession);

export default router;
