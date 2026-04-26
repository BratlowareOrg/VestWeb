import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, EyeOff, BookOpen, Users, BarChart2, Award } from 'lucide-react';
import logo from '../../assets/images/logo.png';
import { fetchMe, teacherLoginThunk } from '../../slices/authSlice';
import { AppDispatch, RootState } from '../../store/store';
import { isTeacherRole } from '../../utils/roles';
import './TeacherLoginPage.css';

const TeacherLoginPage = () => {
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
    if (user && role && isTeacherRole(role)) navigate('/teacher/home');
  }, [user, role, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(teacherLoginThunk({ enrollment, password }));
    if (teacherLoginThunk.fulfilled.match(result)) {
      navigate('/teacher/home');
    }
  };

  return (
    <div className="teacher-login-page">
      <div className="teacher-login-left">
        <div className="teacher-login-left-pattern" />
        <div className="teacher-login-left-content">
          <div className="teacher-login-left-logo">
            <img src={logo} alt="VestWeb" className="login-logo-img" width={168} height={48} decoding="async" />
          </div>
          <h1 className="teacher-login-left-title">Portal do Professor</h1>
          <p className="teacher-login-left-subtitle">
            Gerencie suas turmas, acompanhe o progresso dos alunos e construa o melhor conteúdo educacional.
          </p>
          <div className="teacher-login-left-features">
            {[
              { icon: <BookOpen size={16} />, text: 'Crie e gerencie questões e simulados' },
              { icon: <Users size={16} />, text: 'Acompanhe sessões de mentoria' },
              { icon: <BarChart2 size={16} />, text: 'Visualize o desempenho dos alunos' },
              { icon: <Award size={16} />, text: 'Contribua com o melhor conteúdo' },
            ].map((f, i) => (
              <div key={i} className="teacher-login-left-feature">
                <div className="teacher-login-left-feature-icon">{f.icon}</div>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="teacher-login-right">
        <div className="teacher-login-card">
          <div className="teacher-login-card-logo">
            <img src={logo} alt="VestWeb" className="login-logo-img" width={168} height={48} decoding="async" />
          </div>
          <div className="teacher-login-badge">Área do Professor</div>
          <h2>Acesse o portal</h2>
          <p>Entre com sua matrícula e senha de professor para continuar.</p>

          {error && <div className="teacher-login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="enrollment">Matrícula</label>
              <input
                id="enrollment"
                type="text"
                className="form-control"
                placeholder="Digite sua matrícula"
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

            <button type="submit" className="teacher-login-submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar no Portal'}
            </button>
          </form>

          <div className="teacher-login-divider">
            <span>Não é professor?</span>
          </div>
          <div className="teacher-login-student-link">
            <Link to="/login">Acessar como aluno</Link>
          </div>

          <div className="teacher-login-back">
            <Link to="/">← Voltar ao site</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherLoginPage;

