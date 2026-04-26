import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import api from '../../api/api';
import './ReviewCalendar.css';

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

const MONTHS = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

const ReviewCalendar = () => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState<StudyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editEvent, setEditEvent] = useState<StudyEvent | null>(null);
    const [form, setForm] = useState({ title: '', date: '', start_time: '', end_time: '', type: 'study_block', topic_id: '' });

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/calendar/events?month=${currentMonth}&year=${currentYear}`);
      setEvents(res.data.data || []);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { loadEvents(); }, [currentMonth, currentYear]);

  const prevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  // Build calendar days
  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ date: new Date(currentYear, currentMonth - 2, daysInPrevMonth - i), isCurrentMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ date: new Date(currentYear, currentMonth - 1, i), isCurrentMonth: true });
  }
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({ date: new Date(currentYear, currentMonth, i), isCurrentMonth: false });
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr);
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const openCreateModal = (date: Date) => {
    setEditEvent(null);
    setForm({ title: '', date: date.toISOString().split('T')[0], start_time: '', end_time: '', type: 'study_block', topic_id: '' });
    setShowModal(true);
  };

  const openEditModal = (e: React.MouseEvent, event: StudyEvent) => {
    e.stopPropagation();
    setEditEvent(event);
    setForm({ title: event.title, date: event.date, start_time: event.start_time || '', end_time: event.end_time || '', type: event.type, topic_id: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return alert('Titulo e data são obrigatórios');
    try {
      if (editEvent) {
        await api.put(`/calendar/events/${editEvent.id}`, form);
      } else {
        await api.post('/calendar/events', form);
      }
      setShowModal(false);
      loadEvents();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao salvar evento');
    }
  };

  const handleDelete = async () => {
    if (!editEvent) return;
    try {
      await api.delete(`/calendar/events/${editEvent.id}`);
      setShowModal(false);
      loadEvents();
    } catch { /* ignore */ }
  };

  const handleToggleDone = async (e: React.MouseEvent, event: StudyEvent) => {
    e.stopPropagation();
    try {
      await api.patch(`/calendar/events/${event.id}/toggle`);
      loadEvents();
    } catch { /* ignore */ }
  };

  if (loading) return (
    <div className="calendar-page">
      <Sidebar />
      <main className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </main>
    </div>
  );

  return (
    <div className="calendar-page">
      <Sidebar />
      <main className="page-content">
        <div className="calendar-header-row">
          <h1>Calendario de Revisao</h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="calendar-nav">
              <button type="button" onClick={prevMonth} aria-label="Mes anterior"><ChevronLeft size={18} aria-hidden="true" /></button>
              <span className="calendar-month-label">{MONTHS[currentMonth - 1]} {currentYear}</span>
              <button type="button" onClick={nextMonth} aria-label="Proximo mes"><ChevronRight size={18} aria-hidden="true" /></button>
            </div>
            <button type="button" className="btn-primary" onClick={() => openCreateModal(today)} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <Plus size={16} />
              Criar evento
            </button>
          </div>
        </div>

        <div className="calendar-grid-wrapper">
          <div className="calendar-weekdays">
            {WEEKDAYS.map(d => <div key={d} className="calendar-weekday">{d}</div>)}
          </div>
          <div className="calendar-days">
            {calendarDays.map((day, i) => {
              const dayEvents = getEventsForDate(day.date);
              return (
                <div
                  key={i}
                  className={`calendar-day${!day.isCurrentMonth ? ' other-month' : ''}${isToday(day.date) ? ' today' : ''}`}
                  onClick={() => day.isCurrentMonth && openCreateModal(day.date)}
                >
                  <div className="calendar-day-num">{day.date.getDate()}</div>
                  <div className="calendar-events">
                    {dayEvents.slice(0, 3).map(ev => (
                      <div
                        key={ev.id}
                        className={`calendar-event-badge${ev.done ? ' event-done' : ` event-${ev.type}`}`}
                        onClick={e => openEditModal(e, ev)}
                        onContextMenu={e => { e.preventDefault(); handleToggleDone(e, ev); }}
                        title={`${ev.title} — clique para editar, clique direito para marcar como feito`}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', paddingLeft: '6px' }}>
                        +{dayEvents.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <div style={{ width: '12px', height: '12px', background: 'var(--primary-light)', borderRadius: '3px' }} />
            Bloco de estudo
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <div style={{ width: '12px', height: '12px', background: '#dbeafe', borderRadius: '3px' }} />
            Revisao
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            <div style={{ width: '12px', height: '12px', background: '#d1fae5', borderRadius: '3px' }} />
            Concluido
          </div>
        </div>

        {showModal && (
          <div className="calendar-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="calendar-modal" onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0 }}>{editEvent ? 'Editar evento' : 'Criar evento'}</h3>
                <button type="button" onClick={() => setShowModal(false)} aria-label="Fechar modal" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="form-group">
                <label htmlFor="event-title">Titulo</label>
                <input id="event-title" className="form-control" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Revisao de Biologia" required />
              </div>
              <div className="form-group">
                <label htmlFor="event-date">Data</label>
                <input id="event-date" type="date" className="form-control" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="event-start-time">Hora inicio</label>
                  <input id="event-start-time" type="time" className="form-control" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div className="form-group">
                  <label htmlFor="event-end-time">Hora fim</label>
                  <input id="event-end-time" type="time" className="form-control" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="event-type">Tipo</label>
                <select id="event-type" className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="study_block">Bloco de estudo</option>
                  <option value="review">Revisao</option>
                </select>
              </div>

              <div className="modal-actions">
                {editEvent && (
                  <button className="modal-delete" onClick={handleDelete}>Excluir</button>
                )}
                <button className="modal-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                <button className="modal-save" onClick={handleSave}>Salvar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ReviewCalendar;
