import { useEffect, useState } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import api from '../../api/api';
import './Mentoring.css';

interface Mentor {
  id: number;
  student_id: number;
  bio?: string;
  specialties?: string;
  student?: { id: number; name: string; avatar_url?: string; email?: string };
}

interface Session {
  id: number;
  mentor_id: number;
  student_id: number;
  scheduled_at: string;
  status: 'pending' | 'confirmed' | 'done' | 'cancelled';
  notes?: string;
  mentor?: { student?: { name: string; avatar_url?: string } };
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  done: 'Realizado',
  cancelled: 'Cancelado',
};

const Mentoring = () => {
  const [activeTab, setActiveTab] = useState<'mentors' | 'sessions'>('mentors');
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [form, setForm] = useState({ scheduled_at: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [success, setSuccess] = useState(false);

  const loadData = async () => {
    try {
      const [mentorsRes, sessionsRes] = await Promise.all([
        api.get('/mentoring/mentors'),
        api.get('/mentoring/sessions'),
      ]);
      setMentors(mentorsRes.data.data || []);
      setSessions(sessionsRes.data.data || []);
    } catch { /* ignore */ } finally { setPageLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const openBookModal = (mentor: Mentor) => {
    setSelectedMentor(mentor);
    setForm({ scheduled_at: '', notes: '' });
    setSuccess(false);
    setShowModal(true);
  };

  const handleBook = async () => {
    if (!selectedMentor || !form.scheduled_at) return;
    setLoading(true);
    try {
      await api.post('/mentoring/sessions', {
        mentor_id: selectedMentor.id,
        scheduled_at: form.scheduled_at,
        notes: form.notes,
      });
      setSuccess(true);
      loadData();
      setTimeout(() => {
        setShowModal(false);
        setActiveTab('sessions');
      }, 1500);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const getInitials = (name: string) => name ? name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'M';

  if (pageLoading) return (
    <div className="mentoring-page">
      <Sidebar />
      <main className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </main>
    </div>
  );

  return (
    <div className="mentoring-page">
      <Sidebar />
      <main className="page-content">
        <h1 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 800 }}>Mentoria</h1>

        <div className="mentoring-tabs">
          <button className={`mentoring-tab${activeTab === 'mentors' ? ' active' : ''}`} onClick={() => setActiveTab('mentors')}>
            Mentores
          </button>
          <button className={`mentoring-tab${activeTab === 'sessions' ? ' active' : ''}`} onClick={() => setActiveTab('sessions')}>
            Minhas sessoes
          </button>
        </div>

        {activeTab === 'mentors' && (
          mentors.length === 0 ? (
            <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-xl)', padding: '40px', textAlign: 'center', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--text-secondary)' }}>Nenhum mentor disponivel no momento.</p>
            </div>
          ) : (
            <div className="mentors-grid">
              {mentors.map(mentor => (
                <div key={mentor.id} className="mentor-card">
                  <div className="mentor-avatar">
                    {mentor.student?.avatar_url ? (
                      <img src={mentor.student.avatar_url} alt={mentor.student.name} />
                    ) : (
                      getInitials(mentor.student?.name || 'M')
                    )}
                  </div>
                  <div className="mentor-name">{mentor.student?.name || 'Mentor'}</div>
                  {mentor.specialties && (
                    <div className="mentor-specialties">{mentor.specialties}</div>
                  )}
                  {mentor.bio && (
                    <div className="mentor-bio">{mentor.bio}</div>
                  )}
                  <button
                    className="btn-primary"
                    style={{ width: '100%', fontSize: '14px' }}
                    onClick={() => openBookModal(mentor)}
                  >
                    Agendar sessao
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'sessions' && (
          sessions.length === 0 ? (
            <div style={{ background: 'var(--white)', borderRadius: 'var(--radius-xl)', padding: '40px', textAlign: 'center', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
              <Calendar size={40} style={{ color: 'var(--border)', margin: '0 auto 16px' }} />
              <h3 style={{ color: 'var(--text)', marginBottom: '8px' }}>Nenhuma sessao agendada</h3>
              <p style={{ color: 'var(--text-secondary)' }}>Escolha um mentor e agende sua primeira sessao!</p>
            </div>
          ) : (
            <div className="sessions-list">
              {sessions.map(session => (
                <div key={session.id} className="session-card">
                  <div className="session-mentor-avatar">
                    {getInitials(session.mentor?.student?.name || 'M')}
                  </div>
                  <div className="session-info">
                    <div className="session-mentor-name">{session.mentor?.student?.name || 'Mentor'}</div>
                    <div className="session-date">
                      <Calendar size={13} />
                      {new Date(session.scheduled_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      <Clock size={13} style={{ marginLeft: '8px' }} />
                      {new Date(session.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {session.notes && <div className="session-notes">"{session.notes}"</div>}
                  </div>
                  <span className={`status-badge status-${session.status}`}>
                    {STATUS_LABELS[session.status]}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {showModal && selectedMentor && (
          <div className="mentoring-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="mentoring-modal" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h3>Agendar sessao</h3>
                  <p style={{ margin: 0 }}>com {selectedMentor.student?.name}</p>
                </div>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={20} />
                </button>
              </div>

              {success ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '12px' }}>✅</div>
                  <p style={{ color: 'var(--text)', fontWeight: 600 }}>Sessao agendada com sucesso!</p>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="mentoring-scheduled-at">Data e hora</label>
                    <input
                      id="mentoring-scheduled-at"
                      type="datetime-local"
                      className="form-control"
                      value={form.scheduled_at}
                      onChange={e => setForm({ ...form, scheduled_at: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="mentoring-notes">Observacoes (opcional)</label>
                    <textarea
                      id="mentoring-notes"
                      className="form-control"
                      rows={3}
                      value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="Ex: Quero tirar duvidas sobre termodinamica..."
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button className="modal-cancel" onClick={() => setShowModal(false)} style={{ padding: '10px 24px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', fontWeight: 600 }}>
                      Cancelar
                    </button>
                    <button className="btn-primary" onClick={handleBook} disabled={!form.scheduled_at || loading}>
                      {loading ? 'Agendando...' : 'Confirmar agendamento'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Mentoring;
