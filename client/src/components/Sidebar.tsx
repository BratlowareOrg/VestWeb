import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  LayoutDashboard, HelpCircle, ClipboardList, Play,
  Calendar, BarChart2, Users, MessageCircle,
  Settings, LogOut, Menu, X, LucideIcon, Sun, Moon,
  ChevronLeft, ChevronRight, PenLine,
} from 'lucide-react';
import logo from '../assets/images/logo.png';
import { AppDispatch, RootState } from '../store/store';
import { logoutThunk } from '../slices/authSlice';
import { toggleTheme } from '../slices/themeSlice';
import { getInitials } from '../utils/stringUtils';
import './Sidebar.css';

const COLLAPSED_WIDTH = '56px';
const EXPANDED_WIDTH = '260px';

export interface NavItem {
  label: string;
  icon: LucideIcon;
  to: string;
}

const defaultNavItems: NavItem[] = [
  { label: 'Home', icon: LayoutDashboard, to: '/classroom/home' },
  { label: 'Questões', icon: HelpCircle, to: '/classroom/questions' },
  { label: 'VestWebFlix', icon: Play, to: '/VestWebFlix' },
  { label: 'Redação', icon: PenLine, to: '/classroom/essay' },
  { label: 'Simulados', icon: ClipboardList, to: '/classroom/simulations' },
  { label: 'Calendário', icon: Calendar, to: '/classroom/review-calendar' },
  { label: 'Métricas', icon: BarChart2, to: '/classroom/metrics' },
  { label: 'Comunidade', icon: Users, to: '/classroom/community' },
  { label: 'Mentoria', icon: MessageCircle, to: '/classroom/mentoring' },
  { label: 'Configurações', icon: Settings, to: '/classroom/settings' },
];

interface SidebarProps {
  navItems?: NavItem[];
  roleLabel?: string;
}

const Sidebar = ({ navItems = defaultNavItems, roleLabel }: SidebarProps) => {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { user: student } = useSelector((state: RootState) => state.auth);
  const { mode } = useSelector((state: RootState) => state.theme);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-width',
      collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
    );
    return () => {
      document.documentElement.style.removeProperty('--sidebar-width');
    };
  }, [collapsed]);

  const handleLogout = async () => {
    await dispatch(logoutThunk());
    navigate('/login');
  };

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <button className="sidebar-mobile-toggle" onClick={() => setOpen(!open)} aria-label={open ? 'Fechar menu' : 'Abrir menu'}>
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      <aside className={`sidebar${open ? ' open' : ''}${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo">
            <img src={logo} alt="VestWeb" className="sidebar-logo-img" width={120} height={32} decoding="async" />
          </Link>
          <button
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {student && (
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {student.avatar_url ? (
                <img src={student.avatar_url} alt={student.name} width={40} height={40} loading="lazy" decoding="async" />
              ) : (
                getInitials(student.name)
              )}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{student.name}</div>
              <div className="sidebar-user-role">{roleLabel ?? ({ student: 'Estudante', teacher: 'Professor', admin: 'Administrador' }[student.role] ?? 'Estudante')}</div>
            </div>
          </div>
        )}

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
              onClick={() => setOpen(false)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-theme-toggle" onClick={() => dispatch(toggleTheme())} aria-label="Alternar tema">
            {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            <span>{mode === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
