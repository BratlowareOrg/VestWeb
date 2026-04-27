import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import TeacherSidebar from '../../components/TeacherSidebar';
import api from '../../api/api';
import StatsGrid from '../../components/dashboard/StatsGrid';
import QuickActions from '../../components/dashboard/QuickActions';
import Announcements from '../../components/dashboard/Announcements';
import UpcomingSessions from '../../components/dashboard/UpcomingSessions';
import ImpactMetrics from '../../components/dashboard/ImpactMetrics';
import type { SessionSummary, UpcomingSession, ActivityEvent, InsightsData, AnnouncementItem, InsightPeriod } from '../../components/dashboard/types';
import './TeacherLayout.css';
import './TeacherHome.css';

const TeacherHome = () => {
  const { user: student } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [sessions, setSessions] = useState<SessionSummary>({ total: 0, pending: 0, confirmed: 0, done: 0 });
  const [upcoming, setUpcoming] = useState<UpcomingSession[]>([]);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [period, setPeriod] = useState<InsightPeriod>('7d');

  useEffect(() => {
    const load = async () => {
      const safe = <T,>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

      const [qRes, sRes, iRes, aRes, annRes] = await Promise.all([
        safe(api.get('/teacher/questions')),
        safe(api.get('/teacher/sessions')),
        safe(api.get(`/teacher/insights?period=${period}`)),
        safe(api.get('/teacher/activity')),
        safe(api.get('/teacher/announcements')),
      ]);

      if (iRes)   setInsights(iRes.data.data);
      if (aRes)   setActivity(aRes.data.data ?? []);
      if (annRes) setAnnouncements(annRes.data.data ?? []);
      if (qRes)   setQuestionCount(qRes.data.data?.length ?? 0);

      const all: any[] = sRes?.data.data ?? [];
      setSessions({
        total: all.length,
        pending:   all.filter(s => s.status === 'pending').length,
        confirmed: all.filter(s => s.status === 'confirmed').length,
        done:      all.filter(s => s.status === 'done').length,
      });
      const now = new Date();
      setUpcoming(
        all
          .filter(s => (s.status === 'pending' || s.status === 'confirmed') && new Date(s.scheduled_at) > now)
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
          .slice(0, 4)
      );

      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (loading) return;
    setInsightsLoading(true);
    api.get(`/teacher/insights?period=${period}`)
      .then(res => setInsights(res.data.data))
      .catch(() => {})
      .finally(() => setInsightsLoading(false));
  }, [period]);

  const handleAddAnnouncement = useCallback(async (content: string) => {
    const res = await api.post('/teacher/announcements', { content });
    setAnnouncements(prev => [res.data.data, ...prev]);
  }, []);

  const handleDeleteAnnouncement = useCallback(async (id: number) => {
    await api.delete(`/teacher/announcements/${id}`);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const firstName = (student?.name ?? '').replace(/^PROF\.\s*/i, '').split(' ').slice(0, 2).join(' ');

  return (
    <div className="teacher-layout">
      <TeacherSidebar />
      <main className="teacher-main">
        <div className="teacher-home">
          <div className="teacher-home-greeting">
            <h1>{getGreeting()}, {firstName}!</h1>
            <p>Aqui está um resumo da sua área.</p>
          </div>

          <div className="teacher-home-grid">
            <div className="teacher-home-left">
              <StatsGrid questionCount={questionCount} sessions={sessions} loading={loading} />
              <QuickActions />
              <Announcements
                announcements={announcements}
                onAdd={handleAddAnnouncement}
                onDelete={handleDeleteAnnouncement}
                loading={loading}
              />
              <UpcomingSessions upcoming={upcoming} loading={loading} />
            </div>
            <ImpactMetrics
              insights={insights}
              activity={activity}
              loading={loading}
              insightsLoading={insightsLoading}
              period={period}
              onPeriodChange={setPeriod}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherHome;
