import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Simulations from '../../pages/Simulations/Simulations';
import simulationsReducer from '../../slices/simulationsSlice';
import api from '../../api/api';

vi.mock('../../components/Sidebar', () => ({ default: () => null }));

vi.mock('../../api/api', () => ({
  default: {
    get:  vi.fn(),
    post: vi.fn(),
    interceptors: {
      request:  { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

const mockApi = api as unknown as {
  get:  ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
};

const makeAlt = (id: number, letter: string, isCorrect: boolean) => ({
  id, question_id: 1, letter, text: `Alt ${letter}`, is_correct: isCorrect, image_url: null,
});

const makeQuestion = (id: number) => ({
  id,
  statement:  `Questao ${id}`,
  difficulty: 'easy',
  subject:    'Matematica',
  subject_id: 1,
  year:       2024,
  image_url:  null,
  alternatives: [
    makeAlt(id * 10 + 1, 'A', false),
    makeAlt(id * 10 + 2, 'B', true),
  ],
});

const makeSim = (id = 1) => ({
  id,
  title:               'Simulado ENEM 2024',
  difficulty:          'medium' as const,
  total_questions:     2,
  time_limit_minutes:  30,
  is_weekly:           false,
  created_at:          '2024-01-01T00:00:00.000Z',
  simulationQuestions: [
    { question: makeQuestion(1) },
    { question: makeQuestion(2) },
  ],
});

const buildStore = () => configureStore({ reducer: { simulations: simulationsReducer } });
const renderPage  = () => render(<Provider store={buildStore()}><Simulations /></Provider>);

function setupListMocks(simOverride?: object) {
  mockApi.get.mockImplementation((url: string) => {
    if (url === '/simulations')         return Promise.resolve({ data: { data: [{ ...makeSim(), ...simOverride }] } });
    if (url === '/simulations/1')       return Promise.resolve({ data: { data: makeSim() } });
    if (url === '/simulations/history') return Promise.resolve({ data: { data: [] } });
    return Promise.resolve({ data: { data: [] } });
  });
  mockApi.post.mockImplementation((url: string) => {
    if (url === '/simulations/1/start')           return Promise.resolve({ data: { data: { id: 42 } } });
    if (url === '/simulations/sessions/42/finish') return Promise.resolve({ data: { data: { score: 100, correct: 2, total: 2 } } });
    if (url === '/questions/answer')              return Promise.resolve({ data: { data: { ok: true } } });
    return Promise.resolve({ data: { data: {} } });
  });
}

describe('Simulations — listagem', () => {
  beforeEach(() => { vi.clearAllMocks(); setupListMocks(); });

  it('exibe simulados disponíveis', async () => {
    renderPage();
    await screen.findByText('Simulado ENEM 2024');
    expect(screen.getByRole('button', { name: /iniciar/i })).toBeInTheDocument();
  });

  it('exibe estado vazio quando não há simulados', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/simulations')         return Promise.resolve({ data: { data: [] } });
      if (url === '/simulations/history') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });
    renderPage();
    await screen.findByText(/nenhum simulado disponivel/i);
  });

  it('exibe erro quando simulado não tem questões', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url === '/simulations')         return Promise.resolve({ data: { data: [makeSim()] } });
      if (url === '/simulations/1')       return Promise.resolve({ data: { data: { ...makeSim(), simulationQuestions: [] } } });
      if (url === '/simulations/history') return Promise.resolve({ data: { data: [] } });
      return Promise.resolve({ data: { data: [] } });
    });
    renderPage();
    await screen.findByText('Simulado ENEM 2024');
    fireEvent.click(screen.getByRole('button', { name: /iniciar/i }));
    await screen.findByText(/nao possui questoes/i);
  });
});

describe('Simulations — execução', () => {
  beforeEach(() => { vi.clearAllMocks(); setupListMocks(); });

  async function startSimulation() {
    renderPage();
    await screen.findByText('Simulado ENEM 2024');
    fireEvent.click(screen.getByRole('button', { name: /iniciar/i }));
    await screen.findByText('Questao 1');
  }

  it('inicia o simulado e exibe a primeira questão', async () => {
    await startSimulation();
    expect(screen.getByText('Questao 1')).toBeInTheDocument();
    expect(mockApi.post).toHaveBeenCalledWith('/simulations/1/start');
  });

  it('seleciona alternativa e registra resposta', async () => {
    await startSimulation();
    fireEvent.click(screen.getByText('Alt B'));

    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith(
      '/questions/answer',
      expect.objectContaining({ question_id: 1, chosen_alternative_id: 12 }),
    ));
  });

  it('navega para a próxima questão', async () => {
    await startSimulation();
    fireEvent.click(screen.getByText('Alt B'));
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/questions/answer', expect.any(Object)));

    fireEvent.click(screen.getByRole('button', { name: /proxima questao/i }));
    await screen.findByText('Questao 2');
  });

  it('exibe resultado ao finalizar', async () => {
    await startSimulation();

    // Responde Q1 e avança
    fireEvent.click(screen.getByText('Alt B'));
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledWith('/questions/answer', expect.any(Object)));
    fireEvent.click(screen.getByRole('button', { name: /proxima questao/i }));

    // Responde Q2 e finaliza
    await screen.findByText('Questao 2');
    fireEvent.click(screen.getByText('Alt B'));
    await waitFor(() => expect(mockApi.post).toHaveBeenCalledTimes(3)); // start + answer1 + answer2
    fireEvent.click(screen.getByRole('button', { name: /finalizar simulado/i }));

    await screen.findByText('Simulado concluido!');
    expect(mockApi.post).toHaveBeenCalledWith('/simulations/sessions/42/finish');
  });
});

describe('Simulations — timer', () => {
  beforeEach(() => { vi.clearAllMocks(); setupListMocks(); });

  it('exibe cronômetro regressivo durante o simulado', async () => {
    renderPage();
    await screen.findByText('Simulado ENEM 2024');
    fireEvent.click(screen.getByRole('button', { name: /iniciar/i }));
    await screen.findByText('Questao 1');
    expect(screen.getByText(/\d{2}:\d{2}:\d{2}/)).toBeInTheDocument();
  });
});
