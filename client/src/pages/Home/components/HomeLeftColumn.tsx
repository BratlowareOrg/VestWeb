import { Link } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Flame,
  HelpCircle,
  Plus,
  Rocket,
  ScrollText,
  Target,
  Trophy,
  Users,
  MonitorPlay,
} from 'lucide-react';
import { onboardingSteps, quickActions } from '../homeConstants';
import { Metrics, ResumeItem, WeekEvent } from '../homeTypes';

interface HomeLeftColumnProps {
  isNewUser: boolean;
  metrics: Metrics;
  metricsLoaded: boolean;
  onToggleWeekEvent: (eventId: number) => void;
  resumeItems: ResumeItem[];
  resumeLoaded: boolean;
  weekDone: number;
  weekEvents: WeekEvent[];
  weekTotal: number;
}

const renderResumeTypeIcon = (type: ResumeItem['type']) => {
  if (type === 'Videoaula') {
    return <MonitorPlay size={20} />;
  }

  if (type === 'Mentoria') {
    return <Users size={20} />;
  }

  return <ScrollText size={20} />;
};

const HomeLeftColumn = ({
  isNewUser,
  metrics,
  metricsLoaded,
  onToggleWeekEvent,
  resumeItems,
  resumeLoaded,
  weekDone,
  weekEvents,
  weekTotal,
}: HomeLeftColumnProps) => (
  <div className="home-left">
    <div className="home-metrics">
      {!metricsLoaded ? (
        [...Array(4)].map((_, index) => (
          <div key={index} className="metric-card metric-card-sk">
            <div className="sk" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="sk" style={{ width: 52, height: 24 }} />
              <div className="sk" style={{ width: 120, height: 13 }} />
            </div>
          </div>
        ))
      ) : (
        <>
          <div className="metric-card">
            <div className="metric-icon metric-icon-blue"><HelpCircle size={22} /></div>
            <div className="metric-info">
              <h3>{metrics.total_answered}</h3>
              <p>Questoes respondidas</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon metric-icon-green"><Target size={22} /></div>
            <div className="metric-info">
              <h3>{metrics.accuracy}%</h3>
              <p>Taxa de acerto</p>
            </div>
            <div className="metric-progress">
              <div className="metric-progress-fill metric-progress-green" style={{ width: `${metrics.accuracy}%` }} />
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon metric-icon-purple"><Trophy size={22} /></div>
            <div className="metric-info">
              <h3>{metrics.rank > 0 ? `#${metrics.rank}` : '--'}</h3>
              <p>Posicao no ranking</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon metric-icon-orange"><Flame size={22} /></div>
            <div className="metric-info">
              <h3>{metrics.streak}</h3>
              <p>Dias seguidos</p>
            </div>
            <div className="metric-progress">
              <div
                className="metric-progress-fill metric-progress-orange"
                style={{ width: `${Math.min(Math.round((metrics.streak / 7) * 100), 100)}%` }}
              />
            </div>
          </div>
        </>
      )}
    </div>

    <div className="home-quick-actions">
      {quickActions.map(({ icon: Icon, label, to }) => (
        <Link key={to} to={to} className="home-quick-btn">
          <Icon size={18} />
          <span>{label}</span>
        </Link>
      ))}
    </div>

    {isNewUser && (
      <div className="home-onboarding">
        <div className="onboarding-heading">
          <Rocket size={20} />
          <div>
            <h2>Bem-vindo ao VestWeb! Por onde comecar?</h2>
            <p>Voce ainda nao tem nenhuma atividade. De o primeiro passo:</p>
          </div>
        </div>
        <div className="onboarding-steps">
          {onboardingSteps.map((step) => (
            <div key={step.title} className="onboarding-step">
              <div className="onboarding-step-icon" style={{ background: `${step.color}18`, color: step.color }}>
                <step.icon size={22} />
              </div>
              <div className="onboarding-step-info">
                <strong>{step.title}</strong>
                <span>{step.desc}</span>
              </div>
              <Link to={step.to} className="onboarding-step-btn" style={{ background: step.color }}>
                {step.btn}
              </Link>
            </div>
          ))}
        </div>
      </div>
    )}

    {!isNewUser && (
      <div className="home-resume">
        <h2 className="home-section-title">Continuar de onde parou</h2>
        {!resumeLoaded ? (
          <div className="resume-list">
            {[...Array(2)].map((_, index) => (
              <div key={index} className="resume-card">
                <div className="sk" style={{ width: 64, height: 48, borderRadius: 8, flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="sk" style={{ width: '30%', height: 11 }} />
                  <div className="sk" style={{ width: '80%', height: 14 }} />
                  <div className="sk" style={{ width: '50%', height: 5, borderRadius: 3 }} />
                </div>
                <div className="sk" style={{ width: 80, height: 32, borderRadius: 20, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        ) : resumeItems.length === 0 ? (
          <div className="home-resume-empty">
            <BookOpen size={28} />
            <p>Nada em andamento ainda.</p>
            <span>Comece um simulado ou videoaula para ver aqui.</span>
          </div>
        ) : (
          <div className="resume-list">
            {resumeItems.map((item) => (
              <div key={item.id} className="resume-card">
                <div
                  className="resume-card-thumb"
                  style={{
                    background: item.thumbnail ? undefined : `${item.color}18`,
                    borderColor: `${item.color}40`,
                  }}
                >
                  {item.thumbnail
                    ? <img src={item.thumbnail} alt={item.title} width={48} height={48} loading="lazy" decoding="async" />
                    : <span style={{ color: item.color }}>{renderResumeTypeIcon(item.type)}</span>}
                </div>
                <div className="resume-card-info">
                  <span className="resume-card-type" style={{ color: item.color }}>{item.type}</span>
                  <span className="resume-card-title">{item.title}</span>
                  <span className="resume-card-subject">{item.subject}</span>
                  {item.type !== 'Mentoria' && (
                    <div className="resume-card-bar-wrap">
                      <div className="resume-card-bar">
                        <div className="resume-card-bar-fill" style={{ width: `${item.progress}%`, background: item.color }} />
                      </div>
                      <span className="resume-card-pct">{item.progress}%</span>
                    </div>
                  )}
                </div>
                <Link to={item.to} className="resume-card-btn" style={{ background: item.color }}>
                  {item.btnLabel}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    <div className="home-weekly-goals">
      <div className="weekly-goals-header">
        <div>
          <h2>Metas da semana</h2>
          <p className="weekly-goals-sub">
            {weekTotal === 0
              ? 'Nenhuma meta cadastrada ainda.'
              : `${weekDone} de ${weekTotal} concluida${weekTotal > 1 ? 's' : ''}`}
          </p>
        </div>
        {weekTotal > 0 && (
          <div className="weekly-progress-ring" title={`${Math.round((weekDone / weekTotal) * 100)}%`}>
            <svg viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3"
                strokeDasharray={`${(weekDone / weekTotal) * 100} 100`}
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
              />
            </svg>
            <span>{Math.round((weekDone / weekTotal) * 100)}%</span>
          </div>
        )}
      </div>

      {weekTotal === 0 ? (
        <div className="weekly-goals-empty">
          <Link to="/classroom/review-calendar" className="weekly-goals-add">
            <Plus size={14} /> Adicionar meta na Sala de Estudos
          </Link>
        </div>
      ) : (
        <ul className="weekly-goals-list weekly-goals-scroll">
          {weekEvents.map((event) => (
            <li
              key={event.id}
              className={`weekly-goal-item${event.done ? ' done' : ''}`}
              onClick={() => onToggleWeekEvent(event.id)}
            >
              {event.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              <div className="weekly-goal-info">
                <span className="weekly-goal-title">{event.title}</span>
                <span className="weekly-goal-meta">
                  {new Date(`${event.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })}
                  {event.start_time && ` · ${event.start_time.slice(0, 5)}`}
                  {' · '}
                  {event.type === 'review' ? 'Revisao' : 'Estudo'}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  </div>
);

export default HomeLeftColumn;
