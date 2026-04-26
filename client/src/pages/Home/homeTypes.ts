import { ElementType } from 'react';
import { LucideIcon } from 'lucide-react';

export interface Metrics {
  total_answered: number;
  accuracy: number;
  rank: number;
  streak: number;
}

export interface WeekEvent {
  id: number;
  title: string;
  date: string;
  start_time?: string;
  type: 'review' | 'study_block';
  done: boolean;
}

export interface ResumeItem {
  id: string;
  type: 'Simulado' | 'Videoaula' | 'Mentoria';
  title: string;
  subject: string;
  progress: number;
  to: string;
  thumbnail?: string;
  color: string;
  btnLabel: string;
}

export interface ActivityItem {
  icon: ElementType;
  text: string;
  time: string;
}

export interface Announcement {
  id: number;
  content: string;
  mentor?: {
    student?: {
      name?: string;
    };
  };
}

export interface Tip {
  subject: string;
  text: string;
}

export interface OnboardingStep {
  icon: LucideIcon;
  color: string;
  title: string;
  desc: string;
  to: string;
  btn: string;
}

export interface QuickAction {
  icon: LucideIcon;
  label: string;
  to: string;
}
