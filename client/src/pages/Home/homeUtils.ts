import { subjectColors } from './homeConstants';

export const colorFor = (subjectName?: string): string => {
  if (!subjectName) {
    return 'var(--primary)';
  }

  return subjectColors[subjectName.toLowerCase()] ?? 'var(--primary)';
};

export const getYtThumb = (url: string): string | undefined => {
  const match = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\n?#]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : undefined;
};

export const timeAgo = (isoDate: string): string => {
  if (!isoDate) {
    return '';
  }

  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 1) {
    return 'agora';
  }

  if (mins < 60) {
    return `${mins}min atras`;
  }

  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return `${hours}h atras`;
  }

  const days = Math.floor(hours / 24);
  if (days === 1) {
    return 'ontem';
  }

  return `${days}d atras`;
};

export const getGreeting = (): string => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Bom dia';
  }

  if (hour < 18) {
    return 'Boa tarde';
  }

  return 'Boa noite';
};
