import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { User, Lock, Bell, Shield, Camera } from 'lucide-react';
import TeacherSidebar from '../../components/TeacherSidebar';
import api from '../../api/api';
import { RootState } from '../../store/store';
import { updateUser } from '../../slices/authSlice';
import { getInitials } from '../../utils/stringUtils';
import AvatarPicker from '../../components/AvatarPicker/AvatarPicker';
import '../../pages/Settings/Settings.css';

const TeacherSettings = () => {
  const dispatch = useDispatch();
  const { user: student } = useSelector((s: RootState) => s.auth);
  const [activeSection, setActiveSection] = useState<'profile' | 'password' | 'notifications' | 'privacy'>('profile');

  const [profileForm, setProfileForm] = useState({
    name: student?.name || '',
    email: student?.email || '',
    avatar_url: student?.avatar_url || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);


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
        setProfileForm(prev => ({ ...prev, avatar_url: url }));
      } else {
        await api.put('/auth/me', { ...profileForm, avatar_url: avatarUrl });
        dispatch(updateUser({ avatar_url: avatarUrl }));
        setProfileForm(prev => ({ ...prev, avatar_url: avatarUrl }));
      }
      setShowAvatarPicker(false);
      setProfileMsg({ type: 'success', text: 'Foto atualizada com sucesso!' });
      setTimeout(() => setProfileMsg(null), 4000);
    } catch {
      setProfileMsg({ type: 'error', text: 'Erro ao atualizar foto. Tente novamente.' });
      setTimeout(() => setProfileMsg(null), 4000);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      await api.put('/auth/me', profileForm);
      dispatch(updateUser(profileForm));
      setProfileMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch {
      setProfileMsg({ type: 'error', text: 'Erro ao atualizar perfil. Tente novamente.' });
    }
    setProfileLoading(false);
    setTimeout(() => setProfileMsg(null), 4000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMsg({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordMsg({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    setPasswordLoading(true);
    setPasswordMsg(null);
    try {
      await api.put('/auth/change-password', passwordForm);
      setPasswordMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch {
      setPasswordMsg({ type: 'error', text: 'Erro ao alterar senha. Verifique sua senha atual.' });
    }
    setPasswordLoading(false);
    setTimeout(() => setPasswordMsg(null), 4000);
  };

  const navItems = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'password', label: 'Senha', icon: Lock },
    { id: 'notifications', label: 'Notificações', icon: Bell },
    { id: 'privacy', label: 'Privacidade', icon: Shield },
  ];

  return (
    <div className="teacher-layout">
      <TeacherSidebar />
      {showAvatarPicker && (
        <AvatarPicker
          currentAvatar={profileForm.avatar_url}
          name={profileForm.name}
          onSave={handleAvatarSave}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
      <main className="teacher-main">
        <div style={{ padding: '32px' }}>
        <h1 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 800 }}>Configurações</h1>

        <div className="settings-layout">
          <div className="settings-nav">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`settings-nav-item${activeSection === item.id ? ' active' : ''}`}
                onClick={() => setActiveSection(item.id as any)}
              >
                <item.icon size={17} />
                {item.label}
              </button>
            ))}
          </div>

          <div>
            {activeSection === 'profile' && (
              <div className="settings-section">
                <h2>Informações do perfil</h2>
                <p className="settings-desc">Atualize suas informações pessoais e foto de perfil.</p>

                <div className="avatar-section">
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <div className="avatar-large">
                      {profileForm.avatar_url ? (
                        <img src={profileForm.avatar_url} alt="Avatar" onError={e => (e.currentTarget.style.display = 'none')} />
                      ) : (
                        getInitials(profileForm.name)
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAvatarPicker(true)}
                      style={{
                        position: 'absolute', bottom: 0, right: 0,
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'var(--primary)', border: '2px solid var(--white)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'white',
                      }}
                      title="Alterar foto de perfil"
                      aria-label="Alterar foto de perfil"
                    >
                      <Camera size={15} />
                    </button>
                  </div>
                  <div className="avatar-info">
                    <h3>{student?.name}</h3>
                    <p>Matrícula: {student?.enrollment}</p>
                    <button
                      type="button"
                      className="teacher-quick-btn"
                      style={{ fontSize: '13px', padding: '7px 14px' }}
                      onClick={() => setShowAvatarPicker(true)}
                    >
                      <Camera size={14} />
                      Alterar foto de perfil
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile}>
                  <div className="settings-form-grid">
                    <div className="form-group">
                      <label htmlFor="teacher-settings-name">Nome completo</label>
                      <input
                        id="teacher-settings-name"
                        type="text"
                        className="form-control"
                        value={profileForm.name}
                        onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="teacher-settings-email">E-mail</label>
                      <input
                        id="teacher-settings-email"
                        type="email"
                        className="form-control"
                        value={profileForm.email}
                        onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" disabled={profileLoading} style={{ fontSize: '14px' }}>
                    {profileLoading ? 'Salvando...' : 'Salvar alterações'}
                  </button>

                  {profileMsg && (
                    <div className={profileMsg.type === 'success' ? 'settings-success' : 'settings-error'}>
                      {profileMsg.text}
                    </div>
                  )}
                </form>
              </div>
            )}

            {activeSection === 'password' && (
              <div className="settings-section">
                <h2>Alterar senha</h2>
                <p className="settings-desc">Mantenha sua conta segura com uma senha forte.</p>

                <form onSubmit={handleChangePassword}>
                  <div className="form-group">
                    <label htmlFor="teacher-settings-current-password">Senha atual</label>
                    <input
                      id="teacher-settings-current-password"
                      type="password"
                      className="form-control"
                      value={passwordForm.current_password}
                      onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      required
                      placeholder="Digite sua senha atual"
                    />
                  </div>
                  <div className="settings-form-grid">
                    <div className="form-group">
                      <label htmlFor="teacher-settings-new-password">Nova senha</label>
                      <input
                        id="teacher-settings-new-password"
                        type="password"
                        className="form-control"
                        value={passwordForm.new_password}
                        onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                        required
                        placeholder="Mínimo 6 caracteres"
                        minLength={6}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="teacher-settings-confirm-password">Confirmar nova senha</label>
                      <input
                        id="teacher-settings-confirm-password"
                        type="password"
                        className="form-control"
                        value={passwordForm.confirm_password}
                        onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                        required
                        placeholder="Repita a nova senha"
                      />
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" disabled={passwordLoading} style={{ fontSize: '14px' }}>
                    {passwordLoading ? 'Alterando...' : 'Alterar senha'}
                  </button>

                  {passwordMsg && (
                    <div className={passwordMsg.type === 'success' ? 'settings-success' : 'settings-error'}>
                      {passwordMsg.text}
                    </div>
                  )}
                </form>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="settings-section">
                <h2>Notificações</h2>
                <p className="settings-desc">Configure como você deseja receber notificações.</p>
                {[
                  { label: 'Novas sessões de mentoria', desc: 'Receba avisos quando um aluno agendar uma sessão.' },
                  { label: 'Lembretes de sessões', desc: 'Lembretes para sessões confirmadas no seu calendário.' },
                  { label: 'Atualizações de questões', desc: 'Notificações sobre o desempenho dos alunos nas suas questões.' },
                  { label: 'Mensagens da plataforma', desc: 'Avisos administrativos e novidades do sistema.' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.desc}</div>
                    </div>
                    <label htmlFor={`teacher-notification-toggle-${i}`} style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                      <input id={`teacher-notification-toggle-${i}`} type="checkbox" defaultChecked={i < 2} style={{ opacity: 0, width: 0, height: 0 }} />
                      <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: i < 2 ? 'var(--primary)' : '#ccc', borderRadius: '24px', transition: '0.3s' }} />
                    </label>
                  </div>
                ))}
              </div>
            )}

            {activeSection === 'privacy' && (
              <div className="settings-section">
                <h2>Privacidade e segurança</h2>
                <p className="settings-desc">Gerencie as configurações de privacidade da sua conta.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {[
                    { label: 'Perfil público para alunos', desc: 'Alunos podem ver seu perfil e informações de contato.' },
                    { label: 'Mostrar disponibilidade', desc: 'Sua disponibilidade para mentoria fica visível na plataforma.' },
                    { label: 'Permitir mensagens diretas', desc: 'Alunos podem enviar mensagens diretamente para você.' },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.desc}</div>
                      </div>
                      <label htmlFor={`teacher-privacy-toggle-${i}`} style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                        <input id={`teacher-privacy-toggle-${i}`} type="checkbox" defaultChecked={i < 2} style={{ opacity: 0, width: 0, height: 0 }} />
                        <span style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: i < 2 ? 'var(--primary)' : '#ccc', borderRadius: '24px', transition: '0.3s' }} />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherSettings;
