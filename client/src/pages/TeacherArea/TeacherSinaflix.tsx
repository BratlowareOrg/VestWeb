import { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Play, Youtube, X } from 'lucide-react';
import TeacherSidebar from '../../components/TeacherSidebar';
import api from '../../api/api';
import './TeacherSinaflix.css';

interface Topic {
  id: number;
  name: string;
  subject: { id: number; name: string };
}

interface Subject {
  id: number;
  name: string;
  topics: { id: number; name: string }[];
}

interface Video {
  id: number;
  title: string;
  description: string | null;
  youtube_url: string;
  thumbnail_url: string | null;
  topic_id: number | null;
  published_at: string | null;
  created_at: string;
  topic?: Topic;
}

const emptyForm = {
  title: '',
  description: '',
  youtube_url: '',
  thumbnail_url: '',
  topic_id: '',
  published_at: '',
};

const getYoutubeId = (url: string | null | undefined) => {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  return match ? match[1] : null;
};

const getThumbnail = (video: Video) => {
  if (video.thumbnail_url) return video.thumbnail_url;
  const id = getYoutubeId(video.youtube_url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
};

const TeacherVestWebFlix = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  const load = async () => {
    try {
      const [vRes, sRes] = await Promise.all([
        api.get('/videos/my'),
        api.get('/questions/subjects'),
      ]);
      setVideos(Array.isArray(vRes.data.data) ? vRes.data.data : []);
      setSubjects(Array.isArray(sRes.data.data) ? sRes.data.data : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const allTopics = subjects.flatMap(s =>
    (s.topics ?? []).map(t => ({ ...t, subjectName: s.name, subjectId: s.id }))
  );

  const filtered = videos.filter(v => {
    const matchSearch = (v.title ?? '').toLowerCase().includes(search.toLowerCase());
    const matchSubject = !filterSubject || v.topic?.subject?.id === Number(filterSubject);
    return matchSearch && matchSubject;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        youtube_url: form.youtube_url,
        thumbnail_url: form.thumbnail_url || null,
        topic_id: form.topic_id ? Number(form.topic_id) : null,
        published_at: form.published_at || null,
      };
      if (editingId) {
        await api.put(`/videos/${editingId}`, payload);
      } else {
        await api.post('/videos', payload);
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (v: Video) => {
    setForm({
      title: v.title,
      description: v.description ?? '',
      youtube_url: v.youtube_url,
      thumbnail_url: v.thumbnail_url ?? '',
      topic_id: v.topic_id ? String(v.topic_id) : '',
      published_at: v.published_at ? v.published_at.slice(0, 10) : '',
    });
    setEditingId(v.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta aula?')) return;
    try {
      await api.delete(`/videos/${id}`);
      setVideos(prev => prev.filter(v => v.id !== id));
    } catch {
      // ignore
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const previewVideoId = form.youtube_url ? getYoutubeId(form.youtube_url) : null;

  return (
    <div className="teacher-layout">
      <TeacherSidebar />
      <main className="teacher-main">
        <div className="teacher-VestWebFlix">

          <div className="teacher-page-header">
            <div>
              <h1>VestWebFlix — Minhas Aulas</h1>
              <p>Adicione, edite e gerencie suas videoaulas.</p>
            </div>
            <button
              className="teacher-btn-primary"
              onClick={() => { cancelForm(); setShowForm(!showForm); }}
            >
              <Plus size={16} /> Nova aula
            </button>
          </div>

          {showForm && (
            <form className="teacher-question-form tsf-form" onSubmit={handleSubmit}>
              <div className="tsf-form-header">
                <h2>{editingId ? 'Editar aula' : 'Nova aula'}</h2>
                <button type="button" className="tsf-close-btn" onClick={cancelForm}>
                  <X size={18} />
                </button>
              </div>

              <div className="tsf-body">
                <div className="tsf-fields">
                  <div className="tqf-group">
                    <label htmlFor="teacher-video-title">T?tulo *</label>
                    <input
                      id="teacher-video-title"
                      type="text"
                      value={form.title}
                      onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="Ex: Introdução às Funções"
                      required
                    />
                  </div>

                  <div className="tqf-group">
                    <label htmlFor="teacher-video-youtube-url">URL do YouTube *</label>
                    <div className="tsf-url-input">
                      <Youtube size={16} className="tsf-url-icon" />
                      <input
                        id="teacher-video-youtube-url"
                        type="url"
                        value={form.youtube_url}
                        onChange={e => setForm(p => ({ ...p, youtube_url: e.target.value }))}
                        placeholder="https://www.youtube.com/watch?v=..."
                        required
                      />
                    </div>
                  </div>

                  <div className="tqf-row tsf-row-3">
                    <div className="tqf-group">
                      <label htmlFor="teacher-video-topic">T?pico</label>
                      <select
                        id="teacher-video-topic"
                        value={form.topic_id}
                        onChange={e => setForm(p => ({ ...p, topic_id: e.target.value }))}
                      >
                        <option value="">Sem tópico</option>
                        {allTopics.map(t => (
                          <option key={t.id} value={t.id}>{t.subjectName} — {t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="tqf-group">
                      <label htmlFor="teacher-video-published-at">Data de publica??o</label>
                      <input
                        id="teacher-video-published-at"
                        type="date"
                        value={form.published_at}
                        onChange={e => setForm(p => ({ ...p, published_at: e.target.value }))}
                      />
                    </div>

                    <div className="tqf-group">
                      <label htmlFor="teacher-video-thumbnail-url">Thumbnail (URL opcional)</label>
                      <input
                        id="teacher-video-thumbnail-url"
                        type="url"
                        value={form.thumbnail_url}
                        onChange={e => setForm(p => ({ ...p, thumbnail_url: e.target.value }))}
                        placeholder="Gerada automaticamente do YouTube"
                      />
                    </div>
                  </div>

                  <div className="tqf-group">
                    <label htmlFor="teacher-video-description">Descri??o</label>
                    <textarea
                      id="teacher-video-description"
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      rows={3}
                      placeholder="Descreva o conteúdo da aula..."
                    />
                  </div>
                </div>

                {previewVideoId && (
                  <div className="tsf-preview">
                    <p className="tsf-preview-label">Pré-visualização</p>
                    <img
                      src={form.thumbnail_url || `https://img.youtube.com/vi/${previewVideoId}/hqdefault.jpg`}
                      alt="Thumbnail"
                      className="tsf-preview-thumb"
                    />
                    <p className="tsf-preview-title">{form.title || 'Título da aula'}</p>
                  </div>
                )}
              </div>

              <div className="tqf-actions">
                <button type="button" className="teacher-btn-secondary" onClick={cancelForm}>
                  Cancelar
                </button>
                <button type="submit" className="teacher-btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Adicionar aula'}
                </button>
              </div>
            </form>
          )}

          <div className="tsf-filters">
            <input
              type="text"
              className="tsf-search"
              placeholder="Buscar aulas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="tsf-filter-select"
              value={filterSubject}
              onChange={e => setFilterSubject(e.target.value)}
            >
              <option value="">Todas as disciplinas</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <p className="teacher-loading">Carregando...</p>
          ) : filtered.length === 0 ? (
            <div className="teacher-empty">
              <Play size={40} strokeWidth={1.5} />
              <p>{videos.length === 0 ? 'Você ainda não adicionou nenhuma aula.' : 'Nenhuma aula encontrada.'}</p>
              {videos.length === 0 && (
                <button className="teacher-btn-primary" onClick={() => setShowForm(true)}>
                  <Plus size={16} /> Adicionar primeira aula
                </button>
              )}
            </div>
          ) : (
            <div className="tsf-grid">
              {filtered.map(v => {
                const thumb = getThumbnail(v);
                const ytId = getYoutubeId(v.youtube_url);
                return (
                  <div key={v.id} className="tsf-card">
                    <div className="tsf-card-thumb" onClick={() => setPreviewId(ytId)}>
                      {thumb ? (
                        <img src={thumb} alt={v.title} />
                      ) : (
                        <div className="tsf-card-thumb-placeholder">
                          <Play size={32} />
                        </div>
                      )}
                      <div className="tsf-card-play-overlay">
                        <Play size={28} fill="white" />
                      </div>
                    </div>
                    <div className="tsf-card-body">
                      <div className="tsf-card-meta">
                        {v.topic && (
                          <span className="tsf-card-subject">{v.topic.subject.name}</span>
                        )}
                        {v.topic && (
                          <span className="tsf-card-topic">{v.topic.name}</span>
                        )}
                      </div>
                      <h3 className="tsf-card-title">{v.title}</h3>
                      {v.description && (
                        <p className="tsf-card-desc">{v.description}</p>
                      )}
                    </div>
                    <div className="tsf-card-actions">
                      <button className="tq-icon-btn" onClick={() => handleEdit(v)} title="Editar">
                        <Edit2 size={15} />
                      </button>
                      <button className="tq-icon-btn tq-icon-delete" onClick={() => handleDelete(v.id)} title="Excluir">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {previewId && (
        <div className="tsf-modal-overlay" onClick={() => setPreviewId(null)}>
          <div className="tsf-modal" onClick={e => e.stopPropagation()}>
            <button className="tsf-modal-close" onClick={() => setPreviewId(null)}>
              <X size={20} />
            </button>
            <div className="tsf-modal-player">
              <iframe
                src={`https://www.youtube.com/embed/${previewId}?autoplay=1`}
                title="Video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherVestWebFlix;
