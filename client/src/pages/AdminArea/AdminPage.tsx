import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard, Users, HelpCircle, Play,
  CalendarCheck, Flag, Trash2, ShieldCheck,
  RefreshCw, Search, ChevronLeft, ChevronRight,
  UserCheck, UserX, BookOpen, Video,
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import TeacherSidebar from '../../components/TeacherSidebar';
import api from '../../api/api';
import { getInitials } from '../../utils/stringUtils';
import './AdminPage.css';

// ── types ──────────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'students' | 'questions' | 'videos' | 'sessions' | 'reports';

interface Stats {
  totalStudents: number; totalTeachers: number; totalAdmins: number;
  totalQuestions: number; totalVideos: number; totalSessions: number;
  totalPosts: number; totalReports: number; totalSubscriptions: number;
  totalSimulations: number;
}

interface StudentRow {
  id: number; name: string; email: string; enrollment: string;
  role: 'student' | 'teacher' | 'admin'; avatar_url: string | null; created_at: string;
}

interface QuestionRow {
  id: number; statement: string; difficulty: string; source: string | null;
  year: number | null; bank: string | null;
  topic: { name: string; subject: { name: string } } | null;
  alternatives: { letter: string; text: string; is_correct: boolean }[];
}

interface VideoRow {
  id: number; title: string; description: string | null; youtube_url: string;
  thumbnail_url: string | null; published_at: string | null;
  topic: { name: string; subject: { name: string } } | null;
  creator: { id: number; name: string; avatar_url: string | null } | null;
}

interface SessionRow {
  id: number; status: string; scheduled_at: string; notes: string | null;
  student: { id: number; name: string; email: string; enrollment: string; avatar_url: string | null } | null;
}

interface ReportRow {
  id: number;
  post: {
    id: number; content: string; created_at: string;
    student: { id: number; name: string; avatar_url: string | null } | null;
    likes: { id: number }[];
  } | null;
  student: { id: number; name: string; avatar_url: string | null } | null;
}

interface Meta { total: number; page: number; pages: number; limit: number }

// ── small helpers ──────────────────────────────────────────────────────────────
const ROLE_LABEL: Record<string, string> = { student: 'Aluno', teacher: 'Professor', admin: 'Admin' };
const STATUS_LABEL: Record<string, string> = { pending: 'Pendente', confirmed: 'Confirmado', done: 'Realizado', cancelled: 'Cancelado' };
const DIFF_LABEL: Record<string, string> = { easy: 'Fácil', medium: 'Médio', hard: 'Difícil' };

const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDt = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function Avatar({ src, name, size = 32 }: { src: string | null; name: string; size?: number }) {
  return src
    ? <img src={src} alt={name} className="adm-avatar" style={{ width: size, height: size }} />
    : <div className="adm-avatar adm-avatar--initials" style={{ width: size, height: size, fontSize: size * 0.38 }}>{getInitials(name)}</div>;
}

function Pagination({ meta, onPage }: { meta: Meta; onPage: (p: number) => void }) {
  if (meta.pages <= 1) return null;
  return (
    <div className="adm-pagination">
      <button disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}><ChevronLeft size={16} /></button>
      <span>{meta.page} / {meta.pages}</span>
      <button disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}><ChevronRight size={16} /></button>
    </div>
  );
}

// ── stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="adm-stat-card" style={{ '--accent': color } as any}>
      <div className="adm-stat-icon"><Icon size={22} /></div>
      <div className="adm-stat-info">
        <span className="adm-stat-value">{value.toLocaleString('pt-BR')}</span>
        <span className="adm-stat-label">{label}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
