import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  Play,
  Users,
} from 'lucide-react';
import api from '../../api/api';
import { RootState } from '../../store/store';
import { tips } from './homeConstants';
import { colorFor, getYtThumb } from './homeUtils';
import {
  ActivityItem,
  Announcement,
  Metrics,
  ResumeItem,
  Tip,
  WeekEvent,
} from './homeTypes';

const defaultMetrics: Metrics = {
  total_answered: 0,
  accuracy: 0,
  rank: 0,
  streak: 0,
};

const fetchMetrics = async (studentId?: number): Promise<Metrics> => {
  const [streakRes, leaderboardRes, statsRes] = await Promise.allSettled([
    api.get('/gamification/streak'),
    api.get('/gamification/leaderboard'),
    api.get('/gamification/stats'),
  ]);

  const streak = streakRes.status === 'fulfilled'
    ? streakRes.value.data.data?.current_streak ?? 0
    : 0;

  const leaderboard: any[] = leaderboardRes.status === 'fulfilled'
    ? leaderboardRes.value.data.data ?? []
    : [];

  const rank = leaderboard.findIndex((entry) => entry.student_id === studentId) + 1 || 0;

  const totalAnswered = statsRes.status === 'fulfilled'
    ? statsRes.value.data.data?.total_answered ?? 0
    : 0;

  const accuracy = statsRes.status === 'fulfilled'
    ? statsRes.value.data.data?.accuracy ?? 0
    : 0;

  return {
    streak,
    rank,
    total_answered: totalAnswered,
    accuracy,
  };
};

const fetchWeekEvents = async (): Promise<WeekEvent[]> => {
  const response = await api.get('/calendar/events');

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const events: WeekEvent[] = response.data.data ?? [];

  return events
    .filter((event) => {
      const eventDate = new Date(`${event.date}T12:00:00`);
      return eventDate >= startOfWeek && eventDate <= endOfWeek;
    })
    .sort((a, b) => {
      const first = a.date + (a.start_time || '');
      const second = b.date + (b.start_time || '');
      return first > second ? 1 : -1;
    })
    .slice(0, 5);
};

