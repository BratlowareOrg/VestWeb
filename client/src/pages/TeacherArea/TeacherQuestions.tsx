import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, Save, X, Search, ChevronLeft, ChevronRight, ImageIcon } from 'lucide-react';
import TeacherSidebar from '../../components/TeacherSidebar';
import api from '../../api/api';
import './TeacherQuestions.css';

interface Alternative {
  id?: number;
  letter?: string;
  text: string;
  image_url?: string;
  is_correct: boolean;
}

interface Question {
  id: number;
  statement: string;
  image_url: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
  source: string | null;
  year: number | null;
  topic_id?: number;
  subject_id?: number;
  subject?: string;
  alternatives: Alternative[];
}

interface Subject {
  id: number;
  name: string;
}

interface Topic {
  id: number;
  name: string;
  subject_id: number;
  subject_name: string;
}

interface EditRow {
  id: number;
  statement: string;
  image_url: string;
  topic_id: string;
  subject_id: string;
  difficulty: string;
  source: string;
  year: string;
  alternatives: Alternative[];
}

const DIFF_LABEL: Record<string, string> = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' };
const PAGE_SIZE = 30;

const emptyNew = {
  statement: '',
  image_url: '',
  topic_id: '',
  subject_id: '',
  difficulty: 'medium',
  source: '',
  year: '',
  alternatives: [
    { text: '', image_url: '', is_correct: true },
    { text: '', image_url: '', is_correct: false },
    { text: '', image_url: '', is_correct: false },
    { text: '', image_url: '', is_correct: false },
    { text: '', image_url: '', is_correct: false },
  ] as Alternative[],
};

