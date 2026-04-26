import { useState, useEffect } from 'react';
import { Plus, X, Check } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import api from '../../api/api';
import './StudyRoom.css';

interface StudyEvent {
  id: number;
  title: string;
  date: string;
  start_time?: string;
  end_time?: string;
  type: 'review' | 'study_block';
  done: boolean;
  topic?: { id: number; name: string };
}

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 to 21:00

const StudyRoom = () => {
  const [events, setEvents] = useState<StudyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ dayOffset: number; hour: number } | null>(null);
  const [form, setForm] = useState({ title: '', date: '', start_time: '', end_time: '', type: 'study_block', topic_id: '' });

  // Get current week dates
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const loadEvents = async () => {
    try {
      const res = await api.get('/calendar/events');
      setEvents(res.data.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { loadEvents(); }, []);

  const getEventsForCell = (date: Date, hour: number) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => {
      if (e.date !== dateStr) return false;
      if (!e.start_time) return false;
      const startH = parseInt(e.start_time.split(':')[0]);
      return startH === hour;
    });
  };

  const handleCellClick = (dayOffset: number, hour: number) => {
    const d = weekDates[dayOffset];
    const dateStr = d.toISOString().split('T')[0];
    const h = hour.toString().padStart(2, '0');
    setSelectedCell({ dayOffset, hour });
    setForm({ title: '', date: dateStr, start_time: `${h}:00`, end_time: `${(hour + 1).toString().padStart(2, '0')}:00`, type: 'study_block', topic_id: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      await api.post('/calendar/events', form);
      setShowModal(false);
      loadEvents();
    } catch { /* ignore */ }
  };

  const handleToggle = async (eventId: number) => {
    try {
      await api.patch(`/calendar/events/${eventId}/toggle`);
      loadEvents();
    } catch { /* ignore */ }
  };

  const handleDelete = async (eventId: number) => {
    try {
      await api.delete(`/calendar/events/${eventId}`);
      loadEvents();
    } catch { /* ignore */ }
  };

  // All events this week
  const weekEventsAll = events.filter(e => {
    const d = new Date(e.date);
    return d >= weekDates[0] && d <= weekDates[6];
  }).sort((a, b) => (a.date + (a.start_time || '')) > (b.date + (b.start_time || '')) ? 1 : -1);

  if (loading) return (
    <div className="study-room-page">
      <Sidebar />
      <main className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </main>
    </div>
  );

  return (
    <div className="study-room-page">
      <Sidebar />
      <main className="page-content">
        <div className="study-room-header">
          <h1>Sala de Estudos</h1>
          <button className="btn-primary" onClick={() => { setForm({ title: '', date: today.toISOString().split('T')[0], start_time: '', end_time: '', type: 'study_block', topic_id: '' }); setShowModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
            <Plus size={16} />
            Adicionar bloco
          </button>
        </div>

        {/* Week Grid */}
        <div className="week-grid-wrapper" style={{ marginBottom: '32px' }}>
          <div className="week-header">
            <div className="week-header-time">Hora</div>
            {weekDates.map((d, i) => (
              <div key={i} className={`week-header-day${d.toDateString() === today.toDateString() ? ' today' : ''}`}>
                <span>{d.getDate()}</span>
                {DAYS[d.getDay()]}
              </div>
            ))}
          </div>
          <div className="week-body">
            {HOURS.map(hour => (
              <div key={hour} className="time-slot-row">
                <div className="time-label">{hour}:00</div>
                {weekDates.map((d, dayIdx) => {
                  const cellEvents = getEventsForCell(d, hour);
                  return (
                    <div key={dayIdx} className="time-cell" onClick={() => handleCellClick(dayIdx, hour)}>
                      {cellEvents.map(ev => (
                        <div
                          key={ev.id}
                          className={`study-block ${ev.done ? 'done' : 'pending'}`}
                          onClick={e => { e.stopPropagation(); handleToggle(ev.id); }}
                          title={`${ev.title} — clique para marcar como feito`}
                        >
                          {ev.title}
                          {ev.end_time && <span style={{ display: 'block', opacity: 0.7 }}>{ev.start_time} - {ev.end_time}</span>}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Event list */}
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Eventos desta semana</h2>
        {weekEventsAll.length === 0 ? (
          <div className="empty-state">
            <Plus size={40} />
            <h3>Nenhum evento esta semana</h3>
            <p>Clique em um horario do grid ou no botao "Adicionar bloco" para comecar.</p>
          </div>
        ) : (
          <div className="event-list">
            {weekEventsAll.map(ev => (
              <div key={ev.id} className="event-list-item">
                <div className="event-list-time">
                  {ev.start_time ? ev.start_time.slice(0, 5) : '--:--'}
                </div>
                <div className="event-list-info">
                  <div className="event-list-title" style={{ textDecoration: ev.done ? 'line-through' : 'none' }}>{ev.title}</div>
                  <div className="event-list-meta">
                    {new Date(ev.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {ev.end_time && ` · ate ${ev.end_time.slice(0, 5)}`}
                    · {ev.type === 'review' ? 'Revisao' : 'Estudo'}
                  </div>
                </div>
                <div className="event-list-actions">
                  <button className={`event-list-btn ${ev.done ? 'event-list-btn-done' : 'event-list-btn-pending'}`} onClick={() => handleToggle(ev.id)}>
                    {ev.done ? <Check size={14} /> : 'Feito?'}
                  </button>
                  <button style={{ background: '#fee2e2', color: '#dc2626', padding: '6px 10px', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '12px' }} onClick={() => handleDelete(ev.id)}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="study-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="study-modal" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0 }}>Adicionar bloco de estudo</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="form-group">
                <label htmlFor="studyroom-title">Titulo</label>
                <input id="studyroom-title" className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Estudar Biologia" />
              </div>
              <div className="form-group">
                <label htmlFor="studyroom-date">Data</label>
                <input id="studyroom-date" type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="studyroom-start-time">Inicio</label>
                  <input id="studyroom-start-time" type="time" className="form-control" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div className="form-group">
                  <label htmlFor="studyroom-end-time">Fim</label>
                  <input id="studyroom-end-time" type="time" className="form-control" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="studyroom-type">Tipo</label>
                <select id="studyroom-type" className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="study_block">Bloco de estudo</option>
                  <option value="review">Revisao</option>
                </select>
              </div>
              <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button className="modal-cancel" onClick={() => setShowModal(false)} style={{ padding: '10px 24px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                <button onClick={handleSave} style={{ padding: '10px 24px', borderRadius: 'var(--radius)', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Salvar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default StudyRoom;
