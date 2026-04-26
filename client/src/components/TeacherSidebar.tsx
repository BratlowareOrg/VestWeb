import { LayoutDashboard, HelpCircle, MessageCircle, Settings, Play } from 'lucide-react';
import Sidebar, { NavItem } from './Sidebar';

const teacherNavItems: NavItem[] = [
  { label: 'Home', icon: LayoutDashboard, to: '/teacher/home' },
  { label: 'Questões', icon: HelpCircle, to: '/teacher/questions' },
  { label: 'VestWebFlix', icon: Play, to: '/teacher/VestWebFlix' },
  { label: 'Sessões de Mentoria', icon: MessageCircle, to: '/teacher/sessions' },
  { label: 'Configurações', icon: Settings, to: '/teacher/settings' },
];

const TeacherSidebar = () => (
  <Sidebar navItems={teacherNavItems} roleLabel="Professor" />
);

export default TeacherSidebar;