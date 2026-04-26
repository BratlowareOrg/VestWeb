import { memo } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Users, Star, PlayCircle, Video, Clock } from 'lucide-react';
import type { InsightsData, ActivityEvent, InsightPeriod } from './types';

const PERIODS: { value: InsightPeriod; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d',    label: '7 dias' },
  { value: '30d',   label: '30 dias' },
];

const periodLabel: Record<InsightPeriod, string> = {
  today: 'hoje',
  '7d':  'últimos 7 dias',
  '30d': 'últimos 30 dias',
};

interface Props {
  insights: InsightsData | null;
  activity: ActivityEvent[];
  loading: boolean;
  insightsLoading?: boolean;
  period: InsightPeriod;
  onPeriodChange: (p: InsightPeriod) => void;
}

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h atrás`;
  return `${Math.floor(hrs / 24)}d atrás`;
};

const ImpactMetrics = ({ insights, activity, loading, insightsLoading, period, onPeriodChange }: Props) => (
  <div className="teacher-dashboard-right">

    {/* ── Impact cards ── */}
    <div className="teacher-insights">
      <div className="teacher-insights-header">
        <h2>Impacto</h2>
        <div className="teacher-period-pills">
          {PERIODS.map(p => (
            <button
              key={p.value}
              className={`teacher-period-pill${period === p.value ? ' active' : ''}`}
              onClick={() => onPeriodChange(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className={`teacher-insights-cards${insightsLoading ? ' insights-refreshing' : ''}`}>
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="teacher-insight-card">
              <div className="sk" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="sk" style={{ width: 48, height: 24 }} />
                <div className="sk" style={{ width: 120, height: 13 }} />
              </div>
            </div>
          ))
        ) : (
          <>
            <div className={`teacher-insight-card insight-red${(insights?.pendingDoubts ?? 0) > 0 ? ' has-alert' : ''}`}>
              {(insights?.pendingDoubts ?? 0) > 0 && <span className="insight-pulse-dot" />}
              <div className="teacher-insight-icon"><AlertCircle size={22} /></div>
              <div className="teacher-insight-body">
                <span className="teacher-insight-number">{insights?.pendingDoubts ?? '--'}</span>
                <span className="teacher-insight-label">Dúvidas pendentes</span>
                <span className="teacher-insight-sublabel">total acumulado</span>
              </div>
            </div>
            <div className="teacher-insight-card insight-blue">
              <div className="teacher-insight-icon"><Users size={22} /></div>
              <div className="teacher-insight-body">
                <span className="teacher-insight-number">{insights?.activeStudents ?? '--'}</span>
                <span className="teacher-insight-label">Alunos ativos</span>
                <span className="teacher-insight-sublabel">{periodLabel[period]}</span>
              </div>
            </div>
            <div className="teacher-insight-card insight-yellow">
              <div className="teacher-insight-icon"><Star size={22} /></div>
              <div className="teacher-insight-body">
                <span className="teacher-insight-number">
                  {insights?.avgRating ?? '--'}
                  {insights?.avgRating && <small>/5</small>}
                </span>
                <span className="teacher-insight-label">Avaliação média</span>
                <span className="teacher-insight-sublabel">
                  {insights?.ratingCount ? `${insights.ratingCount} sessões · ` : ''}{periodLabel[period]}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>

    {/* ── Content widget ── */}
    <div className="teacher-content-widget">
      <div className="teacher-content-header">
        <div className="teacher-upcoming-title">
          <PlayCircle size={18} />
          <h2>Gestão de Conteúdo</h2>
        </div>
        <Link to="/teacher/VestWebFlix" className="teacher-upcoming-all">Gerenciar</Link>
      </div>

      {loading ? (
        <div className="teacher-content-counters">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="teacher-content-counter">
              <div className="sk" style={{ width: 40, height: 28, marginBottom: 6 }} />
              <div className="sk" style={{ width: 64, height: 12 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="teacher-content-counters">
            <div className="teacher-content-counter">
              <span className="tcounter-num">{insights?.videoStats.total ?? '--'}</span>
              <span className="tcounter-label">Total</span>
            </div>
            <div className="teacher-content-counter counter-green">
              <span className="tcounter-num">{insights?.videoStats.published ?? '--'}</span>
              <span className="tcounter-label">Disponíveis</span>
            </div>
            <div className="teacher-content-counter counter-orange">
              <span className="tcounter-num">{insights?.videoStats.scheduled ?? '--'}</span>
              <span className="tcounter-label">Agendadas</span>
            </div>
            <div className="teacher-content-counter counter-gray">
              <span className="tcounter-num">{insights?.videoStats.draft ?? '--'}</span>
              <span className="tcounter-label">Rascunhos</span>
            </div>
          </div>

          {insights?.videoStats.recent && insights.videoStats.recent.length > 0 && (
            <ul className="teacher-content-list">
              {insights.videoStats.recent.map(v => {
                const statusLabel = v.status === 'published' ? 'Disponível'
                  : v.status === 'scheduled'
                    ? `Agendada · ${new Date(v.published_at!).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`
                    : 'Rascunho';
                return (
                  <li key={v.id} className="teacher-content-item">
                    <div className="teacher-content-thumb">
                      {v.thumbnail_url
                        ? <img src={v.thumbnail_url} alt={v.title} width={48} height={27} loading="lazy" decoding="async" />
                        : <Video size={16} />
                      }
                    </div>
                    <span className="teacher-content-title">{v.title}</span>
                    <span className={`teacher-content-badge status-${v.status}`}>{statusLabel}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>

    {/* ── Activity feed ── */}
    <div className="teacher-activity">
      <div className="teacher-upcoming-header">
        <div className="teacher-upcoming-title">
          <Clock size={18} />
          <h2>Atividade recente</h2>
        </div>
      </div>

      {loading ? (
        <ul className="teacher-activity-list">
          {[...Array(4)].map((_, i) => (
            <li key={i} className="teacher-activity-item">
              <div className="sk" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="sk" style={{ width: '70%', height: 13 }} />
                <div className="sk" style={{ width: '30%', height: 11 }} />
              </div>
            </li>
          ))}
        </ul>
      ) : activity.length === 0 ? (
        <div className="teacher-upcoming-empty">
          <Users size={32} />
          <p>Nenhuma atividade ainda.</p>
          <span>Publique uma aula para começar a receber engajamento.</span>
          <Link to="/teacher/VestWebFlix" className="teacher-empty-action">
            <Video size={14} />
            Publicar aula
          </Link>
        </div>
      ) : (
        <ul className="teacher-activity-list">
          {activity.map((event, i) => {
            const firstName = event.student.name.split(' ')[0];
            let text = '';
            if (event.type === 'session') {
              const d = new Date(event.meta.scheduled_at!);
              const isToday = d.toDateString() === new Date().toDateString();
              const isTomorrow = d.toDateString() === new Date(Date.now() + 86400000).toDateString();
              const when = isToday ? 'para hoje'
                : isTomorrow ? 'para amanhã'
                : `para ${d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`;
              text = `agendou uma mentoria ${when}`;
            } else if (event.type === 'view') {
              text = `assistiu "${event.meta.videoTitle}"`;
            } else {
              text = 'comentou em uma publicação sua';
            }

            return (
              <li key={i} className="teacher-activity-item">
                <div className="teacher-upcoming-avatar">
                  {event.student.avatar_url
                    ? <img src={event.student.avatar_url} alt={event.student.name} />
                    : getInitials(event.student.name)
                  }
                </div>
                <div className="teacher-activity-text">
                  <span><strong>{firstName}</strong> {text}</span>
                  <time>{timeAgo(event.date)}</time>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>

  </div>
);

export default memo(ImpactMetrics);