const TeacherQuestions = () => {
  const [questions, setQuestions]     = useState<Question[]>([]);
  const [subjects, setSubjects]       = useState<Subject[]>([]);
  const [topics, setTopics]           = useState<Topic[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterDiff, setFilterDiff]   = useState('');
  const [page, setPage]               = useState(1);
  const [editingRow, setEditingRow]   = useState<EditRow | null>(null);
  const [saving, setSaving]           = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [newForm, setNewForm]         = useState(emptyNew);
  const [newSaving, setNewSaving]     = useState(false);
  const [modifiedIds, setModifiedIds] = useState<Set<number>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const [qRes, sRes, tRes] = await Promise.all([
        api.get('/questions?limit=9999'),
        api.get('/questions/subjects'),
        api.get('/questions/topics'),
      ]);
      setQuestions(qRes.data.data.rows ?? []);
      setSubjects(sRes.data.data ?? []);
      setTopics(tRes.data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => questions.filter(q => {
    const matchSearch = !search || q.statement.toLowerCase().includes(search.toLowerCase());
    const matchSubj   = !filterSubject || String(q.subject_id) === filterSubject;
    const matchDiff   = !filterDiff || q.difficulty === filterDiff;
    return matchSearch && matchSubj && matchDiff;
  }), [questions, search, filterSubject, filterDiff]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const topicsForSubject = (subject_id: string) =>
    subject_id ? topics.filter(t => String(t.subject_id) === subject_id) : topics;

  const startEdit = (q: Question) => {
    setEditingRow({
      id:           q.id,
      statement:    q.statement,
      image_url:    q.image_url ?? '',
      topic_id:     String(q.topic_id ?? ''),
      subject_id:   String(q.subject_id ?? ''),
      difficulty:   q.difficulty,
      source:       q.source ?? '',
      year:         q.year ? String(q.year) : '',
      alternatives: q.alternatives.map(a => ({ ...a })),
    });
  };

  const handleSave = async () => {
    if (!editingRow) return;
    setSaving(true);
    try {
      const res = await api.put(`/questions/${editingRow.id}`, {
        statement:    editingRow.statement,
        image_url:    editingRow.image_url || null,
        topic_id:     Number(editingRow.topic_id),
        difficulty:   editingRow.difficulty,
        source:       editingRow.source || null,
        year:         editingRow.year ? Number(editingRow.year) : null,
        alternatives: editingRow.alternatives.map(a => ({
          id:    a.id,
          text:  a.text,
          image_url: a.image_url || null,
        })),
      });
      const updated: Question = res.data.data;
      setQuestions(prev => prev.map(q => q.id !== editingRow.id ? q : {
        ...q,
        ...updated,
      }));
      setModifiedIds(prev => new Set(prev).add(editingRow.id));
      setEditingRow(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Excluir esta questão permanentemente?')) return;
    await api.delete(`/questions/${id}`);
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleAltChange = (i: number, field: string, value: string | boolean) => {
    setNewForm(prev => {
      const alts = prev.alternatives.map(a => ({ ...a }));
      if (field === 'is_correct') alts.forEach((a, idx) => { a.is_correct = idx === i; });
      else alts[i] = { ...alts[i], [field]: value };
      return { ...prev, alternatives: alts };
    });
  };

  const handleEditAltChange = (i: number, field: 'text' | 'image_url', value: string) => {
    setEditingRow(r => {
      if (!r) return r;
      const alts = r.alternatives.map(a => ({ ...a }));
      alts[i] = { ...alts[i], [field]: value };
      return { ...r, alternatives: alts };
    });
  };

  const handleNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewSaving(true);
    try {
      await api.post('/questions', {
        statement:    newForm.statement,
        image_url:    newForm.image_url || null,
        topic_id:     Number(newForm.topic_id),
        difficulty:   newForm.difficulty,
        source:       newForm.source || null,
        year:         newForm.year ? Number(newForm.year) : null,
        alternatives: newForm.alternatives,
      });
      await load();
      setNewForm(emptyNew);
      setShowNew(false);
    } finally {
      setNewSaving(false);
    }
  };

  return (
    <div className="teacher-layout">
      <TeacherSidebar />
      <main className="teacher-main">
        <div className="tqe-page">

          {/* Header */}
          <div className="tqe-header">
            <div>
              <h1>Banco de Questões</h1>
              <p className="tqe-count">
                {filtered.length} questões
                {questions.length !== filtered.length ? ` (de ${questions.length} total)` : ''}
              </p>
            </div>
            <button className="teacher-btn-primary" onClick={() => setShowNew(v => !v)}>
              <Plus size={16} /> Nova questão
            </button>
          </div>

          {/* Formulário nova questão */}
          {showNew && (
            <form className="tqe-new-form" onSubmit={handleNewSubmit}>
              <h2>Nova questão</h2>

              <div className="tqf-group">
                <label htmlFor="new-question-statement">Enunciado *</label>
                <textarea
                  id="new-question-statement"
                  rows={4}
                  required
                  value={newForm.statement}
                  onChange={e => setNewForm(p => ({ ...p, statement: e.target.value }))}
                  placeholder="Digite o enunciado..."
                />
              </div>

              <div className="tqf-group">
                <label htmlFor="new-question-image-url">Imagem do enunciado (URL)</label>
                <input
                  id="new-question-image-url"
                  type="text"
                  value={newForm.image_url}
                  onChange={e => setNewForm(p => ({ ...p, image_url: e.target.value }))}
                  placeholder="https://..."
                />
                {newForm.image_url && (
                  <img src={newForm.image_url} alt="preview" className="tqf-img-preview" />
                )}
              </div>

              <div className="tqf-row">
                <div className="tqf-group">
                  <label htmlFor="new-question-subject">Mat?ria *</label>
                  <select
                    id="new-question-subject"
                    required
                    value={newForm.subject_id}
                    onChange={e => setNewForm(p => ({ ...p, subject_id: e.target.value, topic_id: '' }))}
                  >
                    <option value="">Selecione...</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="tqf-group">
                  <label htmlFor="new-question-topic">T?pico *</label>
                  <select
                    id="new-question-topic"
                    required
                    value={newForm.topic_id}
                    onChange={e => setNewForm(p => ({ ...p, topic_id: e.target.value }))}
                  >
                    <option value="">Selecione...</option>
                    {topicsForSubject(newForm.subject_id).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="tqf-group">
                  <label htmlFor="new-question-difficulty">Dificuldade *</label>
                  <select
                    id="new-question-difficulty" value={newForm.difficulty} onChange={e => setNewForm(p => ({ ...p, difficulty: e.target.value }))}>
                    <option value="easy">Fácil</option>
                    <option value="medium">Médio</option>
                    <option value="hard">Difícil</option>
                  </select>
                </div>

                <div className="tqf-group">
                  <label htmlFor="new-question-source">Fonte</label>
                  <input id="new-question-source" type="text" value={newForm.source} onChange={e => setNewForm(p => ({ ...p, source: e.target.value }))} placeholder="Ex: ENEM" />
                </div>

                <div className="tqf-group">
                  <label htmlFor="new-question-year">Ano</label>
                  <input id="new-question-year" type="number" value={newForm.year} onChange={e => setNewForm(p => ({ ...p, year: e.target.value }))} placeholder="Ex: 2023" />
                </div>
              </div>

              <div className="tqf-group">
                <label htmlFor="new-question-correct-0">Alternativas (marque a correta) *</label>
                <div className="tqf-alternatives">
                  {newForm.alternatives.map((alt, i) => (
                    <div key={i} className="tqf-alt">
                      <span className="tqf-alt-letter">{String.fromCharCode(65 + i)}</span>
                      <input
                        id={`new-question-correct-${i}`}
                        type="radio"
                        name="correct"
                        checked={alt.is_correct}
                        onChange={() => handleAltChange(i, 'is_correct', true)}
                      />
                      <div className="tqf-alt-fields">
                        <input
                          type="text"
                          value={alt.text}
                          required
                          onChange={e => handleAltChange(i, 'text', e.target.value)}
                          placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}
                        />
                        <input
                          type="text"
                          value={alt.image_url ?? ''}
                          onChange={e => handleAltChange(i, 'image_url', e.target.value)}
                          placeholder="URL da imagem (opcional)"
                          className="tqf-alt-img-input"
                        />
                        {alt.image_url && (
                          <img src={alt.image_url} alt="preview" className="tqf-img-preview tqf-img-preview--sm" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="tqf-actions">
                <button type="button" className="teacher-btn-secondary" onClick={() => { setShowNew(false); setNewForm(emptyNew); }}>
                  Cancelar
                </button>
                <button type="submit" className="teacher-btn-primary" disabled={newSaving}>
                  {newSaving ? 'Salvando...' : 'Criar questão'}
                </button>
              </div>
            </form>
          )}

          {/* Toolbar de filtros */}
          <div className="tqe-toolbar">
            <div className="tqe-search-box">
              <Search size={14} />
              <input
                type="text"
                placeholder="Buscar no enunciado..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <select value={filterSubject} onChange={e => { setFilterSubject(e.target.value); setPage(1); }}>
              <option value="">Todas as matérias</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={filterDiff} onChange={e => { setFilterDiff(e.target.value); setPage(1); }}>
              <option value="">Todas as dificuldades</option>
              <option value="easy">Fácil</option>
              <option value="medium">Médio</option>
              <option value="hard">Difícil</option>
            </select>
          </div>

          {/* Tabela */}
          {loading ? (
            <p className="tqe-loading">Carregando questões...</p>
          ) : (
            <>
              <div className="tqe-table-wrap">
                <table className="tqe-table">
                  <thead>
                    <tr>
                      <th className="tqe-col-id">ID</th>
                      <th className="tqe-col-statement">Enunciado</th>
                      <th className="tqe-col-img">Img</th>
                      <th className="tqe-col-subject">Matéria</th>
                      <th className="tqe-col-diff">Dificuldade</th>
                      <th className="tqe-col-source">Fonte</th>
                      <th className="tqe-col-year">Ano</th>
                      <th className="tqe-col-alts">Alt.</th>
                      <th className="tqe-col-actions">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map(q => {
                      const isEditing = editingRow?.id === q.id;
                      return (
                        <React.Fragment key={q.id}>
                        <tr className={isEditing ? 'tqe-editing' : ''}>

                          {/* ID */}
                          <td className="tqe-col-id tqe-cell-id">
                            {q.id}
                            {modifiedIds.has(q.id) && <span className="tqe-modified-dot" title="Alterada" />}
                          </td>

                          {/* Enunciado */}
                          <td className="tqe-col-statement">
                            {isEditing ? (
                              <div className="tqe-edit-statement">
                                <textarea
                                  className="tqe-input tqe-textarea"
                                  value={editingRow.statement}
                                  rows={3}
                                  onChange={e => setEditingRow(r => r && { ...r, statement: e.target.value })}
                                />
                                <input
                                  className="tqe-input tqe-img-url-input"
                                  value={editingRow.image_url}
                                  onChange={e => setEditingRow(r => r && { ...r, image_url: e.target.value })}
                                  placeholder="URL da imagem do enunciado..."
                                />
                                {editingRow.image_url && (
                                  <img src={editingRow.image_url} alt="preview" className="tqe-img-thumb" />
                                )}
                              </div>
                            ) : (
                              <span className="tqe-truncate" title={q.statement}>
                                {q.statement.replace(/\r?\n/g, ' ').slice(0, 130)}
                                {q.statement.length > 130 ? '…' : ''}
                              </span>
                            )}
                          </td>

                          {/* Imagem */}
                          <td className="tqe-col-img tqe-cell-center">
                            {q.image_url
                              ? <img src={q.image_url} alt="img" className="tqe-img-thumb" />
                              : <span className="tqe-cell-text" style={{ color: 'var(--border)' }}><ImageIcon size={14} /></span>
                            }
                          </td>

                          {/* Matéria */}
                          <td className="tqe-col-subject">
                            {isEditing ? (
                              <select
                                className="tqe-input"
                                value={editingRow.subject_id}
                                onChange={e => setEditingRow(r => r && { ...r, subject_id: e.target.value, topic_id: '' })}
                              >
                                <option value="">Selecione...</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            ) : (
                              <span className="tqe-cell-text">{q.subject ?? '—'}</span>
                            )}
                          </td>

                          {/* Dificuldade */}
                          <td className="tqe-col-diff">
                            {isEditing ? (
                              <select
                                className="tqe-input"
                                value={editingRow.difficulty}
                                onChange={e => setEditingRow(r => r && { ...r, difficulty: e.target.value })}
                              >
                                <option value="easy">Fácil</option>
                                <option value="medium">Médio</option>
                                <option value="hard">Difícil</option>
                              </select>
                            ) : (
                              <span className={`tqe-badge diff-${q.difficulty}`}>{DIFF_LABEL[q.difficulty]}</span>
                            )}
                          </td>

                          {/* Fonte */}
                          <td className="tqe-col-source">
                            {isEditing ? (
                              <input
                                className="tqe-input"
                                value={editingRow.source}
                                onChange={e => setEditingRow(r => r && { ...r, source: e.target.value })}
                              />
                            ) : (
                              <span className="tqe-cell-text">{q.source ?? '—'}</span>
                            )}
                          </td>

                          {/* Ano */}
                          <td className="tqe-col-year">
                            {isEditing ? (
                              <input
                                className="tqe-input"
                                type="number"
                                value={editingRow.year}
                                onChange={e => setEditingRow(r => r && { ...r, year: e.target.value })}
                              />
                            ) : (
                              <span className="tqe-cell-text">{q.year ?? '—'}</span>
                            )}
                          </td>

                          {/* Alternativas count */}
                          <td className="tqe-col-alts tqe-cell-center">
                            {q.alternatives?.length ?? 0}
                          </td>

                          {/* Ações */}
                          <td className="tqe-col-actions">
                            {isEditing ? (
                              <div className="tqe-action-btns">
                                <button className="tqe-icon-btn tqe-btn-save" onClick={handleSave} disabled={saving} title="Salvar">
                                  <Save size={14} />
                                </button>
                                <button className="tqe-icon-btn" onClick={() => setEditingRow(null)} title="Cancelar">
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="tqe-action-btns">
                                <button className="tqe-icon-btn" onClick={() => startEdit(q)} title="Editar">
                                  <Edit2 size={14} />
                                </button>
                                <button className="tqe-icon-btn tqe-btn-delete" onClick={() => handleDelete(q.id)} title="Excluir">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                          {/* Linha extra: tópico e imagens das alternativas no modo edição */}
                          {isEditing && (
                            <tr className="tqe-editing tqe-alt-img-row">
                              <td colSpan={10}>
                                <div className="tqe-alt-imgs">
                                  <div className="tqf-group" style={{ marginBottom: '8px' }}>
                                    <label htmlFor="edit-question-topic">T?pico</label>
                                    <select
                                      id="edit-question-topic"
                                      className="tqe-input"
                                      value={editingRow.topic_id}
                                      onChange={e => setEditingRow(r => r && { ...r, topic_id: e.target.value })}
                                    >
                                      <option value="">Selecione...</option>
                                      {topicsForSubject(editingRow.subject_id).map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <span className="tqe-alt-imgs-label">Imagens das alternativas:</span>
                                  {editingRow.alternatives.map((alt, i) => (
                                    <div key={i} className="tqe-alt-img-item">
                                      <span className="tqf-alt-letter">{String.fromCharCode(65 + i)}</span>
                                      <input
                                        className="tqe-input tqe-img-url-input"
                                        value={alt.image_url ?? ''}
                                        onChange={e => handleEditAltChange(i, 'image_url', e.target.value)}
                                        placeholder="URL da imagem..."
                                      />
                                      {alt.image_url && (
                                        <img src={alt.image_url} alt="preview" className="tqe-img-thumb" />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}

                    {paged.length === 0 && (
                      <tr>
                        <td colSpan={10} className="tqe-empty">Nenhuma questão encontrada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div className="tqe-pagination">
                <button
                  className="tqe-page-btn"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="tqe-page-info">
                  Página {page} de {totalPages} &nbsp;·&nbsp; {filtered.length} questões
                </span>
                <button
                  className="tqe-page-btn"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default TeacherQuestions;
