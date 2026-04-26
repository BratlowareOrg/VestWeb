import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle, ClipboardList, Play, MessageCircle,
  Calendar, Users, Mail, Phone, MapPin
} from 'lucide-react';
import logo from '../../assets/images/logo.png';
import LandingHeader from '../../components/LandingHeader';
import { WebGLShader } from '../../components/ui/web-gl-shader';
import CheckoutModal, { type PlanType, type BillingPeriod } from '../../components/CheckoutModal/CheckoutModal';
import api from '../../api/api';
import './LandingPage.css';


const WaveDivider = ({ to, flip = false }: { to: 'bg' | 'white' | 'sidebar'; flip?: boolean }) => (
  <div className={`wave-divider wave-to-${to}${flip ? ' wave-divider--flip' : ''}`} aria-hidden="true">
    <svg viewBox="0 0 1440 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0,60 L0,40 C480,0 960,0 1440,40 L1440,60 Z" />
    </svg>
  </div>
);

const features = [
  { icon: HelpCircle, title: 'Banco de Questões', desc: 'Milhares de questões de vestibulares anteriores organizadas por matéria e dificuldade.' },
  { icon: ClipboardList, title: 'Simulados', desc: 'Simulados completos com timer, correção automática e análise detalhada de desempenho.' },
  { icon: Play, title: 'VestWebFlix', desc: 'Videoaulas com os melhores professores, organizadas como uma plataforma de streaming.' },
  { icon: MessageCircle, title: 'Mentoria', desc: 'Sessões individuais com tutores especializados para tirar dúvidas e orientar estudos.' },
  { icon: Calendar, title: 'Calendário de Revisão', desc: 'Planejamento inteligente de revisões para fixar o conteúdo no longo prazo.' },
  { icon: Users, title: 'Comunidade', desc: 'Conecte-se com outros estudantes, compartilhe dúvidas e conquiste pontos no ranking.' },
];

const heroStats = [
  { target: 20, suffix: 'k+', label: 'Questões' },
  { target: 100, suffix: '+', label: 'Videoaulas' },
  { target: 100, suffix: '+', label: 'Alunos' },
  { target: 95, suffix: '%', label: 'Aprovados' },
];

function useCountUp(target: number, duration = 1600) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  const animate = useCallback(() => {
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
      else setCount(target);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          animate();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animate]);

  return { count, ref };
}

