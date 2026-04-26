import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { RootState } from '../store/store';
import { toggleTheme } from '../slices/themeSlice';
import logo from '../assets/images/logo.png';
import './LandingHeader.css';

const LandingHeader = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { mode } = useSelector((state: RootState) => state.theme);
  const dispatch = useDispatch();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '#home', label: 'Início' },
    { href: '#planos', label: 'Planos' },
    { href: '#sobre', label: 'Sobre' },
    { href: '#metodologia', label: 'Metodologia' },
    { href: '#contato', label: 'Contato' },
  ];

  const ctaLinks = [
    { to: '/teacher/login', label: 'Área do Colaborador', className: 'landing-header-cta-collab' },
    { to: '/login', label: 'Acessar Espaço Aluno', className: 'landing-header-cta' },
  ];

  const handleNavClick = () => setMenuOpen(false);

  return (
    <>
      <header className={`landing-header${scrolled ? ' scrolled' : ''}`}>
        {/* Bloco 1: Lado Esquerdo (Logo) */}
        <div className="landing-header-left">
          <Link to="/" className="landing-header-logo">
            <img src={logo} alt="VestWeb" className="landing-header-logo-img" width={120} height={32} decoding="async" />
          </Link>
        </div>

        {/* Bloco 2: Centro (Apenas os links de texto) */}
        <nav className="landing-header-nav-container">
          <ul className="landing-header-nav">
            {navLinks.map(link => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Bloco 3: Lado Direito (Botões e Hamburger) */}
        <div className="landing-header-right">
          {ctaLinks.map(link => (
            <Link key={link.className} to={link.to} className={link.className}>
              {link.label}
            </Link>
          ))}

          <button
            className="landing-header-theme-toggle"
            onClick={() => dispatch(toggleTheme())}
            aria-label="Alternar tema"
          >
            {mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            className="landing-header-hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Menu Mobile - Mantém a estrutura original para não quebrar funcionalidade */}
      <div className={`landing-mobile-menu${menuOpen ? ' open' : ''}`}>
        {navLinks.map(link => (
          <a key={link.href} href={link.href} onClick={handleNavClick}>{link.label}</a>
        ))}
        {ctaLinks.map(link => (
          <Link key={link.className} to={link.to} className={link.className} onClick={handleNavClick}>
            {link.label}
          </Link>
        ))}
      </div>
    </>
  );
};

export default LandingHeader;