export default function AdminPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [tab, setTab] = useState<Tab>('overview');

  // overview
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // students
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [studentMeta, setStudentMeta] = useState<Meta>({ total: 0, page: 1, pages: 1, limit: 30 });
  const [studentSearch, setStudentSearch] = useState('');
  const [studentRole, setStudentRole] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);

  // questions
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [questionMeta, setQuestionMeta] = useState<Meta>({ total: 0, page: 1, pages: 1, limit: 30 });
  const [questionSearch, setQuestionSearch] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);

  // videos
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [videoMeta, setVideoMeta] = useState<Meta>({ total: 0, page: 1, pages: 1, limit: 30 });
  const [videoSearch, setVideoSearch] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);

  // sessions
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionMeta, setSessionMeta] = useState<Meta>({ total: 0, page: 1, pages: 1, limit: 30 });
  const [sessionStatus, setSessionStatus] = useState('');
  const [sessionLoading, setSessionLoading] = useState(false);

  // reports
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  // ── loaders ────────────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try { const r = await api.get('/admin/stats'); setStats(r.data.data); } catch {}
    setStatsLoading(false);
  }, []);

  const loadStudents = useCallback(async (page = 1) => {
    setStudentLoading(true);
    try {
      const r = await api.get('/admin/students', { params: { search: studentSearch, role: studentRole, page, limit: 30 } });
      setStudents(r.data.data);
      setStudentMeta(r.data.meta);
    } catch {}
    setStudentLoading(false);
  }, [studentSearch, studentRole]);

  const loadQuestions = useCallback(async (page = 1) => {
    setQuestionLoading(true);
    try {
      const r = await api.get('/admin/questions', { params: { search: questionSearch, page, limit: 30 } });
      setQuestions(r.data.data);
      setQuestionMeta(r.data.meta);
    } catch {}
    setQuestionLoading(false);
  }, [questionSearch]);

  const loadVideos = useCallback(async (page = 1) => {
    setVideoLoading(true);
    try {
      const r = await api.get('/admin/videos', { params: { search: videoSearch, page, limit: 30 } });
      setVideos(r.data.data);
      setVideoMeta(r.data.meta);
    } catch {}
    setVideoLoading(false);
  }, [videoSearch]);

  const loadSessions = useCallback(async (page = 1) => {
    setSessionLoading(true);
    try {
      const r = await api.get('/admin/sessions', { params: { status: sessionStatus, page, limit: 30 } });
      setSessions(r.data.data);
      setSessionMeta(r.data.meta);
    } catch {}
    setSessionLoading(false);
  }, [sessionStatus]);

  const loadReports = useCallback(async () => {
    setReportLoading(true);
    try { const r = await api.get('/admin/reports'); setReports(r.data.data); } catch {}
    setReportLoading(false);
  }, []);

  // ── effects by tab ─────────────────────────────────────────────────────────
  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 'students') loadStudents(1); }, [tab, loadStudents]);
  useEffect(() => { if (tab === 'questions') loadQuestions(1); }, [tab, loadQuestions]);
  useEffect(() => { if (tab === 'videos') loadVideos(1); }, [tab, loadVideos]);
  useEffect(() => { if (tab === 'sessions') loadSessions(1); }, [tab, loadSessions]);
  useEffect(() => { if (tab === 'reports') loadReports(); }, [tab, loadReports]);

  // ── actions ────────────────────────────────────────────────────────────────
  const changeRole = async (id: number, role: string) => {
    await api.put(`/admin/students/${id}`, { role });
    setStudents(prev => prev.map(s => s.id === id ? { ...s, role: role as any } : s));
  };

  const removeStudent = async (id: number) => {
    if (!confirm('Deletar este usuário? Esta ação é irreversível.')) return;
    await api.delete(`/admin/students/${id}`);
    setStudents(prev => prev.filter(s => s.id !== id));
    setStudentMeta(m => ({ ...m, total: m.total - 1 }));
  };

  const removeQuestion = async (id: number) => {
    if (!confirm('Deletar esta questão?')) return;
    await api.delete(`/admin/questions/${id}`);
    setQuestions(prev => prev.filter(q => q.id !== id));
    setQuestionMeta(m => ({ ...m, total: m.total - 1 }));
  };

  const removeVideo = async (id: number) => {
    if (!confirm('Deletar este vídeo?')) return;
    await api.delete(`/admin/videos/${id}`);
    setVideos(prev => prev.filter(v => v.id !== id));
    setVideoMeta(m => ({ ...m, total: m.total - 1 }));
  };

  const removePost = async (postId: number, reportId: number) => {
    if (!confirm('Deletar o post reportado?')) return;
    await api.delete(`/admin/posts/${postId}`);
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

  const dismissRpt = async (id: number) => {
    await api.delete(`/admin/reports/${id}`);
    setReports(prev => prev.filter(r => r.id !== id));
  };

  // ── tabs config ────────────────────────────────────────────────────────────
  const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: 'overview',   label: 'Visão Geral',  icon: LayoutDashboard },
    { key: 'students',   label: 'Alunos',       icon: Users,         badge: stats?.totalStudents },
    { key: 'questions',  label: 'Questões',     icon: HelpCircle,    badge: stats?.totalQuestions },
    { key: 'videos',     label: 'Vídeos',       icon: Play,          badge: stats?.totalVideos },
    { key: 'sessions',   label: 'Sessões',      icon: CalendarCheck, badge: stats?.totalSessions },
    { key: 'reports',    label: 'Moderação',    icon: Flag,          badge: stats?.totalReports },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="teacher-layout">
      <TeacherSidebar />
      <main className="teacher-main">
        <div className="adm-page">
          {/* header */}
          <div className="adm-header">
            <div className="adm-header-left">
              <ShieldCheck size={28} />
              <div>
                <h1>Painel Administrativo</h1>
                <p>Bem-vindo, {user?.name?.split(' ')[0]}. Controle total da plataforma.</p>
              </div>
            </div>
            <button className="adm-refresh-btn" onClick={loadStats} title="Atualizar estatísticas">
              <RefreshCw size={16} />
            </button>
          </div>

          {/* tabs */}
          <div className="adm-tabs">
            {tabs.map(t => (
              <button
                key={t.key}
                className={`adm-tab${tab === t.key ? ' adm-tab--active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <t.icon size={16} />
                <span>{t.label}</span>
                {t.badge !== undefined && t.badge > 0 && (
                  <span className={`adm-tab-badge${t.key === 'reports' && t.badge > 0 ? ' adm-tab-badge--danger' : ''}`}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW ────────────────────────────────────────────────── */}
          {tab === 'overview' && (
            <div className="adm-section">
              {statsLoading ? (
                <div className="adm-loading">Carregando estatísticas...</div>
              ) : stats ? (
                <>
                  <div className="adm-stats-grid">
                    <StatCard label="Alunos"        value={stats.totalStudents}     icon={Users}        color="#6366f1" />
                    <StatCard label="Professores"   value={stats.totalTeachers}     icon={UserCheck}    color="#10b981" />
                    <StatCard label="Admins"        value={stats.totalAdmins}       icon={ShieldCheck}  color="#f59e0b" />
                    <StatCard label="Questões"      value={stats.totalQuestions}    icon={HelpCircle}   color="#3b82f6" />
                    <StatCard label="Videoaulas"    value={stats.totalVideos}       icon={Video}        color="#8b5cf6" />
                    <StatCard label="Simulados"     value={stats.totalSimulations}  icon={BookOpen}     color="#06b6d4" />
                    <StatCard label="Sessões"       value={stats.totalSessions}     icon={CalendarCheck} color="#ec4899" />
                    <StatCard label="Posts"         value={stats.totalPosts}        icon={Users}        color="#14b8a6" />
                    <StatCard label="Reports"       value={stats.totalReports}      icon={Flag}         color="#ef4444" />
                    <StatCard label="Assinaturas"   value={stats.totalSubscriptions} icon={UserX}       color="#f97316" />
                  </div>

                  <div className="adm-overview-shortcuts">
                    <h2>Ações Rápidas</h2>
                    <div className="adm-shortcuts-grid">
                      {[
                        { label: 'Gerenciar Alunos',   desc: `${stats.totalStudents} usuários cadastrados`,    tab: 'students'  as Tab, icon: Users,        color: '#6366f1' },
                        { label: 'Banco de Questões',  desc: `${stats.totalQuestions} questões no banco`,      tab: 'questions' as Tab, icon: HelpCircle,   color: '#3b82f6' },
                        { label: 'Videoaulas',         desc: `${stats.totalVideos} vídeos publicados`,         tab: 'videos'    as Tab, icon: Play,         color: '#8b5cf6' },
                        { label: 'Sessões de Mentoria',desc: `${stats.totalSessions} sessões registradas`,     tab: 'sessions'  as Tab, icon: CalendarCheck, color: '#ec4899' },
                        { label: 'Moderação',          desc: `${stats.totalReports} reports pendentes`,        tab: 'reports'   as Tab, icon: Flag,         color: '#ef4444' },
                      ].map(s => (
                        <button key={s.tab} className="adm-shortcut-card" onClick={() => setTab(s.tab)} style={{ '--sc-color': s.color } as any}>
                          <s.icon size={20} />
                          <div>
                            <strong>{s.label}</strong>
                            <span>{s.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* ── STUDENTS ────────────────────────────────────────────────── */}
          {tab === 'students' && (
            <div className="adm-section">
              <div className="adm-toolbar">
                <div className="adm-search-wrap">
                  <Search size={15} />
                  <input
                    placeholder="Buscar por nome, email ou matrícula..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadStudents(1)}
                  />
                </div>
                <select value={studentRole} onChange={e => { setStudentRole(e.target.value); }}>
                  <option value="">Todos os roles</option>
                  <option value="student">Aluno</option>
                  <option value="teacher">Professor</option>
                  <option value="admin">Admin</option>
                </select>
                <button className="adm-btn adm-btn--primary" onClick={() => loadStudents(1)}>Buscar</button>
              </div>

              <div className="adm-count">Total: <strong>{studentMeta.total}</strong> usuários</div>

              {studentLoading ? <div className="adm-loading">Carregando...</div> : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Usuário</th>
                        <th>Matrícula</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Cadastro</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(s => (
                        <tr key={s.id}>
                          <td>
                            <div className="adm-user-cell">
                              <Avatar src={s.avatar_url} name={s.name} size={32} />
                              <span>{s.name}</span>
                            </div>
                          </td>
                          <td><code>{s.enrollment}</code></td>
                          <td>{s.email}</td>
                          <td>
                            <select
                              className={`adm-role-select adm-role-select--${s.role}`}
                              value={s.role}
                              onChange={e => changeRole(s.id, e.target.value)}
                            >
                              <option value="student">Aluno</option>
                              <option value="teacher">Professor</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td>{fmt(s.created_at)}</td>
                          <td>
                            <button className="adm-icon-btn adm-icon-btn--danger" onClick={() => removeStudent(s.id)} title="Deletar usuário">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {students.length === 0 && (
                        <tr><td colSpan={6} className="adm-empty">Nenhum usuário encontrado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination meta={studentMeta} onPage={loadStudents} />
            </div>
          )}

          {/* ── QUESTIONS ───────────────────────────────────────────────── */}
          {tab === 'questions' && (
            <div className="adm-section">
              <div className="adm-toolbar">
                <div className="adm-search-wrap">
                  <Search size={15} />
                  <input
                    placeholder="Buscar no enunciado..."
                    value={questionSearch}
                    onChange={e => setQuestionSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadQuestions(1)}
                  />
                </div>
                <button className="adm-btn adm-btn--primary" onClick={() => loadQuestions(1)}>Buscar</button>
              </div>

              <div className="adm-count">Total: <strong>{questionMeta.total}</strong> questões</div>

              {questionLoading ? <div className="adm-loading">Carregando...</div> : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Enunciado</th>
                        <th>Matéria</th>
                        <th>Dificuldade</th>
                        <th>Fonte</th>
                        <th>Ano</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {questions.map(q => (
                        <tr key={q.id}>
                          <td>{q.id}</td>
                          <td className="adm-statement">{q.statement.slice(0, 100)}{q.statement.length > 100 ? '…' : ''}</td>
                          <td>{q.topic?.subject?.name ?? '—'}</td>
                          <td><span className={`adm-diff adm-diff--${q.difficulty}`}>{DIFF_LABEL[q.difficulty] ?? q.difficulty}</span></td>
                          <td>{q.source ?? '—'}</td>
                          <td>{q.year ?? '—'}</td>
                          <td>
                            <button className="adm-icon-btn adm-icon-btn--danger" onClick={() => removeQuestion(q.id)} title="Deletar questão">
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {questions.length === 0 && (
                        <tr><td colSpan={7} className="adm-empty">Nenhuma questão encontrada.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination meta={questionMeta} onPage={loadQuestions} />
            </div>
          )}

          {/* ── VIDEOS ──────────────────────────────────────────────────── */}
          {tab === 'videos' && (
            <div className="adm-section">
              <div className="adm-toolbar">
                <div className="adm-search-wrap">
                  <Search size={15} />
                  <input
                    placeholder="Buscar por título..."
                    value={videoSearch}
                    onChange={e => setVideoSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && loadVideos(1)}
                  />
                </div>
                <button className="adm-btn adm-btn--primary" onClick={() => loadVideos(1)}>Buscar</button>
              </div>

              <div className="adm-count">Total: <strong>{videoMeta.total}</strong> vídeos</div>

              {videoLoading ? <div className="adm-loading">Carregando...</div> : (
                <div className="adm-videos-grid">
                  {videos.map(v => {
                    const ytId = v.youtube_url.match(/embed\/([^?]+)/)?.[1] ?? '';
                    const thumb = v.thumbnail_url || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                    return (
                      <div key={v.id} className="adm-video-card">
                        <div className="adm-video-thumb">
                          <img src={thumb} alt={v.title} loading="lazy" />
                          <a href={`https://youtu.be/${ytId}`} target="_blank" rel="noreferrer" className="adm-video-play"><Play size={20} /></a>
                        </div>
                        <div className="adm-video-info">
                          <strong>{v.title}</strong>
                          <span>{v.topic?.subject?.name ?? ''} {v.topic ? `· ${v.topic.name}` : ''}</span>
                          {v.creator && (
                            <div className="adm-video-creator">
                              <Avatar src={v.creator.avatar_url} name={v.creator.name} size={20} />
                              <span>{v.creator.name}</span>
                            </div>
                          )}
                        </div>
                        <button className="adm-icon-btn adm-icon-btn--danger adm-video-del" onClick={() => removeVideo(v.id)} title="Deletar vídeo">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                  {videos.length === 0 && <div className="adm-empty">Nenhum vídeo encontrado.</div>}
                </div>
              )}
              <Pagination meta={videoMeta} onPage={loadVideos} />
            </div>
          )}

          {/* ── SESSIONS ────────────────────────────────────────────────── */}
          {tab === 'sessions' && (
            <div className="adm-section">
              <div className="adm-toolbar">
                <select value={sessionStatus} onChange={e => setSessionStatus(e.target.value)}>
                  <option value="">Todos os status</option>
                  <option value="pending">Pendente</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="done">Realizado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
                <button className="adm-btn adm-btn--primary" onClick={() => loadSessions(1)}>Filtrar</button>
              </div>

              <div className="adm-count">Total: <strong>{sessionMeta.total}</strong> sessões</div>

              {sessionLoading ? <div className="adm-loading">Carregando...</div> : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Aluno</th>
                        <th>Matrícula</th>
                        <th>Data Agendada</th>
                        <th>Status</th>
                        <th>Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(s => (
                        <tr key={s.id}>
                          <td>{s.id}</td>
                          <td>
                            {s.student ? (
                              <div className="adm-user-cell">
                                <Avatar src={s.student.avatar_url} name={s.student.name} size={28} />
                                <span>{s.student.name}</span>
                              </div>
                            ) : '—'}
                          </td>
                          <td><code>{s.student?.enrollment ?? '—'}</code></td>
                          <td>{fmtDt(s.scheduled_at)}</td>
                          <td><span className={`adm-status adm-status--${s.status}`}>{STATUS_LABEL[s.status] ?? s.status}</span></td>
                          <td className="adm-notes">{s.notes ?? '—'}</td>
                        </tr>
                      ))}
                      {sessions.length === 0 && (
                        <tr><td colSpan={6} className="adm-empty">Nenhuma sessão encontrada.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination meta={sessionMeta} onPage={loadSessions} />
            </div>
          )}

          {/* ── REPORTS ─────────────────────────────────────────────────── */}
          {tab === 'reports' && (
            <div className="adm-section">
              <div className="adm-count">
                {reportLoading ? 'Carregando...' : <><strong>{reports.length}</strong> reports pendentes</>}
              </div>

              {!reportLoading && reports.length === 0 && (
                <div className="adm-empty adm-empty--block">Nenhum report pendente. Tudo limpo! ✅</div>
              )}

              <div className="adm-reports-list">
                {reports.map(r => (
                  <div key={r.id} className="adm-report-card">
                    <div className="adm-report-post">
                      <div className="adm-report-post-header">
                        {r.post?.student && (
                          <div className="adm-user-cell">
                            <Avatar src={r.post.student.avatar_url} name={r.post.student.name} size={28} />
                            <strong>{r.post.student.name}</strong>
                          </div>
                        )}
                        <span className="adm-report-date">{r.post?.created_at ? fmt(r.post.created_at) : ''}</span>
                      </div>
                      <p className="adm-report-content">{r.post?.content ?? '—'}</p>
                      <div className="adm-report-meta">
                        <span>{r.post?.likes?.length ?? 0} curtidas</span>
                      </div>
                    </div>

                    <div className="adm-report-info">
                      <div className="adm-report-by">
                        <Flag size={13} />
                        Reportado por{' '}
                        {r.student ? (
                          <span className="adm-user-cell adm-user-cell--inline">
                            <Avatar src={r.student.avatar_url} name={r.student.name} size={18} />
                            {r.student.name}
                          </span>
                        ) : 'anônimo'}
                      </div>
                      <div className="adm-report-actions">
                        <button className="adm-btn adm-btn--danger" onClick={() => r.post && removePost(r.post.id, r.id)}>
                          <Trash2 size={14} /> Deletar post
                        </button>
                        <button className="adm-btn adm-btn--ghost" onClick={() => dismissRpt(r.id)}>
                          Ignorar report
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
