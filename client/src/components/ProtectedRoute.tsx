import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store/store';
import { fetchMe } from '../slices/authSlice';
import FullPageLoader from './FullPageLoader';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, authChecked, checkingSession } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (!authChecked && !checkingSession) {
      dispatch(fetchMe());
    }
  }, [authChecked, checkingSession, dispatch]);

  if (!authChecked || checkingSession) {
    return <FullPageLoader message="Validando sessao..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
