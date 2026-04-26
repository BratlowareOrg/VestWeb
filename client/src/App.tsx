import { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from './store/store';
import { clearAuth } from './slices/authSlice';
import ProtectedRoute from './components/ProtectedRoute';
import TeacherRoute from './components/TeacherRoute';
import FullPageLoader from './components/FullPageLoader';

const LandingPage = lazy(() => import('./pages/LandingPage/LandingPage'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess/PaymentSuccess'));
const PaymentCancel = lazy(() => import('./pages/PaymentCancel/PaymentCancel'));
const LoginPage = lazy(() => import('./pages/LoginPage/LoginPage'));
const TeacherLoginPage = lazy(() => import('./pages/TeacherLoginPage/TeacherLoginPage'));
const TeacherHome = lazy(() => import('./pages/TeacherArea/TeacherHome'));
const TeacherSessions = lazy(() => import('./pages/TeacherArea/TeacherSessions'));
const TeacherQuestions = lazy(() => import('./pages/TeacherArea/TeacherQuestions'));
const TeacherVestWebFlix = lazy(() => import('./pages/TeacherArea/TeacherSinaflix'));
const TeacherSettings = lazy(() => import('./pages/TeacherArea/TeacherSettings'));
const SelectPlatform = lazy(() => import('./pages/SelectPlatform/SelectPlatform'));
const VestWebFlix = lazy(() => import('./pages/Sinaflix/Sinaflix'));
const Home = lazy(() => import('./pages/Home/Home'));
const Questions = lazy(() => import('./pages/Questions/Questions'));
const Simulations = lazy(() => import('./pages/Simulations/Simulations'));
const ReviewCalendar = lazy(() => import('./pages/ReviewCalendar/ReviewCalendar'));
const Metrics = lazy(() => import('./pages/Metrics/Metrics'));
const Community = lazy(() => import('./pages/Community/Community'));
const Mentoring = lazy(() => import('./pages/Mentoring/Mentoring'));
const Settings = lazy(() => import('./pages/Settings/Settings'));
const EssayCorrection = lazy(() => import('./pages/EssayCorrection/EssayCorrection'));

function App() {
  const dispatch = useDispatch<AppDispatch>();
  const { mode } = useSelector((state: RootState) => state.theme);
  const location = useLocation();
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  useEffect(() => {
    setIsRouteTransitioning(true);
    const timeoutId = window.setTimeout(() => {
      setIsRouteTransitioning(false);
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [location.pathname]);

  useEffect(() => {
    const onUnauthorized = () => {
      dispatch(clearAuth());
    };

    window.addEventListener('vestweb:unauthorized', onUnauthorized);
    return () => {
      window.removeEventListener('vestweb:unauthorized', onUnauthorized);
    };
  }, [dispatch]);

  return (
    <>
      {isRouteTransitioning && (
        <div className="route-progress" aria-hidden="true">
          <div className="route-progress__bar" />
        </div>
      )}

      <Suspense fallback={<FullPageLoader message="Carregando pagina..." />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/payment/success" element={<PaymentSuccess />} />
          <Route path="/payment/cancel" element={<PaymentCancel />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/teacher/login" element={<TeacherLoginPage />} />
          <Route
            path="/select-platform"
            element={(
              <ProtectedRoute>
                <SelectPlatform />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/VestWebFlix"
            element={(
              <ProtectedRoute>
                <VestWebFlix />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/classroom/home"
            element={(
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/classroom/questions"
            element={(
              <ProtectedRoute>
                <Questions />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/classroom/simulations"
            element={(
              <ProtectedRoute>
                <Simulations />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/classroom/review-calendar"
            element={(
              <ProtectedRoute>
                <ReviewCalendar />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/classroom/metrics"
            element={(
              <ProtectedRoute>
                <Metrics />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/classroom/community"
            element={(
              <ProtectedRoute>
                <Community />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/classroom/mentoring"
            element={(
              <ProtectedRoute>
                <Mentoring />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/classroom/settings"
            element={(
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/classroom/essay"
            element={(
              <ProtectedRoute>
                <EssayCorrection />
              </ProtectedRoute>
            )}
          />

          <Route
            path="/teacher/home"
            element={(
              <TeacherRoute>
                <TeacherHome />
              </TeacherRoute>
            )}
          />
          <Route
            path="/teacher/questions"
            element={(
              <TeacherRoute>
                <TeacherQuestions />
              </TeacherRoute>
            )}
          />
          <Route
            path="/teacher/VestWebFlix"
            element={(
              <TeacherRoute>
                <TeacherVestWebFlix />
              </TeacherRoute>
            )}
          />
          <Route
            path="/teacher/sessions"
            element={(
              <TeacherRoute>
                <TeacherSessions />
              </TeacherRoute>
            )}
          />
          <Route
            path="/teacher/settings"
            element={(
              <TeacherRoute>
                <TeacherSettings />
              </TeacherRoute>
            )}
          />
        </Routes>
      </Suspense>
    </>
  );
}

export default App;
