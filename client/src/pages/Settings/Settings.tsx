import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  User, Lock, Bell, Shield, Check, Loader2, Camera,
  ChevronDown, Search, Eye, EyeOff,
} from 'lucide-react';
import Sidebar from '../../components/Sidebar';
import api from '../../api/api';
import { AppDispatch, RootState } from '../../store/store';
import { updateUser } from '../../slices/authSlice';
import { getInitials } from '../../utils/stringUtils';
import { fetchVestibulares, setTargetVestibular } from '../../slices/questionsSlice';
import AvatarPicker from '../../components/AvatarPicker/AvatarPicker';
import './Settings.css';

// ─── Schemas ────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(3, 'Nome deve ter ao menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  avatar_url: z.string().url('URL inválida').or(z.literal('')).optional(),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Informe a senha atual'),
    new_password: z.string().min(6, 'Mínimo de 6 caracteres'),
    confirm_password: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine(d => d.new_password === d.confirm_password, {
    message: 'As senhas não coincidem',
    path: ['confirm_password'],
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;
type Section = 'profile' | 'password' | 'notifications' | 'privacy';
type SaveState = 'idle' | 'loading' | 'success' | 'error';

// ─── Inline Error ────────────────────────────────────────────────────────────

const FieldError = ({ message }: { message?: string }) =>
  message ? <span className="field-error" role="alert">{message}</span> : null;


// ─── Vestibular Combobox ─────────────────────────────────────────────────────

interface Vestibular { id: number; name: string; institution?: string }

interface ComboboxProps {
  vestibulares: Vestibular[];
  value: string;
  onChange: (v: string) => void;
  saveState: SaveState;
}

const VestibularCombobox = ({ vestibulares, value, onChange, saveState }: ComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = vestibulares.find(v => String(v.id) === value);
  const filtered = vestibulares.filter(v =>
    `${v.name} ${v.institution ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="combobox" ref={containerRef}>
      <button
        type="button"
        className="combobox-trigger"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className={selected ? '' : 'combobox-placeholder'}>
          {selected ? `${selected.name}${selected.institution ? ` — ${selected.institution}` : ''}` : 'Sem preferência'}
        </span>
        {saveState === 'loading' ? (
          <Loader2 size={16} className="spin" />
        ) : saveState === 'success' ? (
          <Check size={16} className="combobox-check" />
        ) : (
          <ChevronDown size={16} className={`combobox-chevron${open ? ' open' : ''}`} />
        )}
      </button>

      {open && (
        <div className="combobox-dropdown" role="listbox">
          <div className="combobox-search-wrap">
            <Search size={14} />
            <input
              ref={searchRef}
              className="combobox-search"
              placeholder="Buscar vestibular..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <ul>
            <li
              className={`combobox-option${!value ? ' selected' : ''}`}
              role="option"
              aria-selected={!value}
              onClick={() => pick('')}
            >
              Sem preferência
              {!value && <Check size={14} />}
            </li>
            {filtered.length === 0 && (
              <li className="combobox-empty">Nenhum resultado</li>
            )}
            {filtered.map(v => (
              <li
                key={v.id}
                className={`combobox-option${String(v.id) === value ? ' selected' : ''}`}
                role="option"
                aria-selected={String(v.id) === value}
                onClick={() => pick(String(v.id))}
              >
                <span>{v.name}{v.institution ? <em> — {v.institution}</em> : null}</span>
                {String(v.id) === value && <Check size={14} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ─── Save Button ─────────────────────────────────────────────────────────────

interface SaveBtnProps {
  state: SaveState;
  dirty: boolean;
  label?: string;
}

const SaveButton = ({ state, dirty, label = 'Salvar alterações' }: SaveBtnProps) => (
  <button
    type="submit"
    className={`btn-save${state === 'success' ? ' success' : state === 'error' ? ' error' : ''}`}
    disabled={!dirty || state === 'loading'}
    aria-busy={state === 'loading'}
  >
    {state === 'loading' && <Loader2 size={16} className="spin" />}
    {state === 'success' && <Check size={16} />}
    {state === 'loading' ? 'Salvando...' : state === 'success' ? 'Salvo!' : label}
  </button>
);

// ─── Password Eye ────────────────────────────────────────────────────────────

const usePasswordToggle = () => {
  const [visible, setVisible] = useState(false);
  const toggle = () => setVisible(v => !v);
  return { visible, toggle, type: visible ? 'text' : 'password' } as const;
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Settings = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user: student } = useSelector((s: RootState) => s.auth);
  const { vestibulares } = useSelector((s: RootState) => s.questions);
  const [activeSection, setActiveSection] = useState<Section>('profile');
  const [targetVestibularId, setTargetVestibularId] = useState(String(student?.target_vestibular_id || ''));
  const [vestibularState, setVestibularState] = useState<SaveState>('idle');
  const [profileState, setProfileState] = useState<SaveState>('idle');
  const [passwordState, setPasswordState] = useState<SaveState>('idle');
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const current = usePasswordToggle();
  const next = usePasswordToggle();
  const confirm = usePasswordToggle();

  useEffect(() => { dispatch(fetchVestibulares()); }, [dispatch]);

  // ── Avatar save ──
  const handleAvatarSave = async (avatarUrl: string, file?: File) => {
    try {
      if (file) {
        const formData = new FormData();
        formData.append('avatar', file);
        const res = await api.post('/auth/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const url = res.data.data.avatar_url;
        dispatch(updateUser({ avatar_url: url }));
        profile.setValue('avatar_url', url, { shouldDirty: false });
      } else {
        await api.put('/auth/me', { ...profile.getValues(), avatar_url: avatarUrl });
        dispatch(updateUser({ avatar_url: avatarUrl }));
        profile.setValue('avatar_url', avatarUrl, { shouldDirty: false });
      }
      setShowAvatarPicker(false);
    } catch {
      setProfileError('Erro ao atualizar foto. Tente novamente.');
      setTimeout(() => setProfileError(''), 4000);
    }
  };

  // ── Profile form ──
  const profile = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: student?.name || '',
      email: student?.email || '',
      avatar_url: student?.avatar_url || '',
    },
    mode: 'onChange',
  });

  const onSaveProfile = async (data: ProfileValues) => {
    setProfileState('loading');
    setProfileError('');
    try {
      await api.put('/auth/me', data);
      setProfileState('success');
      profile.reset(data);
      setTimeout(() => setProfileState('idle'), 2500);
    } catch {
      setProfileState('error');
      setProfileError('Erro ao atualizar perfil. Tente novamente.');
      setTimeout(() => setProfileState('idle'), 3000);
    }
  };

  // ── Password form ──
  const pwd = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
    mode: 'onChange',
  });

  const onChangePassword = async (data: PasswordValues) => {
    setPasswordState('loading');
    setPasswordError('');
    try {
      await api.put('/auth/change-password', data);
      setPasswordState('success');
      pwd.reset();
      setTimeout(() => setPasswordState('idle'), 2500);
    } catch {
      setPasswordState('error');
      setPasswordError('Erro ao alterar senha. Verifique a senha atual.');
      setTimeout(() => setPasswordState('idle'), 3000);
    }
  };

  // ── Vestibular ──
  const handleVestibularChange = async (id: string) => {
    setTargetVestibularId(id);
    setVestibularState('loading');
    try {
      await dispatch(setTargetVestibular(id ? parseInt(id) : null));
      setVestibularState('success');
      setTimeout(() => setVestibularState('idle'), 2000);
    } catch {
      setVestibularState('error');
      setTimeout(() => setVestibularState('idle'), 2500);
    }
  };

  const navItems = [
    { id: 'profile' as Section, label: 'Perfil', icon: User },
    { id: 'password' as Section, label: 'Senha', icon: Lock },
    { id: 'notifications' as Section, label: 'Notificações', icon: Bell },
    { id: 'privacy' as Section, label: 'Privacidade', icon: Shield },
  ];

  return (
    <div className="settings-page">
      <Sidebar />
      {showAvatarPicker && (
        <AvatarPicker
          currentAvatar={profile.getValues('avatar_url') || ''}
          name={profile.getValues('name') || student?.name || ''}
          onSave={handleAvatarSave}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
      <main className="page-content">
        <h1 className="settings-title">Configurações</h1>

        <div className="settings-layout">
          {/* Sidebar nav */}
          <nav className="settings-nav" aria-label="Seções de configurações">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`settings-nav-item${activeSection === item.id ? ' active' : ''}`}
                onClick={() => setActiveSection(item.id)}
                aria-current={activeSection === item.id ? 'page' : undefined}
              >
                <item.icon size={16} strokeWidth={1.75} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="settings-content">
            {/* ── Profile ── */}
            {activeSection === 'profile' && (
              <div className="settings-section">
                <div className="settings-section-header">
                  <h2>Informações do perfil</h2>
                  <p className="settings-desc">Atualize suas informações pessoais e foto de perfil.</p>
                </div>

                {/* Avatar */}
                <div className="avatar-section">
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <div className="avatar-large">
                      {profile.watch('avatar_url') ? (
                        <img
                          src={profile.watch('avatar_url')}
                          alt="Avatar"
                          onError={e => (e.currentTarget.style.display = 'none')}
                          width={96}
                          height={96}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        getInitials(profile.watch('name') || student?.name || '')
                      )}
                    </div>
                    <button
                      type="button"
                      className="avatar-camera-btn"
                      onClick={() => setShowAvatarPicker(true)}
                      aria-label="Alterar foto de perfil"
                      title="Alterar foto de perfil"
                    >
                      <Camera size={15} />
                    </button>
                  </div>
                  <div className="avatar-info">
                    <h3>{student?.name}</h3>
                    <p>Matrícula: {student?.enrollment}</p>
                    <button
                      type="button"
                      className="btn-save"
                      style={{ fontSize: '13px', padding: '7px 14px' }}
                      onClick={() => setShowAvatarPicker(true)}
                    >
                      <Camera size={14} />
                      Alterar foto de perfil
                    </button>
                  </div>
                </div>

                <form onSubmit={profile.handleSubmit(onSaveProfile)} noValidate>
                  <div className="settings-form-grid">
                    <div className="form-group">
                      <label htmlFor="profile-name" className="form-label">Nome completo</label>
                      <input
                        id="profile-name"
                        type="text"
                        className={`form-control${profile.formState.errors.name ? ' input-error' : ''}`}
                        {...profile.register('name')}
                        autoComplete="name"
                      />
                      <FieldError message={profile.formState.errors.name?.message} />
                    </div>

                    <div className="form-group">
                      <label htmlFor="profile-email" className="form-label">
                        E-mail
                        {profile.watch('email') !== student?.email && (
                          <span className="badge-pending">Pendente de verificação</span>
                        )}
                      </label>
                      <input
                        id="profile-email"
                        type="email"
                        className={`form-control${profile.formState.errors.email ? ' input-error' : ''}`}
                        {...profile.register('email')}
                        autoComplete="email"
                      />
                      <FieldError message={profile.formState.errors.email?.message} />
                    </div>
                  </div>

                  <div className="settings-actions">
                    <SaveButton
                      state={profileState}
                      dirty={profile.formState.isDirty}
                      label="Salvar alterações"
                    />
                    {profileError && <span className="inline-error">{profileError}</span>}
                  </div>
                </form>

                {/* Vestibular */}
                <div className="settings-vestibular">
                  <h3>Vestibular alvo</h3>
                  <p className="settings-desc" style={{ marginBottom: 16, paddingBottom: 0, borderBottom: 'none' }}>
                    Defina para qual vestibular você está se preparando. As questões serão priorizadas de acordo com sua escolha.
                  </p>
                  <VestibularCombobox
                    vestibulares={vestibulares}
                    value={targetVestibularId}
                    onChange={handleVestibularChange}
                    saveState={vestibularState}
                  />
                  {vestibularState === 'error' && (
                    <span className="inline-error" style={{ marginTop: 8 }}>Erro ao salvar vestibular alvo.</span>
                  )}
                </div>
              </div>
            )}

            {/* ── Password ── */}
            {activeSection === 'password' && (
              <div className="settings-section">
                <div className="settings-section-header">
                  <h2>Alterar senha</h2>
                  <p className="settings-desc">Mantenha sua conta segura com uma senha forte.</p>
                </div>

                <form onSubmit={pwd.handleSubmit(onChangePassword)} noValidate>
                  <div className="form-group">
                    <label htmlFor="current-pwd" className="form-label">Senha atual</label>
                    <div className="input-password-wrap">
                      <input
                        id="current-pwd"
                        type={current.type}
                        className={`form-control${pwd.formState.errors.current_password ? ' input-error' : ''}`}
                        placeholder="Digite sua senha atual"
                        {...pwd.register('current_password')}
                        autoComplete="current-password"
                      />
                      <button type="button" className="pwd-toggle" onClick={current.toggle} aria-label="Mostrar senha atual" tabIndex={-1}>
                        {current.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <FieldError message={pwd.formState.errors.current_password?.message} />
                  </div>

                  <div className="settings-form-grid">
                    <div className="form-group">
                      <label htmlFor="new-pwd" className="form-label">Nova senha</label>
                      <div className="input-password-wrap">
                        <input
                          id="new-pwd"
                          type={next.type}
                          className={`form-control${pwd.formState.errors.new_password ? ' input-error' : ''}`}
                          placeholder="Mínimo 6 caracteres"
                          {...pwd.register('new_password')}
                          autoComplete="new-password"
                        />
                        <button type="button" className="pwd-toggle" onClick={next.toggle} aria-label="Mostrar nova senha" tabIndex={-1}>
                          {next.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <FieldError message={pwd.formState.errors.new_password?.message} />
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirm-pwd" className="form-label">Confirmar nova senha</label>
                      <div className="input-password-wrap">
                        <input
                          id="confirm-pwd"
                          type={confirm.type}
                          className={`form-control${pwd.formState.errors.confirm_password ? ' input-error' : ''}`}
                          placeholder="Repita a nova senha"
                          {...pwd.register('confirm_password')}
                          autoComplete="new-password"
                        />
                        <button type="button" className="pwd-toggle" onClick={confirm.toggle} aria-label="Mostrar confirmação" tabIndex={-1}>
                          {confirm.visible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <FieldError message={pwd.formState.errors.confirm_password?.message} />
                    </div>
                  </div>

                  <div className="settings-actions">
                    <SaveButton
                      state={passwordState}
                      dirty={pwd.formState.isDirty}
                      label="Alterar senha"
                    />
                    {passwordError && <span className="inline-error">{passwordError}</span>}
                  </div>
                </form>
              </div>
            )}

            {/* ── Notifications ── */}
            {activeSection === 'notifications' && (
              <div className="settings-section">
                <div className="settings-section-header">
                  <h2>Notificações</h2>
                  <p className="settings-desc">Configure como você deseja receber notificações.</p>
                </div>
                {[
                  { label: 'Novos simulados disponíveis', desc: 'Receba avisos quando novos simulados forem publicados.' },
                  { label: 'Lembretes de revisão', desc: 'Lembretes para os eventos do seu calendário.' },
                  { label: 'Atualizações da comunidade', desc: 'Comentários e curtidas nos seus posts.' },
                  { label: 'Sessões de mentoria', desc: 'Confirmação e lembretes de sessões agendadas.' },
                ].map((item, i) => (
                  <div key={i} className="toggle-row">
                    <div>
                      <div className="toggle-label">{item.label}</div>
                      <div className="toggle-desc">{item.desc}</div>
                    </div>
                    <label htmlFor={`settings-notification-toggle-${i}`} className="toggle-switch" aria-label={item.label}>
                      <input id={`settings-notification-toggle-${i}`} type="checkbox" defaultChecked={i < 2} />
                      <span className="toggle-track" />
                    </label>
                  </div>
                ))}
              </div>
            )}

            {/* ── Privacy ── */}
            {activeSection === 'privacy' && (
              <div className="settings-section">
                <div className="settings-section-header">
                  <h2>Privacidade e segurança</h2>
                  <p className="settings-desc">Gerencie as configurações de privacidade da sua conta.</p>
                </div>
                {[
                  { label: 'Perfil público na comunidade', desc: 'Outros alunos podem ver seu perfil no ranking.' },
                  { label: 'Mostrar progresso no ranking', desc: 'Sua posição e pontuação ficam visíveis para todos.' },
                  { label: 'Permitir mensagens diretas', desc: 'Outros alunos podem enviar mensagens para você.' },
                ].map((item, i) => (
                  <div key={i} className="toggle-row">
                    <div>
                      <div className="toggle-label">{item.label}</div>
                      <div className="toggle-desc">{item.desc}</div>
                    </div>
                    <label htmlFor={`settings-privacy-toggle-${i}`} className="toggle-switch" aria-label={item.label}>
                      <input id={`settings-privacy-toggle-${i}`} type="checkbox" defaultChecked={i < 2} />
                      <span className="toggle-track" />
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
