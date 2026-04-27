import { ReactNode, memo, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Filter, ChevronRight, RotateCcw, PenLine, Trash2 } from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import { fetchQuestions, fetchSubjects, fetchVestibulares, Question, Alternative } from '../../slices/questionsSlice';
import { AppDispatch, RootState } from '../../store/store';
import api from '../../api/api';
import './Questions.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type HighlightRange = { start: number; end: number };

// ─── Pure helpers (outside component — no closures over state) ────────────────

function normalizeHighlightRanges(ranges: HighlightRange[], textLength: number): HighlightRange[] {
  if (!ranges.length || textLength <= 0) return [];

  const normalized = ranges
    .map(r => ({
      start: Math.max(0, Math.min(r.start, textLength)),
      end: Math.max(0, Math.min(r.end, textLength)),
    }))
    .filter(r => r.end > r.start)
    .sort((a, b) => a.start - b.start);

  if (!normalized.length) return [];

  const merged: HighlightRange[] = [{ ...normalized[0] }];
  for (let i = 1; i < normalized.length; i++) {
    const last = merged[merged.length - 1];
    if (normalized[i].start <= last.end) {
      last.end = Math.max(last.end, normalized[i].end);
    } else {
      merged.push({ ...normalized[i] });
    }
  }
  return merged;
}

function getSelectionOffsets(container: HTMLElement, range: Range): HighlightRange | null {
  try {
    const startRange = range.cloneRange();
    startRange.selectNodeContents(container);
    startRange.setEnd(range.startContainer, range.startOffset);

    const endRange = range.cloneRange();
    endRange.selectNodeContents(container);
    endRange.setEnd(range.endContainer, range.endOffset);

    const start = startRange.toString().length;
    const end = endRange.toString().length;

    if (start === end) return null;
    return { start: Math.min(start, end), end: Math.max(start, end) };
  } catch {
    return null;
  }
}

function preprocessStatement(text: string): string {
  text = text.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();

  const words = text.split(' ');
  for (let len = 3; len <= Math.min(12, Math.floor(words.length / 2)); len++) {
    const firstPhrase = words.slice(0, len).join(' ');
    const rest = words.slice(len).join(' ');
    if (rest.startsWith(firstPhrase)) {
      const nextChar = rest[firstPhrase.length];
      if (!nextChar || /[,.\s;!?]/.test(nextChar)) {
        text = rest;
        break;
      }
    }
  }

  text = text.replace(
    /(\.)(\s+)([A-ZÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ]{2,},\s[A-Z]\.)/g,
    '.\n\n$3'
  );

  return text.trim();
}

// ─── useHighlight hook ────────────────────────────────────────────────────────
// Supports both mouse and touch selection with proper cleanup.

function useHighlight(
  enabled: boolean,
  textLength: number,
  onAdd: (range: HighlightRange) => void
) {
  const ref = useRef<HTMLParagraphElement>(null);

  const handleSelection = useCallback(() => {
    if (!enabled || !ref.current || textLength === 0) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const container = ref.current;
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return;

    const offsets = getSelectionOffsets(container, range);
    if (!offsets) return;

    onAdd(offsets);
    selection.removeAllRanges();
  }, [enabled, textLength, onAdd]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('mouseup', handleSelection);
    el.addEventListener('touchend', handleSelection);
    return () => {
      el.removeEventListener('mouseup', handleSelection);
      el.removeEventListener('touchend', handleSelection);
    };
  }, [handleSelection]);

  return ref;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type AlternativeItemProps = {
  alt: Alternative;
  isSelected: boolean;
  answered: boolean;
  onSelect: (alternativeId: number) => void;
};

const AlternativeItem = memo(function AlternativeItem({
  alt,
  isSelected,
  answered,
  onSelect,
}: AlternativeItemProps) {
  let cls = 'alternative-item';
  if (isSelected) cls += ' selected';
  if (answered) {
    cls += ' disabled';
    if (alt.is_correct) cls += ' correct';
    else if (isSelected && !alt.is_correct) cls += ' incorrect';
  }

  return (
    <div className={cls} onClick={() => onSelect(alt.id)}>
      <div className="alternative-letter">{alt.letter}</div>
      <div className="alternative-text">
        {alt.text}
        {alt.image_url && (
          <img
            src={alt.image_url}
            alt={`Alternativa ${alt.letter}`}
            className="alternative-image"
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
    </div>
  );
});

const QuestionSkeleton = () => (
  <div className="question-container question-skeleton" aria-label="Carregando questão">
    <div className="skeleton-bar skeleton-progress" />
    <div className="skeleton-meta">
      <div className="skeleton-tag" />
      <div className="skeleton-tag skeleton-tag-wide" />
      <div className="skeleton-tag" />
    </div>
    <div className="skeleton-toolbar">
      <div className="skeleton-tag skeleton-tag-btn" />
    </div>
    <div className="skeleton-statement">
      <div className="skeleton-line" />
      <div className="skeleton-line" />
      <div className="skeleton-line skeleton-line-medium" />
      <div className="skeleton-line" />
      <div className="skeleton-line skeleton-line-short" />
    </div>
    <div className="skeleton-alternatives">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="skeleton-alternative" />
      ))}
    </div>
    <div className="skeleton-actions">
      <div className="skeleton-btn" />
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

