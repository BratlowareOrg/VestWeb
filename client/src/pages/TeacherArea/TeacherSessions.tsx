import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';
import TeacherSidebar from '../../components/TeacherSidebar';
import api from '../../api/api';
import './TeacherLayout.css';
import './TeacherSessions.css';

interface Session {
  id: number;
  scheduled_at: string;
  status: 'pending' | 'confirmed' | 'done' | 'cancelled';
  notes: string | null;
  student: {
    id: number;
    name: string;
    avatar_url: string | null;
    enrollment: string;
  };
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  done: 'Realizado',
  cancelled: 'Cancelado',
};

const TeacherSessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const load = async () => {
    try {
      const res = await api.get('/teacher/sessions');
      setSessions(res.data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/teacher/sessions/${id}`, { status });
      setSessions(prev => prev.map(s => s.id === id ? { ...s, status: status as Session['status'] } : s));
    } catch {
      // ignore
    }
  };

  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.status === filter);

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  return (
    <div className="teacher-layout">
      <TeacherSidebar />
      <main className="teacher-main">
        <div className="teacher-sessions">
          <div className="teacher-page-header">
            <h1>Sessões de Mentoria</h1>
            <p>Gerencie as sessões agendadas pelos alunos.</p>
          </div>

          <div className="teacher-filter-tabs">
            {['all', 'pending', 'confirmed', 'done', 'cancelled'].map(f => (
              <button
                key={f}
                className={`teacher-filter-tab${filter === f ? ' active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Todas' : STATUS_LABELS[f]}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="teacher-loading">Carregando...</p>
          ) : filtered.length === 0 ? (
            <div className="teacher-empty">
              <Clock size={40} />
              <p>Nenhuma sessão encontrada.</p>
            </div>
          ) : (
            <div className="teacher-sessions-list">
              {filtered.map(session => (
                <div key={session.id} className="teacher-session-card">
                  <div className="teacher-session-student">
                    <div className="teacher-session-avatar">
                      {session.student.avatar_url
                        ? <img src={session.student.avatar_url} alt={session.student.name} />
                        : getInitials(session.student.name)
                      }
                    </div>
                    <div>
                      <div className="teacher-session-name">{session.student.name}</div>
                      <div className="teacher-session-enrollment">Matrícula: {session.student.enrollment}</div>
                    </div>
                  </div>

                  <div className="teacher-session-info">
                    <div className="teacher-session-date">
                      {new Date(session.scheduled_at).toLocaleString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                    {session.notes && (
                      <div className="teacher-session-notes">{session.notes}</div>
                    )}
                  </div>

                  <div className="teacher-session-actions">
                    <span className={`teacher-session-badge status-${session.status}`}>
                      {STATUS_LABELS[session.status]}
                    </span>

                    {session.status === 'pending' && (
                      <>
                        <button
                          className="teacher-btn teacher-btn-confirm"
                          onClick={() => updateStatus(session.id, 'confirmed')}
                        >
                          <CheckCircle size={15} /> Confirmar
                        </button>
                        <button
                          className="teacher-btn teacher-btn-cancel"
                          onClick={() => updateStatus(session.id, 'cancelled')}
                        >
                          <XCircle size={15} /> Cancelar
                        </button>
                      </>
                    )}

                    {session.status === 'confirmed' && (
                      <button
                        className="teacher-btn teacher-btn-done"
                        onClick={() => updateStatus(session.id, 'done')}
                      >
                        <CheckCircle size={15} /> Marcar como realizada
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TeacherSessions;