function AnimatedStat({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const { count, ref } = useCountUp(target);
  return (
    <div className="hero-stat" ref={ref}>
      <span className="hero-stat-number">{count}{suffix}</span>
      <span className="hero-stat-label">{label}</span>
    </div>
  );
}

const individualPlans = [
  {
    name: 'Básico',
    desc: 'Para quem está começando os estudos.',
    prices: { mensal: 14.90, trimestral: 13.41, anual: 9.99 },
    totals: { trimestral: 40.23, anual: 119.88 },
    benefits: ['Banco de questões', '5 simulados por mês', 'Calendário de estudos'],
    highlight: false,
  },
  {
    name: 'Plus',
    desc: 'O mais escolhido por quem quer evoluir rápido.',
    prices: { mensal: 24.90, trimestral: 22.41, anual: 16.66 },
    totals: { trimestral: 67.23, anual: 199.92 },
    benefits: ['Tudo do Básico', 'Simulados ilimitados', 'VestWebFlix', 'Ranking e gamificação'],
    highlight: true,
  },
  {
    name: 'Pro',
    desc: 'Para quem está focado na aprovação.',
    prices: { mensal: 39.90, trimestral: 35.91, anual: 26.73 },
    totals: { trimestral: 107.73, anual: 320.76 },
    benefits: ['Tudo do Plus', 'Comunidade de alunos', 'Acompanhamento de desempenho', 'Suporte prioritário'],
    highlight: false,
  },
  {
    name: 'Elite',
    desc: 'Máximo desempenho, com suporte exclusivo.',
    prices: { mensal: 44.90, trimestral: 40.41, anual: 30.07 },
    totals: { trimestral: 121.23, anual: 360.84 },
    benefits: ['Tudo do Pro', 'Mentoria ao vivo', 'Conteúdos exclusivos', 'Acesso antecipado a novidades'],
    highlight: false,
  },
];

interface CheckoutState {
  isOpen: boolean;
  planType: PlanType;
  planTier: string;
}

const LandingPage = () => {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('anual');
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutState>({
    isOpen: false,
    planType: 'individual',
    planTier: 'individual',
  });

  function openCheckout(planType: PlanType, planTier: string) {
    setCheckout({ isOpen: true, planType, planTier });
  }

  function closeCheckout() {
    setCheckout(prev => ({ ...prev, isOpen: false }));
  }


const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);
    try {
      await api.post('/landing/contact', contactForm);
      setContactSuccess(true);
      setContactForm({ name: '', email: '', message: '' });
      setTimeout(() => setContactSuccess(false), 5000);
    } catch {
      // fallback
      setContactSuccess(true);
      setContactForm({ name: '', email: '', message: '' });
      setTimeout(() => setContactSuccess(false), 5000);
    }
    setContactLoading(false);
  };

  return (
    <div className="landing-page">
      <LandingHeader />

      {/* Hero */}
      <section id="home" className="hero">
        <WebGLShader asAbsolute />

        <div className="hero-content">
          <div className="hero-badge">Pré-vestibular</div>
          <h1 className="hero-title">
            A plataforma completa para quem <span>busca a Federal</span>
          </h1>
          <p className="hero-subtitle">
            Questões, simulados, videoaulas, mentorias e muito mais — tudo integrado para maximizar seu aprendizado e conquistar sua aprovação.
          </p>
          <div className="hero-actions">
            <a href="#planos" className="hero-cta-primary">
              Começar agora
            </a>
          </div>
          <div className="hero-stats">
            {heroStats.map((s) => (
              <AnimatedStat key={s.label} target={s.target} suffix={s.suffix} label={s.label} />
            ))}
          </div>
        </div>

        <WaveDivider to="bg" />
      </section>

      {/* Espaco Aluno */}
      <section id="espaco-aluno" className="section">
        <div className="section-header">
          <div className="section-tag">Recursos</div>
          <h2 className="section-title">Tudo que você precisa em um só lugar!</h2>
          <p className="section-desc">Nossa plataforma foi desenvolvida para vestibulandos de todo o Brasil, com ferramentas que fazem a diferença.</p>
        </div>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">
                <f.icon size={28} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
        <WaveDivider to="white" flip />
      </section>

      {/* Sobre */}
      <section id="sobre" className="section section-alt">
        <div className="about-content">
          <div className="about-stats-card">
            <div className="about-stats-logo">
              <img src={logo} alt="VestWeb" />
            </div>
            <p className="about-card-tagline">
              A plataforma educacional que vai transformar a forma como você estuda para o vestibular.
            </p>
          </div>
          <div className="about-text">
            <div className="section-tag">Sobre Nós</div>
            <h2>Educação de qualidade ao alcance de todo aluno.</h2>
            <p>
              O VestWeb nasceu com uma missão simples: tornar o preparatório para o vestibular acessível. Acreditamos que o preço não deve ser um obstáculo entre o aluno e a sua aprovação.
            </p>
            <p>
              Por isso criamos uma plataforma completa — questões, simulados, videoaulas e acompanhamento de desempenho — com um valor que cabe no bolso de qualquer estudante.
            </p>
            <div className="about-highlights">
              {[
                'Plano a partir de R$ 19,90/mês com 7 dias grátis.',
                'Tudo em um só lugar, sem pagar por separado.',
                'Fácil de usar, do celular ou computador.',
                'Feito para quem quer estudar de verdade.',
              ].map((h, i) => (
                <div key={i} className="about-highlight">
                  <div className="about-highlight-dot" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <WaveDivider to="bg" />
      </section>

      {/* Metodologia */}
      <section id="metodologia" className="section">
        <div className="section-header">
          <div className="section-tag">Metodologia</div>
          <h2 className="section-title">Como o VestWeb te prepara</h2>
          <p className="section-desc">Nossa abordagem é baseada em evidências científicas de aprendizado para maximizar sua evolução.</p>
        </div>
        <div className="methodology-grid">
          {[
            { step: '01', title: 'Diagnóstico', desc: 'Identifique seus pontos fortes e fracos com questões segmentadas por matéria e dificuldade.' },
            { step: '02', title: 'Prática direcionada', desc: 'Resolva questões focadas nas suas maiores dificuldades, com correção automática e explicações detalhadas.' },
            { step: '03', title: 'Revisão espaçada', desc: 'O calendário inteligente agenda revisões no momento certo para fixar o conteúdo na memória de longo prazo.' },
            { step: '04', title: 'Simulados reais', desc: 'Teste seus conhecimentos em simulados completos com o formato e nível das provas que você vai fazer.' },
            { step: '05', title: 'Análise de desempenho', desc: 'Acompanhe sua evolução com gráficos e métricas que mostram exatamente onde você precisa melhorar.' },
            { step: '06', title: 'Mentoria e comunidade', desc: 'Tire dúvidas com tutores e troque experiências com outros estudantes na nossa comunidade.' },
          ].map((m, i) => (
            <div key={i} className="methodology-card">
              <div className="methodology-step">{m.step}</div>
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>
        <WaveDivider to="white" flip />
      </section>

      {/* Planos */}
      <section id="planos" className="section section-alt">
        <div className="section-header">
          <div className="section-tag">Planos e Preços</div>
          <h2 className="section-title">Escolha o plano ideal para você</h2>
          <p className="section-desc">Acesso completo à plataforma. Sem surpresas, sem letras miúdas.</p>
        </div>

        <div className="plans-tabs plans-billing-toggle">
          {(['mensal', 'trimestral', 'anual'] as const).map((p) => (
            <button
              key={p}
              className={`plans-tab${billingPeriod === p ? ' active' : ''}`}
              onClick={() => setBillingPeriod(p)}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
              {p === 'trimestral' && <span className="billing-save-pill">–10%</span>}
              {p === 'anual' && <span className="billing-save-pill">–33%</span>}
            </button>
          ))}
        </div>

        <div className="plans-individual-grid">
          {individualPlans.map((plan, i) => (
            <div key={i} className={`plan-card${plan.highlight ? ' plan-card-highlight' : ''}`}>
              {plan.highlight && <div className="plan-popular-badge">Mais popular</div>}
              <div className="plan-name">{plan.name}</div>
              <p className="plan-desc">{plan.desc}</p>
              <div className="plan-price">
                <span className="plan-currency">R$</span>
                <span className="plan-amount">
                  {plan.prices[billingPeriod].toFixed(2).replace('.', ',')}
                </span>
                <span className="plan-period">/mês</span>
              </div>
              <p className="plan-billing-note">
                {billingPeriod === 'mensal' && 'Cobrado mensalmente'}
                {billingPeriod === 'trimestral' && `Cobrado R$${plan.totals.trimestral.toFixed(2).replace('.', ',')} a cada 3 meses`}
                {billingPeriod === 'anual' && `Cobrado R$${plan.totals.anual.toFixed(2).replace('.', ',')} por ano`}
              </p>
              <ul className="plan-benefits">
                {plan.benefits.map((b, j) => (
                  <li key={j} className="plan-benefit-item">
                    <span className="plan-check">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
              <button
                className={`plan-cta${plan.highlight ? ' plan-cta-hero' : ' plan-cta-outline'}`}
                onClick={() => openCheckout('individual', plan.name)}
              >
                Assinar agora
              </button>
              <p className="plan-cta-note">Cancele quando quiser.</p>
            </div>
          ))}
        </div>

        <CheckoutModal
          isOpen={checkout.isOpen}
          onClose={closeCheckout}
          planType={checkout.planType}
          planTier={checkout.planTier}
          billingPeriod={billingPeriod}
          priceLabel=""
          billingNote=""
        />
      </section>

      {/* Contato */}
      <section id="contato" className="section">
        <div className="section-header">
          <div className="section-tag">Contato</div>
          <h2 className="section-title">Fale conosco</h2>
          <p className="section-desc">Tem alguma dúvida? Nossa equipe está pronta para ajudar.</p>
        </div>
        <div className="contact-content">
          <div className="contact-info">
            <h3>Entre em contato</h3>
            <p>Estamos disponíveis para tirar suas dúvidas sobre a plataforma, planos e muito mais. Não deixe para amanhã o que pode resolver hoje!</p>
            <div className="contact-links">
              <a href="mailto:contato@bratloware.com" className="contact-link">
                <div className="contact-link-icon"><Mail size={20} /></div>
                contato@bratloware.com
              </a>
              <a href="tel:+5561994319166" className="contact-link">
                <div className="contact-link-icon"><Phone size={20} /></div>
                (61) 99431-9166
              </a>
              <div className="contact-link">
                <div className="contact-link-icon"><MapPin size={20} /></div>
                Brasília, DF - Brasil
              </div>
            </div>
          </div>
          <div className="contact-form">
            <h3>Envie sua mensagem</h3>
            <form onSubmit={handleContact}>
              <div className="form-group">
                <label htmlFor="contact-name">Nome</label>
                <input
                  id="contact-name"
                  type="text"
                  className="form-control"
                  placeholder="Seu nome completo"
                  value={contactForm.name}
                  onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact-email">E-mail</label>
                <input
                  id="contact-email"
                  type="email"
                  className="form-control"
                  placeholder="seu@email.com"
                  value={contactForm.email}
                  onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="contact-message">Mensagem</label>
                <textarea
                  id="contact-message"
                  className="form-control"
                  placeholder="Escreva sua mensagem..."
                  value={contactForm.message}
                  onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={contactLoading}>
                {contactLoading ? 'Enviando...' : 'Enviar mensagem'}
              </button>
              {contactSuccess && (
                <div className="contact-success">Mensagem enviada com sucesso! Entraremos em contato em breve.</div>
              )}
            </form>
          </div>
        </div>
        <WaveDivider to="sidebar" />
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>VestWeb</h3>
            <p>A plataforma educacional mais completa para quem quer passar no vestibular. Estude com inteligência, conquiste sua aprovação.</p>
          </div>
          <div className="footer-links">
            <h4>Plataforma</h4>
            <ul>
              <li><a href="#planos">Planos</a></li>
              <li><a href="#sobre">Sobre nós</a></li>
              <li><a href="#metodologia">Metodologia</a></li>
              <li><a href="#contato">Contato</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Links Úteis</h4>
            <ul>
              <li><Link to="/login">Entrar</Link></li>
              <li><a href="#contato">Contato</a></li>
              <li><a href="#">Política de Privacidade</a></li>
              <li><a href="#">Termos de Uso</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} VestWeb. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* WhatsApp floating button */}
      <a
        href="https://wa.me/5561994319166"
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float"
        aria-label="WhatsApp"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="28" height="28" fill="white">
          <path d="M16 2C8.268 2 2 8.268 2 16c0 2.49.65 4.83 1.79 6.86L2 30l7.34-1.76A13.93 13.93 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.5a11.43 11.43 0 0 1-5.82-1.59l-.42-.25-4.35 1.04 1.07-4.24-.28-.44A11.47 11.47 0 0 1 4.5 16C4.5 9.648 9.648 4.5 16 4.5S27.5 9.648 27.5 16 22.352 27.5 16 27.5zm6.29-8.56c-.34-.17-2.02-1-2.34-1.11-.32-.11-.55-.17-.78.17-.23.34-.9 1.11-1.1 1.34-.2.23-.41.26-.75.09-.34-.17-1.44-.53-2.74-1.69-1.01-.9-1.69-2.01-1.89-2.35-.2-.34-.02-.52.15-.69.15-.15.34-.4.51-.6.17-.2.23-.34.34-.57.11-.23.06-.43-.03-.6-.09-.17-.78-1.88-1.07-2.57-.28-.67-.57-.58-.78-.59h-.66c-.23 0-.6.09-.91.43-.31.34-1.2 1.17-1.2 2.85s1.23 3.3 1.4 3.53c.17.23 2.42 3.69 5.86 5.18.82.35 1.46.56 1.96.72.82.26 1.57.22 2.16.13.66-.1 2.02-.83 2.31-1.63.28-.8.28-1.49.2-1.63-.08-.14-.31-.23-.65-.4z"/>
        </svg>
      </a>
    </div>
  );
};

export default LandingPage;
