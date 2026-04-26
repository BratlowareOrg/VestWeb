import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Questions from '../../pages/Questions/Questions';
import questionsReducer, { type Question } from '../../slices/questionsSlice';
import api from '../../api/api';

vi.mock('../../components/Sidebar', () => ({ default: () => null }));

vi.mock('../../api/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

const mockApi = api as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

const makeQuestion = (id: number, statement: string): Question => ({
  id,
  statement,
  difficulty: 'medium',
  subject: 'Biologia',
  subject_id: 1,
  vestibular: 'ENEM',
  vestibular_id: 1,
  year: 2024,
  alternatives: [
    { id: id * 10 + 1, question_id: id, letter: 'A', text: `Incorreta ${id}`, is_correct: false },
    { id: id * 10 + 2, question_id: id, letter: 'B', text: `Correta ${id}`,   is_correct: true  },
  ],
});

const subjects     = [{ id: 1, name: 'Biologia', topics: [] }];
const vestibulares = [{ id: 1, name: 'ENEM' }];

const buildStore = () => configureStore({ reducer: { questions: questionsReducer } });
const renderPage  = () => render(<Provider store={buildStore()}><Questions /></Provider>);

function setupMocks(extraQuestions: Question[] = []) {
  mockApi.get.mockImplementation((url: string) => {
    if (url === '/questions/subjects')    return Promise.resolve({ data: { data: subjects } });
    if (url === '/questions/vestibulares') return Promise.resolve({ data: { data: vestibulares } });
    if (url.startsWith('/questions?'))    return Promise.resolve({
      data: { data: { rows: [makeQuestion(1, 'Enunciado da questão 1'), ...extraQuestions], count: 1 + extraQuestions.length } },
    });
    return Promise.resolve({ data: { data: [] } });
  });
  mockApi.post.mockImplementation((url: string) => {
    if (url === '/questions/session') return Promise.resolve({ data: { data: { id: 999 } } });
    if (url === '/questions/answer')  return Promise.resolve({ data: { data: { ok: true } } });
    return Promise.resolve({ data: { data: {} } });
  });
}

describe('Questions page — carregamento automático', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks(); });

  it('carrega questões automaticamente ao montar sem precisar clicar em botão', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/questions?'));
    });
    expect(screen.getByText('Enunciado da questão 1')).toBeInTheDocument();
  });

  it('não exibe botão "Buscar questões"', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: /buscar questões/i })).toBeNull();
  });
});

describe('Questions page — debounce de filtros', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks(); });

  it('dispara nova busca ao mudar filtro', async () => {
    renderPage();
    await screen.findByText('Enunciado da questão 1');

    const questionsCalls = () =>
      mockApi.get.mock.calls.filter((c: string[]) => c[0].startsWith('/questions?')).length;

    const callsAfterMount = questionsCalls();

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '1' } });

    await waitFor(() => expect(questionsCalls()).toBeGreaterThan(callsAfterMount), { timeout: 1000 });
  });

  it('inclui o filtro selecionado na nova busca', async () => {
    renderPage();
    await screen.findByText('Enunciado da questão 1');

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[2], { target: { value: 'easy' } });

    await waitFor(() => {
      const calls = mockApi.get.mock.calls.filter((c: string[]) =>
        c[0].startsWith('/questions?') && c[0].includes('difficulty=easy')
      );
      expect(calls.length).toBeGreaterThan(0);
    }, { timeout: 1000 });
  });
});

describe('Questions page — fluxo de resposta', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks([makeQuestion(2, 'Enunciado da questão 2')]); });

  it('confirma resposta correta e exibe feedback', async () => {
    renderPage();
    await screen.findByText('Enunciado da questão 1');

    fireEvent.click(screen.getByText('Correta 1'));
    fireEvent.click(screen.getByRole('button', { name: /confirmar resposta/i }));

    await screen.findByText(/resposta correta/i);
    expect(mockApi.post).toHaveBeenCalledWith('/questions/answer', {
      session_id: 999,
      question_id: 1,
      chosen_alternative_id: 12,
    });
  });

  it('avança para a próxima questão após confirmar', async () => {
    renderPage();
    await screen.findByText('Enunciado da questão 1');

    fireEvent.click(screen.getByText('Correta 1'));
    fireEvent.click(screen.getByRole('button', { name: /confirmar resposta/i }));
    await screen.findByText(/resposta correta/i);

    fireEvent.click(screen.getByRole('button', { name: /próxima questão/i }));
    await screen.findByText('Enunciado da questão 2');
  });

  it('exibe resultado final ao terminar todas as questões', async () => {
    renderPage();
    await screen.findByText('Enunciado da questão 1');

    // Responde Q1
    fireEvent.click(screen.getByText('Correta 1'));
    fireEvent.click(screen.getByRole('button', { name: /confirmar resposta/i }));
    await screen.findByText(/resposta correta/i);
    fireEvent.click(screen.getByRole('button', { name: /próxima questão/i }));

    // Responde Q2
    await screen.findByText('Enunciado da questão 2');
    fireEvent.click(screen.getByText('Correta 2'));
    fireEvent.click(screen.getByRole('button', { name: /confirmar resposta/i }));
    await screen.findByText(/resposta correta/i);
    fireEvent.click(screen.getByRole('button', { name: /ver resultado/i }));

    await screen.findByText('Resultado final');
    expect(screen.getByText('2 de 2 questões corretas')).toBeInTheDocument();
  });
});

describe('Questions page — limpar filtros', () => {
  beforeEach(() => { vi.clearAllMocks(); setupMocks(); });

  it('exibe botão Limpar filtros ao aplicar algum filtro', async () => {
    renderPage();
    await screen.findByText('Enunciado da questão 1');

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[2], { target: { value: 'easy' } });

    expect(screen.getByRole('button', { name: /limpar filtros/i })).toBeInTheDocument();
  });

  it('oculta botão Limpar filtros ao limpar', async () => {
    renderPage();
    await screen.findByText('Enunciado da questão 1');

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[2], { target: { value: 'easy' } });

    fireEvent.click(screen.getByRole('button', { name: /limpar filtros/i }));
    expect(screen.queryByRole('button', { name: /limpar filtros/i })).toBeNull();
  });
});