export const useHomeDashboard = () => {
  const queryClient = useQueryClient();
  const { user: student } = useSelector((state: RootState) => state.auth);
  const [tip] = useState<Tip>(() => tips[Math.floor(Math.random() * tips.length)]);
  const [resumeItems, setResumeItems] = useState<ResumeItem[]>([]);
  const [resumeLoaded, setResumeLoaded] = useState(false);
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_announcements') ?? '[]');
    } catch {
      return [];
    }
  });

  const { data: metrics = defaultMetrics, isSuccess: metricsLoaded } = useQuery({
    queryKey: ['dashboard-metrics', student?.id],
    queryFn: () => fetchMetrics(student?.id),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  const { data: weekEvents = [] } = useQuery({
    queryKey: ['week-events'],
    queryFn: fetchWeekEvents,
  });

  const toggleWeekEventMutation = useMutation({
    mutationFn: (eventId: number) => api.patch(`/calendar/events/${eventId}/toggle`),
    onMutate: async (eventId: number) => {
      await queryClient.cancelQueries({ queryKey: ['week-events'] });
      const previousEvents = queryClient.getQueryData<WeekEvent[]>(['week-events']);
      queryClient.setQueryData<WeekEvent[]>(['week-events'], (existingEvents) => (
        existingEvents?.map((event) => (
          event.id === eventId
            ? { ...event, done: !event.done }
            : event
        )) ?? []
      ));

      return { previousEvents };
    },
    onError: (_error, _eventId, context) => {
      if (context?.previousEvents) {
        queryClient.setQueryData(['week-events'], context.previousEvents);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['week-events'] });
    },
  });

  useEffect(() => {
    let isMounted = true;

    api.get('/teacher/announcements/feed')
      .then((response) => {
        if (!isMounted) {
          return;
        }

        setAnnouncements(response.data.data ?? []);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([
      api.get('/videos'),
      api.get('/simulations/sessions/active'),
      api.get('/mentoring/sessions'),
      api.get('/simulations/history'),
    ]).then(([videosRes, activeSimRes, mentoringRes, historyRes]) => {
      if (!isMounted) {
        return;
      }

      const items: ResumeItem[] = [];
      const recentActivity: ActivityItem[] = [];

      if (videosRes.status === 'fulfilled') {
        const videos: any[] = videosRes.value.data.data || [];
        const inProgressVideos = videos.filter((video) => (
          video.progress?.progress_seconds > 0 && !video.progress?.watched
        ));

        if (inProgressVideos.length > 0) {
          inProgressVideos.slice(0, 2).forEach((video) => {
            const duration = video.duration_seconds || 600;

            items.push({
              id: `video-${video.id}`,
              type: 'Videoaula',
              title: video.title,
              subject: video.topic?.subject?.name || 'VestWebFlix',
              progress: Math.min(Math.round((video.progress.progress_seconds / duration) * 100), 99),
              to: '/VestWebFlix',
              thumbnail: getYtThumb(video.youtube_url),
              color: colorFor(video.topic?.subject?.name),
              btnLabel: 'Continuar',
            });
          });
        } else {
          const watchedVideos = videos
            .filter((video) => video.progress?.watched)
            .sort((a, b) => ((b.progress?.updated_at ?? '') > (a.progress?.updated_at ?? '') ? 1 : -1))
            .slice(0, 1);

          watchedVideos.forEach((video) => {
            items.push({
              id: `video-${video.id}`,
              type: 'Videoaula',
              title: video.title,
              subject: video.topic?.subject?.name || 'VestWebFlix',
              progress: 100,
              to: '/VestWebFlix',
              thumbnail: getYtThumb(video.youtube_url),
              color: colorFor(video.topic?.subject?.name),
              btnLabel: 'Rever',
            });
          });
        }

        videos
          .filter((video) => video.progress?.watched || video.progress?.progress_seconds > 0)
          .sort((a, b) => ((b.progress?.updated_at ?? '') > (a.progress?.updated_at ?? '') ? 1 : -1))
          .slice(0, 2)
          .forEach((video) => {
            recentActivity.push({
              icon: Play,
              text: `Assistiu "${video.title}"`,
              time: video.progress?.updated_at ?? '',
            });
          });
      }

      let simulationWasAdded = false;

      if (activeSimRes.status === 'fulfilled') {
        const activeSessions: any[] = activeSimRes.value.data.data
          ? [activeSimRes.value.data.data].flat()
          : [];

        activeSessions.slice(0, 1).forEach((session) => {
          const totalQuestions = session.simulation?.total_questions || session.total_questions || 0;
          const answeredQuestions = session.answers_count ?? session.questions_answered ?? 0;
          const progress = totalQuestions > 0
            ? Math.round((answeredQuestions / totalQuestions) * 100)
            : 0;

          items.push({
            id: `sim-${session.id}`,
            type: 'Simulado',
            title: session.simulation?.title || 'Simulado em andamento',
            subject: session.simulation?.subject?.name || 'Simulados',
            progress,
            to: '/classroom/simulations',
            color: '#7c3aed',
            btnLabel: 'Retomar',
          });

          simulationWasAdded = true;
        });
      }

      if (!simulationWasAdded && historyRes.status === 'fulfilled') {
        const simulationsHistory: any[] = historyRes.value.data.data || [];
        simulationsHistory.slice(0, 1).forEach((entry) => {
          const totalQuestions = entry.total_questions || entry.simulation?.total_questions || 0;
          const correctAnswers = entry.correct_answers ?? entry.score ?? 0;
          const progress = totalQuestions > 0
            ? Math.round((correctAnswers / totalQuestions) * 100)
            : 0;

          items.push({
            id: `sim-hist-${entry.id}`,
            type: 'Simulado',
            title: entry.simulation?.title || entry.title || 'Simulado',
            subject: entry.simulation?.subject?.name || 'Simulados',
            progress,
            to: '/classroom/simulations',
            color: '#7c3aed',
            btnLabel: 'Rever',
          });
        });
      }

      if (historyRes.status === 'fulfilled') {
        const simulationsHistory: any[] = historyRes.value.data.data || [];
        simulationsHistory.slice(0, 2).forEach((entry) => {
          recentActivity.push({
            icon: ClipboardList,
            text: `Completou "${entry.simulation?.title || entry.title || 'um simulado'}"`,
            time: entry.updated_at ?? entry.created_at ?? '',
          });
        });
      }

      if (mentoringRes.status === 'fulfilled') {
        const mentoringSessions: any[] = mentoringRes.value.data.data || [];
        const now = new Date();

        const upcomingSessions = mentoringSessions
          .filter((session) => (
            (session.status === 'pending' || session.status === 'confirmed')
            && new Date(session.scheduled_at) > now
          ))
          .sort((a, b) => (
            new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
          ))
          .slice(0, 1);

        upcomingSessions.forEach((session) => {
          const scheduledDate = new Date(session.scheduled_at);
          const formattedDate = scheduledDate.toLocaleDateString('pt-BR', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          });
          const formattedTime = scheduledDate.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });
          const mentorName = session.mentor?.student?.name || 'seu mentor';

          items.push({
            id: `mentoria-${session.id}`,
            type: 'Mentoria',
            title: `Mentoria com ${mentorName}`,
            subject: `${formattedDate} as ${formattedTime}`,
            progress: 0,
            to: '/classroom/mentoring',
            color: '#0891b2',
            btnLabel: 'Ver detalhes',
          });

          recentActivity.push({
            icon: Users,
            text: `Agendou mentoria com ${mentorName.replace(/^PROF\.\s*/i, '') || 'um mentor'}`,
            time: session.created_at ?? '',
          });
        });
      }

      recentActivity.sort((a, b) => (b.time > a.time ? 1 : -1));
      setActivityItems(recentActivity.slice(0, 4));
      setResumeItems(items.slice(0, 3));
      setResumeLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const dismissAnnouncement = (announcementId: number) => {
    const nextDismissedAnnouncements = [...dismissedAnnouncements, announcementId];
    setDismissedAnnouncements(nextDismissedAnnouncements);
    localStorage.setItem('dismissed_announcements', JSON.stringify(nextDismissedAnnouncements));
  };

  const visibleAnnouncements = useMemo(
    () => announcements.filter((announcement) => !dismissedAnnouncements.includes(announcement.id)),
    [announcements, dismissedAnnouncements],
  );

  const weekDone = weekEvents.filter((event) => event.done).length;
  const weekTotal = weekEvents.length;

  const isNewUser = metricsLoaded
    && resumeLoaded
    && metrics.total_answered === 0
    && resumeItems.length === 0
    && weekEvents.length === 0;

  const studentFirstName = student?.name?.split(' ')[0] || 'Aluno';

  return {
    activityItems,
    dismissAnnouncement,
    isNewUser,
    metrics,
    metricsLoaded,
    resumeItems,
    resumeLoaded,
    studentFirstName,
    tip,
    toggleWeekEvent: (eventId: number) => toggleWeekEventMutation.mutate(eventId),
    visibleAnnouncements,
    weekDone,
    weekEvents,
    weekTotal,
  };
};
