import { useState, useEffect } from 'react';
import { X, Lock, CreditCard, QrCode, Eye, EyeOff } from 'lucide-react';
import api from '../../api/api';
import './CheckoutModal.css';

export type PlanType = 'individual' | 'empresa';
export type BillingPeriod = 'mensal' | 'trimestral' | 'anual';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planType: PlanType;
  planTier: string;
  billingPeriod: BillingPeriod;
  priceLabel: string;
  billingNote: string;
}

const BILLING_OPTIONS: { value: BillingPeriod; label: string; badge?: string }[] = [
  { value: 'mensal',     label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral', badge: '10% off' },
  { value: 'anual',      label: 'Anual',      badge: '33% off' },
];

const INDIVIDUAL_PLAN_PRICES: Record<string, Record<BillingPeriod, { monthly: number; total: number }>> = {
  Básico: { mensal: { monthly: 14.90, total: 14.90 },  trimestral: { monthly: 13.41, total: 40.23 },  anual: { monthly: 9.99,  total: 119.88 } },
  Plus:   { mensal: { monthly: 24.90, total: 24.90 },  trimestral: { monthly: 22.41, total: 67.23 },  anual: { monthly: 16.66, total: 199.92 } },
  Pro:    { mensal: { monthly: 39.90, total: 39.90 },  trimestral: { monthly: 35.91, total: 107.73 }, anual: { monthly: 26.73, total: 320.76 } },
  Elite:  { mensal: { monthly: 44.90, total: 44.90 },  trimestral: { monthly: 40.41, total: 121.23 }, anual: { monthly: 30.07, total: 360.84 } },
};

export default function CheckoutModal({
  isOpen,
  onClose,
  planType,
  planTier,
  billingPeriod: initialBillingPeriod,
}: CheckoutModalProps) {
  const [billing, setBilling] = useState<BillingPeriod>(initialBillingPeriod);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'pix'>('card');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [targetVestibularId, setTargetVestibularId] = useState<number | ''>('');
  const [vestibulares, setVestibulares] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setBilling(initialBillingPeriod);
  }, [initialBillingPeriod]);

  useEffect(() => {
    if (isOpen && planType === 'individual') {
      api.get('/questions/vestibulares')
        .then(({ data }) => setVestibulares(data.data || []))
        .catch(() => {});
    }
  }, [isOpen, planType]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  function getPriceLabel() {
    const prices = INDIVIDUAL_PLAN_PRICES[planTier];
    if (!prices) return '';
    const { monthly } = prices[billing];
    return `R$ ${monthly.toFixed(2).replace('.', ',')}/mês`;
  }

  function getBillingNote() {
    const prices = INDIVIDUAL_PLAN_PRICES[planTier];
    if (!prices) return '';
    const { total } = prices[billing];
    if (billing === 'mensal') return 'Cobrado mensalmente';
    if (billing === 'trimestral') return `Cobrado R$${total.toFixed(2).replace('.', ',')} a cada 3 meses`;
    return `Cobrado R$${total.toFixed(2).replace('.', ',')} por ano`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim()) {
      setError('Por favor, preencha nome e e-mail.');
      return;
    }
    if (!password) {
      setError('Por favor, crie uma senha.');
      return;
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    const endpoint = paymentMethod === 'pix'
      ? '/payments/create-pix-session'
      : '/payments/create-checkout-session';

    setLoading(true);
    try {
      const { data } = await api.post(endpoint, {
        planType,
        planTier,
        billingPeriod: billing,
        name,
        email,
        password,
        targetVestibularId: targetVestibularId || null,
      });

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError('Erro ao iniciar o pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="checkout-overlay" onClick={onClose}>
      <div className="checkout-modal" onClick={e => e.stopPropagation()}>

        <button className="checkout-close" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>

        {/* Cabeçalho do plano */}
        <div className="checkout-header">
          <div className="checkout-plan-badge">VestWeb {planTier}</div>
          <div className="checkout-price">{getPriceLabel()}</div>
          <p className="checkout-billing-note">{getBillingNote()}</p>
        </div>

        {/* Seletor de método de pagamento */}
        <div className="checkout-payment-method">
          <button
            type="button"
            className={`checkout-method-btn${paymentMethod === 'card' ? ' active' : ''}`}
            onClick={() => setPaymentMethod('card')}
          >
            <CreditCard size={16} />
            Cartão
          </button>
          <button
            type="button"
            className={`checkout-method-btn${paymentMethod === 'pix' ? ' active' : ''}`}
            onClick={() => setPaymentMethod('pix')}
          >
            <QrCode size={16} />
            PIX
          </button>
        </div>

        {paymentMethod === 'pix' && (
          <p className="checkout-pix-note">
            PIX é pagamento único. O acesso é liberado automaticamente após a confirmação e renovado manualmente no próximo período.
          </p>
        )}

        {/* Toggle de período de cobrança */}
        <div className="checkout-billing-toggle">
          {BILLING_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              className={`checkout-billing-btn${billing === opt.value ? ' active' : ''}`}
              onClick={() => setBilling(opt.value)}
            >
              {opt.label}
              {opt.badge && <span className="checkout-billing-badge">{opt.badge}</span>}
            </button>
          ))}
        </div>

        {/* Formulário */}
        <form className="checkout-form" onSubmit={handleSubmit}>
          <div className="checkout-field">
            <label htmlFor="checkout-name">Nome completo</label>
            <input
              id="checkout-name"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="checkout-field">
            <label htmlFor="checkout-email">E-mail</label>
            <input
              id="checkout-email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <>
            <div className="checkout-field">
                <label htmlFor="checkout-password">Senha</label>
                <div className="checkout-password-wrapper">
                  <input
                    id="checkout-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="checkout-password-toggle"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
              </div>

              <div className="checkout-field">
                <label htmlFor="checkout-confirm-password">Confirmar senha</label>
                <input
                  id="checkout-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="checkout-field">
                <label htmlFor="checkout-target-vestibular">Vestibular alvo <span className="checkout-field-optional">(opcional)</span></label>
                <select
                  id="checkout-target-vestibular"
                  value={targetVestibularId}
                  onChange={e => setTargetVestibularId(e.target.value ? Number(e.target.value) : '')}
                  className="checkout-select"
                >
                  <option value="">Selecione seu vestibular</option>
                  {vestibulares.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
          </>

          {error && <p className="checkout-error">{error}</p>}

          <button
            type="submit"
            className="checkout-submit"
            disabled={loading}
          >
            {loading ? (
              <span className="checkout-spinner" />
            ) : paymentMethod === 'pix' ? (
              <>
                <QrCode size={18} />
                Gerar QR Code PIX
              </>
            ) : (
              <>
                <CreditCard size={18} />
                Assinar agora
              </>
            )}
          </button>

          <p className="checkout-secure">
            <Lock size={12} />
            Pagamento seguro via Stripe. Cancele quando quiser.
          </p>
        </form>
      </div>
    </div>
  );
}
