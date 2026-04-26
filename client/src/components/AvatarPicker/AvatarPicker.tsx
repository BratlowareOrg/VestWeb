import { useState, useRef, useCallback } from 'react';
import { Upload, Link, Sparkles, X, Check } from 'lucide-react';
import './AvatarPicker.css';

type Tab = 'upload' | 'url' | 'generated';

const DICEBEAR_STYLES = [
  { id: 'initials',      label: 'Iniciais' },
  { id: 'avataaars',     label: 'Avatar' },
  { id: 'bottts',        label: 'Robô' },
  { id: 'fun-emoji',     label: 'Emoji' },
  { id: 'pixel-art',     label: 'Pixel' },
  { id: 'lorelei',       label: 'Lorelei' },
];

interface Props {
  currentAvatar: string;
  name: string;
  onSave: (avatarUrl: string, file?: File) => Promise<void>;
  onClose: () => void;
}

const AvatarPicker = ({ currentAvatar, name, onSave, onClose }: Props) => {
  const [tab, setTab] = useState<Tab>('upload');
  const [urlInput, setUrlInput] = useState(currentAvatar.startsWith('http') ? currentAvatar : '');
  const [selectedStyle, setSelectedStyle] = useState('initials');
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = e => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const generatedUrl = `https://api.dicebear.com/9.x/${selectedStyle}/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (tab === 'upload' && selectedFile) {
        await onSave('', selectedFile);
      } else if (tab === 'url' && urlInput.trim()) {
        await onSave(urlInput.trim());
      } else if (tab === 'generated') {
        await onSave(generatedUrl);
      }
    } finally {
      setSaving(false);
    }
  };

  const canSave =
    (tab === 'upload' && !!selectedFile) ||
    (tab === 'url' && urlInput.trim().length > 0) ||
    tab === 'generated';

  const tabs: { id: Tab; icon: typeof Upload; label: string }[] = [
    { id: 'upload', icon: Upload, label: 'Upload' },
    { id: 'url', icon: Link, label: 'Link' },
    { id: 'generated', icon: Sparkles, label: 'Gerado' },
  ];

  return (
    <div className="avatar-picker-overlay" onClick={onClose}>
      <div className="avatar-picker-modal" onClick={e => e.stopPropagation()}>

        <div className="avatar-picker-header">
          <h3>Alterar foto de perfil</h3>
          <button className="avatar-picker-close" onClick={onClose} aria-label="Fechar"><X size={18} aria-hidden="true" /></button>
        </div>

        <div className="avatar-picker-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`avatar-picker-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="avatar-picker-body">

          {tab === 'upload' && (
            <div>
              <div
                className={`avatar-drop-zone${dragOver ? ' drag-over' : ''}${preview ? ' has-preview' : ''}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                {preview ? (
                  <img src={preview} alt="Preview" className="avatar-drop-preview" decoding="async" />
                ) : (
                  <>
                    <Upload size={32} />
                    <p>Arraste uma imagem aqui</p>
                    <span>ou clique para selecionar</span>
                    <small>JPEG, PNG, WEBP, GIF · máx. 3 MB</small>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              {preview && (
                <button className="avatar-picker-reset" onClick={() => { setPreview(null); setSelectedFile(null); }}>
                  <X size={13} /> Remover
                </button>
              )}
            </div>
          )}

          {tab === 'url' && (
            <div>
              <div className="avatar-url-preview-row">
                <div className="avatar-url-thumb">
                  {urlInput ? (
                    <img src={urlInput} alt="Preview" onError={e => (e.currentTarget.style.display = 'none')} loading="lazy" decoding="async" />
                  ) : (
                    <span>{name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <label htmlFor="avatar-url-input" className="avatar-url-label">URL da imagem</label>
                  <input
                    id="avatar-url-input"
                    type="url"
                    className="avatar-url-input"
                    placeholder="https://exemplo.com/foto.jpg"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              <p className="avatar-url-hint">Cole o link direto de uma imagem. Certifique-se de que a URL termina em .jpg, .png ou .webp.</p>
            </div>
          )}

          {tab === 'generated' && (
            <div>
              <div className="avatar-generated-preview">
                <img src={generatedUrl} alt="Avatar gerado" loading="lazy" decoding="async" />
              </div>
              <p className="avatar-generated-label">Escolha um estilo:</p>
              <div className="avatar-styles-grid">
                {DICEBEAR_STYLES.map(style => {
                  const url = `https://api.dicebear.com/9.x/${style.id}/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
                  return (
                    <button
                      key={style.id}
                      className={`avatar-style-btn${selectedStyle === style.id ? ' active' : ''}`}
                      onClick={() => setSelectedStyle(style.id)}
                    >
                      <img src={url} alt={style.label} width={64} height={64} loading="lazy" decoding="async" />
                      <span>{style.label}</span>
                      {selectedStyle === style.id && <div className="avatar-style-check"><Check size={12} /></div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        <div className="avatar-picker-footer">
          <button className="avatar-picker-cancel" onClick={onClose}>Cancelar</button>
          <button
            className="avatar-picker-save btn-primary"
            onClick={handleSave}
            disabled={!canSave || saving}
          >
            {saving ? 'Salvando...' : 'Salvar foto'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default AvatarPicker;