const Questions = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { questions, subjects, vestibulares, loading } = useSelector((state: RootState) => state.questions);

  const [filters, setFilters] = useState({ subject_id: '', difficulty: '', vestibular_id: '', with_image: '' });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAlt, setSelectedAlt] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlights, setHighlights] = useState<HighlightRange[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isFirstRender = useRef(true);

  useEffect(() => {
    dispatch(fetchSubjects());
    dispatch(fetchVestibulares());
  }, [dispatch]);

  useEffect(() => {
    const delay = isFirstRender.current ? 0 : 300;
    isFirstRender.current = false;

    const timer = window.setTimeout(async () => {
      dispatch(fetchQuestions({ ...filters, limit: 200 }));
      setCurrentIndex(0);
      setSelectedAlt(null);
      setAnswered(false);
      setIsCorrect(null);
      setFinished(false);
      setScore({ correct: 0, total: 0 });

      try {
        const res = await api.post('/questions/session');
        setSessionId(res.data.data.id);
      } catch {
        setSessionId(null);
      }
    }, delay);

    return () => window.clearTimeout(timer);
  }, [filters, dispatch]);

  const handleConfirm = async () => {
    if (selectedAlt === null) return;
    const question = questions[currentIndex];
    const chosen = question.alternatives.find(a => a.id === selectedAlt);
    const correct = chosen?.is_correct || false;

    setIsCorrect(correct);
    setAnswered(true);
    setScore(prev => ({ correct: prev.correct + (correct ? 1 : 0), total: prev.total + 1 }));

    if (sessionId) {
      try {
        await api.post('/questions/answer', {
          session_id: sessionId,
          question_id: question.id,
          chosen_alternative_id: selectedAlt,
        });
      } catch { /* ignore */ }
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setSelectedAlt(null);
      setAnswered(false);
      setIsCorrect(null);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAlt(null);
    setAnswered(false);
    setIsCorrect(null);
    setFinished(false);
    setScore({ correct: 0, total: 0 });
  };

  const renderWithHighlights = (text: string, ranges: HighlightRange[]): ReactNode => {
    if (!ranges.length) return text;
    const parts: ReactNode[] = [];
    let pos = 0;
    ranges.forEach(({ start, end }, index) => {
      if (pos < start) parts.push(text.slice(pos, start));
      parts.push(
        <mark key={`highlight-${index}-${start}-${end}`} className="question-highlight">
          {text.slice(start, end)}
        </mark>
      );
      pos = end;
    });
    if (pos < text.length) parts.push(text.slice(pos));
    return parts;
  };

  const question: Question | undefined = questions[currentIndex];

  const processedStatement = useMemo(
    () => (question ? preprocessStatement(question.statement) : ''),
    [question?.id, question?.statement]
  );

  const sortedAlternatives = useMemo(
    () => (question ? [...question.alternatives].sort((a, b) => a.letter.localeCompare(b.letter)) : []),
    [question?.id, question?.alternatives]
  );

  const correctAlternativeLetter = useMemo(
    () => question?.alternatives.find(a => a.is_correct)?.letter ?? '-',
    [question?.id, question?.alternatives]
  );

  const handleSelectAlternative = useCallback((alternativeId: number) => {
    if (answered) return;
    setSelectedAlt(alternativeId);
  }, [answered]);

  const handleAddHighlight = useCallback((range: HighlightRange) => {
    setHighlights(prev => normalizeHighlightRanges([...prev, range], processedStatement.length));
  }, [processedStatement.length]);

  const statementRef = useHighlight(highlightMode, processedStatement.length, handleAddHighlight);

  useEffect(() => {
    setHighlights([]);
  }, [question?.id]);

  const progress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;

  return (
    <div className="questions-page">
      <Sidebar />
      <main className="page-content">
        <h1 className="questions-title">Banco de Questões</h1>

        <button
          className="questions-filter-toggle"
          onClick={() => setFiltersOpen(o => !o)}
          aria-expanded={filtersOpen}
        >
          <Filter size={15} />
          {filtersOpen ? 'Ocultar filtros' : 'Filtros'}
        </button>

        <div className="questions-layout">
          <div className={`questions-filters${filtersOpen ? ' open' : ''}`}>
            <h2><Filter size={16} /> Filtros</h2>

            <div className="form-group">
              <label htmlFor="question-filter-subject">Matéria</label>
              <select
                id="question-filter-subject"
                className="form-control"
                value={filters.subject_id}
                onChange={e => setFilters({ ...filters, subject_id: e.target.value })}
              >
                <option value="">Todas as matérias</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="question-filter-vestibular">Vestibular</label>
              <select
                id="question-filter-vestibular"
                className="form-control"
                value={filters.vestibular_id}
                onChange={e => setFilters({ ...filters, vestibular_id: e.target.value })}
              >
                <option value="">Todos os vestibulares</option>
                {vestibulares.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="question-filter-difficulty">Dificuldade</label>
              <select
                id="question-filter-difficulty"
                className="form-control"
                value={filters.difficulty}
                onChange={e => setFilters({ ...filters, difficulty: e.target.value })}
              >
                <option value="">Todas</option>
                <option value="easy">Fácil</option>
                <option value="medium">Média</option>
                <option value="hard">Difícil</option>
              </select>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <input
                type="checkbox"
                id="with_image"
                checked={filters.with_image === '1'}
                onChange={e => setFilters({ ...filters, with_image: e.target.checked ? '1' : '' })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="with_image" style={{ marginBottom: 0, cursor: 'pointer', fontSize: '14px' }}>
                Só questões com imagem
              </label>
            </div>

            {loading && (
              <p className="filter-searching" aria-live="polite">Buscando...</p>
            )}
            {Object.values(filters).some(v => v !== '') && (
              <button
                className="filter-clear-btn"
                onClick={() => setFilters({ subject_id: '', difficulty: '', vestibular_id: '', with_image: '' })}
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div aria-busy={loading}>
            {loading ? (
              <QuestionSkeleton />
            ) : finished ? (
              <div className="question-container">
                <div className="question-result">
                  <span className="result-score">{Math.round((score.correct / score.total) * 100)}%</span>
                  <h2>Resultado final</h2>
                  <p>{score.correct} de {score.total} questões corretas</p>
                  <button className="btn-primary" onClick={handleRestart} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}>
                    <RotateCcw size={16} />
                    Tentar novamente
                  </button>
                </div>
              </div>
            ) : questions.length === 0 ? (
              <div className="questions-empty">
                <Filter size={48} />
                <h3>Nenhuma questão carregada</h3>
                <p>Use os filtros ao lado para buscar questões e começar a praticar.</p>
              </div>
            ) : question ? (
              <div className="question-container">
                <div className="progress-bar">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>

                <div className="question-meta">
                  {question.subject && (
                    <span className="question-meta-tag question-meta-tag-topic">{question.subject}</span>
                  )}
                  {question.vestibular && (
                    <span className="question-meta-tag question-meta-tag-vestibular">{question.vestibular}</span>
                  )}
                  {question.year && (
                    <span className="question-meta-tag question-meta-tag-year">{question.year}</span>
                  )}
                  <span className={`badge badge-${question.difficulty}`}>
                    {question.difficulty === 'easy' ? 'Fácil' : question.difficulty === 'medium' ? 'Média' : 'Difícil'}
                  </span>
                </div>

                <div className="highlight-toolbar">
                  <button
                    className={`highlight-toggle${highlightMode ? ' active' : ''}`}
                    onClick={() => setHighlightMode(m => !m)}
                    aria-pressed={highlightMode}
                    aria-label={highlightMode ? 'Desativar modo de grifar' : 'Ativar modo de grifar'}
                  >
                    <PenLine size={14} aria-hidden="true" />
                    Grifar
                  </button>
                  {highlights.length > 0 && (
                    <button
                      className="highlight-clear"
                      onClick={() => setHighlights([])}
                      aria-label="Limpar grifos"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>

                <p
                  ref={statementRef}
                  className={`question-statement${highlightMode ? ' highlight-active' : ''}`}
                >
                  {renderWithHighlights(processedStatement, highlights)}
                </p>

                {question.image_url && (
                  <div style={{ marginBottom: '16px' }}>
                    <img
                      src={question.image_url}
                      alt="Imagem da questão"
                      className="question-image"
                      style={{ marginBottom: '4px' }}
                      loading="lazy"
                      decoding="async"
                    />
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'center', margin: 0 }}>
                      [{question.year} — {question.image_url.split('/').pop()}]
                    </p>
                  </div>
                )}

                {answered && (
                  <div className={`question-feedback ${isCorrect ? 'correct' : 'incorrect'}`} role="alert">
                    <strong>{isCorrect ? '✓ Resposta correta!' : '✗ Resposta incorreta!'}</strong>
                    {!isCorrect && (
                      <span>A resposta correta era: {correctAlternativeLetter}</span>
                    )}
                  </div>
                )}

                <div className="alternatives-list">
                  {sortedAlternatives.map((alt: Alternative) => (
                    <AlternativeItem
                      key={alt.id}
                      alt={alt}
                      isSelected={alt.id === selectedAlt}
                      answered={answered}
                      onSelect={handleSelectAlternative}
                    />
                  ))}
                </div>

                <div className="question-actions">
                  {!answered ? (
                    <button
                      className="btn-primary"
                      onClick={handleConfirm}
                      disabled={selectedAlt === null}
                    >
                      Confirmar resposta
                    </button>
                  ) : (
                    <button className="btn-primary" onClick={handleNext} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {currentIndex + 1 >= questions.length ? 'Ver resultado' : 'Próxima questão'}
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Questions;
