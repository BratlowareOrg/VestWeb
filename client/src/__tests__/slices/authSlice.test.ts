import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, {
  loginThunk,
  teacherLoginThunk,
  fetchMe,
  logoutThunk,
  clearAuth,
  setCredentials,
  setError,
} from '../../slices/authSlice';

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
const mockApi = api as unknown as { post: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };

const buildStore = () =>
  configureStore({ reducer: { auth: authReducer } });

const makeUser = (overrides = {}) => ({
  id: 1,
  name: 'Ana Lima',
  email: 'ana@VestWeb.com',
  enrollment: 'ANA001',
  avatar_url: null,
  role: 'student' as const,
  type: 'student' as const,
  created_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
});

describe('authSlice — synchronous reducers', () => {
  it('clearAuth should reset auth state and local storage', () => {
    const store = buildStore();
    store.dispatch(setCredentials({ user: makeUser(), token: 'tok123' }));
    store.dispatch(clearAuth());

    const { user, token, error, authChecked, checkingSession } = store.getState().auth;
    expect(user).toBeNull();
    expect(token).toBeNull();
    expect(error).toBeNull();
    expect(authChecked).toBe(true);
    expect(checkingSession).toBe(false);
  });

  it('setCredentials should update user', () => {
    const store = buildStore();
    const user = makeUser();
    store.dispatch(setCredentials({ user }));

    expect(store.getState().auth.user).toEqual(user);
    expect(store.getState().auth.authChecked).toBe(true);
  });

  it('setError should update the error field', () => {
    const store = buildStore();
    store.dispatch(setError('Something went wrong'));
    expect(store.getState().auth.error).toBe('Something went wrong');
  });
});

describe('authSlice — loginThunk', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('sets user on successful login', async () => {
    const user = makeUser();
    mockApi.post.mockResolvedValue({ data: { data: { user } } });

    const store = buildStore();
    await store.dispatch(loginThunk({ enrollment: 'ANA001', password: 'correct' }));

    const state = store.getState().auth;
    expect(state.user).toEqual(user);
    expect(state.token).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
    expect(state.authChecked).toBe(true);
  });

  it('sets error message on failed login', async () => {
    mockApi.post.mockRejectedValue({
      response: { data: { message: 'Matrícula ou senha inválidos' } },
    });

    const store = buildStore();
    await store.dispatch(loginThunk({ enrollment: 'WRONG', password: 'bad' }));

    const state = store.getState().auth;
    expect(state.error).toBe('Matrícula ou senha inválidos');
    expect(state.user).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.authChecked).toBe(true);
  });

  it('clears legacy auth keys in localStorage on successful login', async () => {
    localStorage.setItem('VestWeb_user', JSON.stringify(makeUser()));
    localStorage.setItem('VestWeb_token', 'legacy');

    const user = makeUser();
    mockApi.post.mockResolvedValue({ data: { data: { user } } });

    const store = buildStore();
    await store.dispatch(loginThunk({ enrollment: 'ANA001', password: 'correct' }));

    expect(localStorage.getItem('VestWeb_user')).toBeNull();
    expect(localStorage.getItem('VestWeb_token')).toBeNull();
  });
});

describe('authSlice — teacherLoginThunk', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('sets state on successful teacher login', async () => {
    const teacher = makeUser({ role: 'teacher' as const, type: 'teacher' as const, enrollment: 'PROF001' });
    mockApi.post.mockResolvedValue({ data: { data: { user: teacher } } });

    const store = buildStore();
    await store.dispatch(teacherLoginThunk({ enrollment: 'PROF001', password: 'correct' }));

    expect(store.getState().auth.user?.role).toBe('teacher');
    expect(store.getState().auth.authChecked).toBe(true);
  });
});

describe('authSlice — fetchMe', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('hydrates user and marks authChecked', async () => {
    const user = makeUser();
    mockApi.get.mockResolvedValue({ data: { data: user } });

    const store = buildStore();
    await store.dispatch(fetchMe());

    const state = store.getState().auth;
    expect(state.user).toEqual(user);
    expect(state.authChecked).toBe(true);
    expect(state.checkingSession).toBe(false);
  });

  it('clears state when session is invalid', async () => {
    mockApi.get.mockRejectedValue({ response: { status: 401 } });

    const store = buildStore();
    await store.dispatch(fetchMe());

    const state = store.getState().auth;
    expect(state.user).toBeNull();
    expect(state.authChecked).toBe(true);
    expect(state.checkingSession).toBe(false);
  });
});

describe('authSlice — logoutThunk', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('clears user and token on logout', async () => {
    const store = buildStore();
    store.dispatch(setCredentials({ user: makeUser(), token: 'some_tok' }));

    mockApi.post.mockResolvedValue({});
    await store.dispatch(logoutThunk());

    const { user, token } = store.getState().auth;
    expect(user).toBeNull();
    expect(token).toBeNull();
  });

  it('removes localStorage keys on logout', async () => {
    localStorage.setItem('VestWeb_token', 'tok');
    localStorage.setItem('VestWeb_user', '{}');

    mockApi.post.mockResolvedValue({});
    const store = buildStore();
    await store.dispatch(logoutThunk());

    expect(localStorage.getItem('VestWeb_token')).toBeNull();
    expect(localStorage.getItem('VestWeb_user')).toBeNull();
  });
});
