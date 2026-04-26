import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Questions from '../../pages/Questions/Questions';
import questionsReducer, { type Question } from '../../slices/questionsSlice';
import api from '../../api/api';

vi.mock('../../components/Sidebar', () => ({
  default: () => null,
}));

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
    { id: id * 10 + 2, question_id: id, letter: 'B', text: `Correta ${id}`, is_correct: true },
  ],
});

const subjects = [{ id: 1, name: 'Biologia', topics: [] }];
const vestibulares = [{ id: 1, name: 'ENEM' }];

const buildStore = () =>
  configureStore({
    reducer: { questions: questionsReducer },
  });

const renderPage = () =>
  render(
    <Provider store={buildStore()}>
      <Questions />
    </Provider>,
  );

describe('Questions page', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockApi.get.mockImplementation((url: string) => {
      if (url === '/questions/subjects') {
        return Promise.resolve({ data: { data: subjects } });
      }
      if (url === '/questions/vestibulares') {
        return Promise.resolve({ data: { data: vestibulares } });
      }
      if (url.startsWith('/questions?')) {
        return Promise.resolve({ data: { data: { rows: [makeQuestion(1, 'Enunciado da questão 1')], count: 1 } } });
      }

      return Promise.resolve({ data: { data: [] } });
    });

    mockApi.post.mockImplementation((url: string) => {
      if (url === '/questions/session') {
        return Promise.resolve({ data: { data: { id: 999 } } });
      }
      if (url === '/questions/answer') {
        return Promise.resolve({ data: { data: { ok: true } } });
      }

      return Promise.resolve({ data: { data: {} } });
    });
  });

  it('deve buscar questões ao aplicar filtros', async () => {
    renderPage();

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '1' } });
    fireEvent.change(selects[1], { target: { value: '1' } });
    fireEvent.change(selects[2], { target: { value: 'medium' } });

    fireEvent.click(screen.getByRole('button', { name: /buscar questões/i }));

    await waitFor(() => {
      expect(mockApi.get).toHaveBeenCalledWith(expect.stringContaining('/questions?'));
    });

    expect(screen.getByText('Enunciado da questão 1')).toBeInTheDocument();
  });

  it('deve confirmar resposta correta e avançar para próxima questão', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/questions/subjects') {
        return Promise.resolve({ data: { data: subjects } });
      }
      if (url === '/questions/vestibulares') {
        return Promise.resolve({ data: { data: vestibulares } });
      }
      if (url.startsWith('/questions?')) {
        return Promise.resolve({
          data: {
            data: {
              rows: [
                makeQuestion(1, 'Enunciado da questão 1'),
                makeQuestion(2, 'Enunciado da questão 2'),
              ],
              count: 2,
            },
          },
        });
      }

      return Promise.resolve({ data: { data: [] } });
    });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /buscar questões/i }));

    await screen.findByText('Enunciado da questão 1');

    fireEvent.click(screen.getByText('Correta 1'));
    fireEvent.click(screen.getByRole('button', { name: /confirmar resposta/i }));

    await screen.findByText(/resposta correta!/i);

    expect(mockApi.post).toHaveBeenCalledWith('/questions/answer', {
      session_id: 999,
      question_id: 1,
      chosen_alternative_id: 12,
    });

    fireEvent.click(screen.getByRole('button', { name: /proxima questao/i }));

    await screen.findByText('Enunciado da questão 2');
  });
});
