import {
  MonitorPlay,
  PenLine,
  ScrollText,
} from 'lucide-react';
import {
  OnboardingStep,
  QuickAction,
  Tip,
} from './homeTypes';

export const tips: Tip[] = [
  {
    subject: 'Biologia',
    text: 'Revise o ciclo celular hoje! Mitose e meiose sao frequentemente cobrados nos principais vestibulares do Brasil.',
  },
  {
    subject: 'Quimica',
    text: 'Pratique balanceamento de equacoes quimicas. Essa habilidade e fundamental para resolver questoes de estequiometria.',
  },
  {
    subject: 'Fisica',
    text: 'Resolva ao menos 5 questoes de cinematica hoje. A pratica constante e a chave para dominar os calculos.',
  },
  {
    subject: 'Portugues',
    text: 'Leia um editorial ou artigo de opiniao hoje. Isso melhora sua interpretacao de texto e vocabulario.',
  },
];

export const onboardingSteps: OnboardingStep[] = [
  {
    icon: PenLine,
    color: '#2563eb',
    title: 'Responda sua primeira questao',
    desc: 'Teste seus conhecimentos e veja como esta seu desempenho.',
    to: '/classroom/questions',
    btn: 'Comecar',
  },
  {
    icon: MonitorPlay,
    color: '#059669',
    title: 'Assista uma videoaula',
    desc: 'Mais de 100 aulas com os melhores professores do VestWebFlix.',
    to: '/VestWebFlix',
    btn: 'Explorar',
  },
  {
    icon: ScrollText,
    color: '#7c3aed',
    title: 'Faca um simulado',
    desc: 'Pratique com provas anteriores e veja seu ranking.',
    to: '/classroom/simulations',
    btn: 'Ver simulados',
  },
];

export const quickActions: QuickAction[] = [
  { icon: PenLine, label: 'Resolver Questao', to: '/classroom/questions' },
  { icon: ScrollText, label: 'Iniciar Simulado', to: '/classroom/simulations' },
  { icon: MonitorPlay, label: 'Assistir Aula', to: '/VestWebFlix' },
];

export const subjectColors: Record<string, string> = {
  biologia: '#059669',
  quimica: '#2563eb',
  fisica: '#7c3aed',
  matematica: '#ea580c',
  portugues: '#dc2626',
  historia: '#b45309',
  geografia: '#0891b2',
};
