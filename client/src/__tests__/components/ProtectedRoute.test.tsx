import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../../slices/authSlice';
import questionsReducer from '../../slices/questionsSlice';
import simulationsReducer from '../../slices/simulationsSlice';
import videosReducer from '../../slices/videosSlice';
import communityReducer from '../../slices/communitySlice';
import ProtectedRoute from '../../components/ProtectedRoute';

const makeUser = () => ({
  id: 1,
  name: 'Ana',
  email: 'a@b.com',
  enrollment: 'ANA001',
  avatar_url: null,
  role: 'student' as const,
  type: 'student' as const,
  created_at: '',
});

const buildStore = (isAuthenticated: boolean) =>
  configureStore({
    reducer: {
      auth: authReducer,
      questions: questionsReducer,
      simulations: simulationsReducer,
      videos: videosReducer,
      community: communityReducer,
    },
    preloadedState: {
      auth: {
        user: isAuthenticated ? makeUser() : null,
        token: null,
        loading: false,
        error: null,
        authChecked: true,
        checkingSession: false,
      },
    },
  });

const renderWithStore = (isAuthenticated: boolean) =>
  render(
    <Provider store={buildStore(isAuthenticated)}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

describe('ProtectedRoute', () => {
  it('renders children when the user is authenticated', () => {
    renderWithStore(true);
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', () => {
    renderWithStore(false);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});
