import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff } from 'lucide-react';
import logo from '../../assets/images/logo.png';
import { fetchMe, loginThunk } from '../../slices/authSlice';
import { AppDispatch, RootState } from '../../store/store';
import { isTeacherRole } from '../../utils/roles';
import './LoginPage.css';

const getRedirectPath = (role: string) =>
  isTeacherRole(role) ? '/teacher/home' : '/select-platform';

const LoginPage = () => {
  const [enrollment, setEnrollment] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error, user, authChecked, checkingSession } = useSelector((state: RootState) => state.auth);
  const role = user?.role;

  useEffect(() => {
    if (!authChecked && !checkingSession) {
      dispatch(fetchMe());
    }
  }, [authChecked, checkingSession, dispatch]);

  useEffect(() => {
    if (user && role) navigate(getRedirectPath(role));
  }, [user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(loginThunk({ enrollment, password }));
    if (loginThunk.fulfilled.match(result)) {
      const userRole = result.payload.user?.role ?? result.payload.student?.role;
      if (userRole) navigate(getRedirectPath(userRole));
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left-pattern" />
        <div className="login-left-content">
          <div className="login-left-logo">
            <img src={logo} alt="VestWeb" className="login-logo-img" width={168} height={48} decoding="async" />
          </div>
          <h1 className="login-left-title">Bem-vindo de volta!</h1>
          <p className="login-left-subtitle">
            Continue sua jornada rumo a aprovação. Cada dia de estudo te aproxima do seu objetivo.
          </p>
          <div className="login-left-features">
            {[
              'Banco com mais de 10.000 questoes',
              'Simulados com correção automática',
              'Videoaulas com os melhores professores',
              'Acompanhe seu desempenho em tempo real',
              'Comunidade de estudantes engajados',
              'A plataforma número 1 dos vestibulandos'
            ].map((f, i) => (
              <div key={i} className="login-left-feature">
                <div className="login-left-feature-dot" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-card-logo">
            <img src={logo} alt="VestWeb" className="login-logo-img" width={168} height={48} decoding="async" />
          </div>
          <h2>Acesse sua conta</h2>
          <p>Entre com sua matricula e senha para continuar.</p>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="enrollment">Matricula</label>
              <input
                id="enrollment"
                type="text"
                className="form-control"
                placeholder="Digite sua matricula"
                value={enrollment}
                onChange={e => setEnrollment(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Senha</label>
              <div className="password-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="login-forgot">
              <a href="#">Esqueceu a senha?</a>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="login-back">
            <Link to="/">← Voltar ao site</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

