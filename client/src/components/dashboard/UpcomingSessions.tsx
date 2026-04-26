import { memo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, Calendar } from 'lucide-react';
import type { UpcomingSession } from './types';

interface Props {
  upcoming: UpcomingSession[];
  loading: boolean;
}

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

const UpcomingSessions = ({ upcoming, loading }: Props) => (
  <div className="teacher-upcoming">
    <div className="teacher-upcoming-header">
      <div className="teacher-upcoming-title">
        <CalendarDays size={18} />
        <h2>Próximas sessões</h2>
      </div>
      <Link to="/teacher/sessions" className="teacher-upcoming-all">Ver todas</Link>
    </div>

    {loading ? (
      <ul className="teacher-upcoming-list">
        {[...Array(3)].map((_, i) => (
          <li key={i} className="teacher-upcoming-item" style={{ gap: 12, alignItems: 'center' }}>
            <div className="sk" style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="sk" style={{ width: '55%', height: 14 }} />
              <div className="sk" style={{ width: '35%', height: 12 }} />
            </div>
            <div className="sk" style={{ width: 72, height: 24, borderRadius: 12 }} />
          </li>
        ))}
      </ul>
    ) : upcoming.length === 0 ? (
      <div className="teacher-upcoming-empty">
        <CalendarDays size={32} />
        <p>Nenhuma sessão agendada.</p>
        <span>Seus horários disponíveis aparecem para os alunos agendarem.</span>
        <Link to="/teacher/settings" className="teacher-empty-action">
          <Calendar size={14} />
          Configurar horários
        </Link>
      </div>
    ) : (
      <ul className="teacher-upcoming-list">
        {upcoming.map(s => {
          const date = new Date(s.scheduled_at);
          const isToday = date.toDateString() === new Date().toDateString();
          const dayLabel = isToday
            ? 'Hoje'
            : date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
          const timeLabel = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

          return (
            <li key={s.id} className={`teacher-upcoming-item${isToday ? ' today' : ''}`}>
              <div className="teacher-upcoming-avatar">
                {s.student.avatar_url
                  ? <img src={s.student.avatar_url} alt={s.student.name} width={40} height={40} loading="lazy" decoding="async" />
                  : getInitials(s.student.name)
                }
              </div>
              <div className="teacher-upcoming-info">
                <strong>{s.student.name}</strong>
                <span>
                  <Clock size={12} />
                  {dayLabel} às {timeLabel}
                </span>
              </div>
              <span className={`teacher-upcoming-badge ${s.status}`}>
                {s.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
              </span>
              <Link to="/teacher/sessions" className="teacher-upcoming-btn">
                {isToday ? 'Entrar na sala' : 'Ver detalhes'}
              </Link>
            </li>
          );
        })}
      </ul>
    )}
  </div>
);

export default memo(UpcomingSessions);
