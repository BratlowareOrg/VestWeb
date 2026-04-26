import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import api from '../api/api';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  enrollment: string;
  avatar_url: string | null;
  role: 'student' | 'teacher' | 'admin';
  type: 'student' | 'teacher';
  target_vestibular_id?: number | null;
  created_at: string;
}

export type Student = AuthUser;

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  authChecked: boolean;
  checkingSession: boolean;
}

const wipeLegacyAuthStorage = () => {
  localStorage.removeItem('VestWeb_token');
  localStorage.removeItem('VestWeb_user');
  localStorage.removeItem('VestWeb_student');
};

const initialState: AuthState = {
  user: null,
  token: null,
  loading: false,
  error: null,
  authChecked: false,
  checkingSession: false,
};

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ enrollment, password }: { enrollment: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/login', { enrollment, password });
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Erro ao fazer login');
    }
  }
);

export const teacherLoginThunk = createAsyncThunk(
  'auth/teacherLogin',
  async ({ enrollment, password }: { enrollment: string; password: string }, { rejectWithValue }) => {
    try {
      const res = await api.post('/auth/teacher-login', { enrollment, password });
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Erro ao fazer login');
    }
  }
);

export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/auth/me');
      return res.data.data;
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Erro ao buscar usuario');
    }
  }
);

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    }
    wipeLegacyAuthStorage();
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user?: AuthUser; student?: AuthUser; token?: string | null }>) {
      const nextUser = action.payload.user ?? action.payload.student ?? null;
      state.user = nextUser;
      state.token = action.payload.token ?? null;
      state.authChecked = true;
      state.checkingSession = false;
      wipeLegacyAuthStorage();
    },
    clearAuth(state) {
      state.user = null;
      state.token = null;
      state.error = null;
      state.authChecked = true;
      state.checkingSession = false;
      wipeLegacyAuthStorage();
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    updateUser(state, action: PayloadAction<Partial<AuthUser>>) {
      if (!state.user) return;
      state.user = { ...state.user, ...action.payload };
      wipeLegacyAuthStorage();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action: PayloadAction<{ user?: AuthUser; student?: AuthUser; token?: string }>) => {
        const nextUser = action.payload.user ?? action.payload.student ?? null;
        state.loading = false;
        state.token = action.payload.token ?? null;
        state.user = nextUser;
        state.authChecked = true;
        state.checkingSession = false;
        wipeLegacyAuthStorage();
        if (action.payload.token) localStorage.setItem('vestweb_token', action.payload.token);
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.authChecked = true;
        state.checkingSession = false;
      })
      .addCase(teacherLoginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(teacherLoginThunk.fulfilled, (state, action: PayloadAction<{ user?: AuthUser; student?: AuthUser; token?: string }>) => {
        const nextUser = action.payload.user ?? action.payload.student ?? null;
        state.loading = false;
        state.token = action.payload.token ?? null;
        state.user = nextUser;
        state.authChecked = true;
        state.checkingSession = false;
        wipeLegacyAuthStorage();
        if (action.payload.token) localStorage.setItem('vestweb_token', action.payload.token);
      })
      .addCase(teacherLoginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.authChecked = true;
        state.checkingSession = false;
      })
      .addCase(fetchMe.pending, (state) => {
        state.checkingSession = true;
      })
      .addCase(fetchMe.fulfilled, (state, action: PayloadAction<AuthUser>) => {
        state.user = action.payload;
        state.token = null;
        state.authChecked = true;
        state.checkingSession = false;
        wipeLegacyAuthStorage();
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.authChecked = true;
        state.checkingSession = false;
        wipeLegacyAuthStorage();
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.error = null;
        state.authChecked = true;
        state.checkingSession = false;
      });
  },
});

export const { setCredentials, clearAuth, setError, setLoading, updateUser } = authSlice.actions;
export default authSlice.reducer;
