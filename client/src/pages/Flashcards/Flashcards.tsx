import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Layers, ChevronLeft, ChevronRight, RotateCcw, Check, X, Shuffle } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import { fetchQuestions, fetchSubjects, Question } from '../../slices/questionsSlice';
import { AppDispatch, RootState } from '../../store/store';
import './Flashcards.css';

interface FlashCard {
  id: number;
  front: string;
  back: string;
  subject: string;
  topic: string;
  subtopic?: string;
  difficulty: string;
}

const SKIP_PATTERN = /assinale|marque|indique|qual (das|a) alternativa|escolha a (alternativa|opção)/i;

const buildCards = (questions: Question[]): FlashCard[] =>
  questions
    .filter(q => q.alternatives && q.alternatives.length > 0 && !SKIP_PATTERN.test(q.statement))
    .map(q => {
      const correct = q.alternatives.find(a => a.is_correct);
      return {
        id: q.id,
        front: q.statement,
        back: correct ? correct.text : '—',
        subject: q.topic?.subject?.name ?? '',
        topic: q.topic?.name ?? '',
        subtopic: q.subtopic?.name,
        difficulty: q.difficulty,
      };
    });

const shuffle = <T,>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);

type Status = 'know' | 'dontknow' | 'pending';

const Flashcards = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { questions, subjects, loading } = useSelector((state: RootState) => state.questions);

  const [filters, setFilters] = useState({ subject_id: '', topic_id: '' });
  const [deck, setDeck] = useState<FlashCard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [statuses, setStatuses] = useState<Record<number, Status>>({});
  const [started, setStarted] = useState(false);
  const [animDir, setAnimDir] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    dispatch(fetchSubjects());
  }, [dispatch]);

  useEffect(() => {
    if (questions.length > 0 && started) {
      const cards = buildCards(questions);
      setDeck(cards);
      setIndex(0);
      setFlipped(false);
      setStatuses({});
    }
  }, [questions]);

  const topicsForSubject = subjects.find(s => s.id === parseInt(filters.subject_id))?.topics || [];

  const handleStart = () => {
    dispatch(fetchQuestions(filters));
    setStarted(true);
  };

  const handleReset = () => {
    setDeck(d => shuffle(d));
    setIndex(0);
    setFlipped(false);
    setStatuses({});
  };

  const goTo = (dir: 'left' | 'right') => {
    setAnimDir(dir);
    setTimeout(() => {
      setIndex(prev => {
        if (dir === 'right') return Math.min(prev + 1, deck.length - 1);
        return Math.max(prev - 1, 0);
      });
      setFlipped(false);
      setAnimDir(null);
    }, 200);
  };

  const markCard = (status: 'know' | 'dontknow') => {
    const card = deck[index];
    setStatuses(prev => ({ ...prev, [card.id]: status }));
    if (index < deck.length - 1) goTo('right');
  };

  const known = Object.values(statuses).filter(s => s === 'know').length;
  const unknown = Object.values(statuses).filter(s => s === 'dontknow').length;
  const reviewed = known + unknown;
  const progress = deck.length > 0 ? (reviewed / deck.length) * 100 : 0;
  const card = deck[index];
  const allDone = deck.length > 0 && reviewed === deck.length;

  const diffLabel = (d: string) =>
    d === 'easy' ? 'Fácil' : d === 'medium' ? 'Média' : 'Difícil';

  if (!started) {
    return (
      <div className="fc-page">
        <Sidebar />
        <main className="page-content">
          <h1 className="fc-title"><Layers size={24} /> Flashcards</h1>
          <div className="fc-setup-card">
            <div className="fc-setup-icon">🃏</div>
            <h2>Crie seu baralho de estudo</h2>
            <p>Escolha uma matéria e tópico para gerar flashcards a partir do banco de questões.</p>

            <div className="fc-setup-filters">
              <div className="form-group">
                <label htmlFor="flashcards-subject-filter">Mat?ria</label>
                <select
                  id="flashcards-subject-filter"
                  className="form-control"
                  value={filters.subject_id}
                  onChange={e => setFilters({ subject_id: e.target.value, topic_id: '' })}
                >
                  <option value="">Todas as matérias</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {filters.subject_id && (
                <div className="form-group">
                  <label htmlFor="flashcards-topic-filter">T?pico</label>
                  <select
                    id="flashcards-topic-filter"
                    className="form-control"
                    value={filters.topic_id}
                    onChange={e => setFilters(f => ({ ...f, topic_id: e.target.value }))}
                  >
                    <option value="">Todos os tópicos</option>
                    {topicsForSubject.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <button className="fc-start-btn" onClick={handleStart} disabled={loading}>
              {loading ? 'Carregando...' : 'Começar sessão'}
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (deck.length === 0 && !loading) {
    return (
      <div className="fc-page">
        <Sidebar />
        <main className="page-content">
          <h1 className="fc-title"><Layers size={24} /> Flashcards</h1>
          <div className="fc-setup-card">
            <div className="fc-setup-icon">😕</div>
            <h2>Nenhuma questão encontrada</h2>
            <p>Tente outros filtros para montar seu baralho.</p>
            <button className="fc-start-btn" onClick={() => setStarted(false)}>Voltar aos filtros</button>
          </div>
        </main>
      </div>
    );
  }

  if (allDone) {
    const pct = Math.round((known / deck.length) * 100);
    return (
      <div className="fc-page">
        <Sidebar />
        <main className="page-content">
          <h1 className="fc-title"><Layers size={24} /> Flashcards</h1>
          <div className="fc-result-card">
            <div className="fc-result-emoji">{pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'}</div>
            <h2>Sessão concluída!</h2>
            <div className="fc-result-score">{pct}%</div>
            <p className="fc-result-sub">de acerto</p>

            <div className="fc-result-stats">
              <div className="fc-stat fc-stat-know">
                <Check size={20} />
                <span>{known} sabia</span>
              </div>
              <div className="fc-stat fc-stat-dontknow">
                <X size={20} />
                <span>{unknown} não sabia</span>
              </div>
            </div>

            <div className="fc-result-actions">
              <button className="fc-start-btn" onClick={handleReset}>
                <Shuffle size={16} /> Embaralhar e repetir
              </button>
              <button className="fc-ghost-btn" onClick={() => setStarted(false)}>
                Mudar filtros
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="fc-page">
      <Sidebar />
      <main className="page-content">
        <div className="fc-header">
          <h1 className="fc-title"><Layers size={24} /> Flashcards</h1>
          <div className="fc-header-actions">
            <button className="fc-ghost-btn fc-ghost-btn-sm" onClick={handleReset}>
              <Shuffle size={15} /> Embaralhar
            </button>
            <button className="fc-ghost-btn fc-ghost-btn-sm" onClick={() => setStarted(false)}>
              <RotateCcw size={15} /> Novo baralho
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="fc-progress-bar-wrap">
          <div className="fc-progress-labels">
            <span>{index + 1} / {deck.length}</span>
            <span>{reviewed} revisados</span>
          </div>
          <div className="fc-progress-track">
            <div
              className="fc-progress-know"
              style={{ width: `${(known / deck.length) * 100}%` }}
            />
            <div
              className="fc-progress-dontknow"
              style={{ width: `${(unknown / deck.length) * 100}%`, left: `${(known / deck.length) * 100}%` }}
            />
          </div>
          <div className="fc-progress-legend">
            <span className="fc-legend-know"><span />Sabia ({known})</span>
            <span className="fc-legend-dontknow"><span />Não sabia ({unknown})</span>
          </div>
        </div>

        {/* Card */}
        {card && (
          <div className={`fc-scene${animDir ? ` fc-slide-${animDir}` : ''}`}>
            <div
              className={`fc-card${flipped ? ' fc-card--flipped' : ''}`}
              onClick={() => setFlipped(f => !f)}
            >
              {/* Front */}
              <div className="fc-card-face fc-card-front">
                <div className="fc-card-tags">
                  {card.subject && <span className="fc-tag fc-tag-subject">{card.subject}</span>}
                  {card.topic && <span className="fc-tag fc-tag-topic">{card.topic}</span>}
                  {card.subtopic && <span className="fc-tag fc-tag-subtopic">{card.subtopic}</span>}
                  <span className={`fc-tag fc-tag-diff fc-tag-diff--${card.difficulty}`}>
                    {diffLabel(card.difficulty)}
                  </span>
                </div>
                <div className="fc-card-body">
                  <p className="fc-card-statement">{card.front}</p>
                </div>
                <div className="fc-card-hint">
                  <span>Clique para revelar a resposta</span>
                </div>
              </div>

              {/* Back */}
              <div className="fc-card-face fc-card-back">
                <div className="fc-card-back-label">Resposta</div>
                <div className="fc-card-body">
                  <p className="fc-card-answer">{card.back}</p>
                </div>
                <div className="fc-card-hint">
                  <span>Use os botões abaixo para avaliar</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="fc-controls">
          <button
            className="fc-nav-btn"
            onClick={() => goTo('left')}
            disabled={index === 0}
            aria-label="Anterior"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="fc-action-btns">
            <button
              className="fc-action-btn fc-action-btn--dontknow"
              onClick={() => markCard('dontknow')}
              disabled={!flipped}
            >
              <X size={18} /> Não sabia
            </button>
            <button
              className="fc-flip-btn"
              onClick={() => setFlipped(f => !f)}
            >
              {flipped ? 'Ver frente' : 'Virar card'}
            </button>
            <button
              className="fc-action-btn fc-action-btn--know"
              onClick={() => markCard('know')}
              disabled={!flipped}
            >
              <Check size={18} /> Sabia!
            </button>
          </div>

          <button
            className="fc-nav-btn"
            onClick={() => goTo('right')}
            disabled={index === deck.length - 1}
            aria-label="Próximo"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Dot indicators */}
        <div className="fc-dots">
          {deck.map((c, i) => {
            const s = statuses[c.id];
            return (
              <button
                key={c.id}
                className={`fc-dot${i === index ? ' fc-dot--active' : ''}${s === 'know' ? ' fc-dot--know' : s === 'dontknow' ? ' fc-dot--dontknow' : ''}`}
                onClick={() => { setIndex(i); setFlipped(false); }}
                aria-label={`Card ${i + 1}`}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Flashcards;
