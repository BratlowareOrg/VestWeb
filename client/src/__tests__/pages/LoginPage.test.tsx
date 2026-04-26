import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../slices/authSlice';
import questionsReducer from '../../slices/questionsSlice';
import simulationsReducer from '../../slices/simulationsSlice';
import videosReducer from '../../slices/videosSlice';
import communityReducer from '../../slices/communitySlice';
import LoginPage from '../../pages/LoginPage/LoginPage';

// ── Mock react-router-dom navigate ────────────────────────────────────────────
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// ── Mock api ──────────────────────────────────────────────────────────────────
vi.mock('../../api/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

import api from '../../api/api';
const mockApi = api as { post: ReturnType<typeof vi.fn> };

// ── Helpers ───────────────────────────────────────────────────────────────────
const buildStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      questions: questionsReducer,
      simulations: simulationsReducer,
      videos: videosReducer,
      community: communityReducer,
    },
  });

const renderLoginPage = () =>
  render(
    <Provider store={buildStore()}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </Provider>,
  );

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  it('should render the login form', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/matricula/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Senha', { exact: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('should show "Entrando..." on the submit button while loading', async () => {
    // Never resolve to keep loading state
    mockApi.post.mockReturnValue(new Promise(() => {}));
    renderLoginPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/matricula/i), 'ANA001');
    await user.type(screen.getByLabelText('Senha', { exact: true }), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /entrando/i })).toBeDisabled(),
    );
  });

  it('should display an error message when login fails', async () => {
    mockApi.post.mockRejectedValue({
      response: { data: { message: 'Matrícula ou senha inválidos' } },
    });
    renderLoginPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/matricula/i), 'WRONG');
    await user.type(screen.getByLabelText('Senha', { exact: true }), 'badpassword');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() =>
      expect(screen.getByText('Matrícula ou senha inválidos')).toBeInTheDocument(),
    );
  });

  it('should navigate to /select-platform after successful student login', async () => {
    mockApi.post.mockResolvedValue({
      data: {
        data: {
          token: 'tok',
          student: {
            id: 1, name: 'Ana', email: 'a@b.com', enrollment: 'ANA001',
            avatar_url: null, role: 'student', created_at: '',
          },
        },
      },
    });
    renderLoginPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/matricula/i), 'ANA001');
    await user.type(screen.getByLabelText('Senha', { exact: true }), 'correct');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/select-platform'));
  });

  it('should navigate to /teacher/home after successful teacher login', async () => {
    mockApi.post.mockResolvedValue({
      data: {
        data: {
          token: 'teacher_tok',
          student: {
            id: 2, name: 'Prof João', email: 'joao@VestWeb.com', enrollment: 'PROF001',
            avatar_url: null, role: 'teacher', created_at: '',
          },
        },
      },
    });
    renderLoginPage();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/matricula/i), 'PROF001');
    await user.type(screen.getByLabelText('Senha', { exact: true }), 'correct');
    await user.click(screen.getByRole('button', { name: /entrar/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/teacher/home'));
  });

  it('should toggle password visibility when eye icon is clicked', async () => {
    renderLoginPage();
    const passwordInput = screen.getByLabelText('Senha', { exact: true });
    expect(passwordInput).toHaveAttribute('type', 'password');
    const toggleButton = screen.getByRole('button', { name: /mostrar senha/i });
    await userEvent.setup().click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    await userEvent.setup().click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
