import { Op } from 'sequelize';
import { Teacher, MentoringSession, Student, Question, Alternative, Topic, Subject, Video, VideoProgress, Post, Comment, Announcement, StudentDoubt, Mentor } from '../db/models/index.js';

// ── Perfil ────────────────────────────────────────────────────────────────────

export const getProfile = async (req, res) => {
  try {
    const teacher = await Teacher.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'avatar_url', 'bio'],
    });
    return res.json({ message: 'Profile fetched', data: teacher });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Sessões de mentoria ───────────────────────────────────────────────────────

export const getMySessions = async (req, res) => {
  try {
    const sessions = await MentoringSession.findAll({
      where: { teacher_id: req.user.id },
      include: [
        { model: Student, as: 'student', attributes: ['id', 'name', 'avatar_url', 'enrollment'] },
      ],
      order: [['scheduled_at', 'DESC']],
    });
    return res.json({ message: 'Sessions fetched', data: sessions });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const session = await MentoringSession.findByPk(id);
    if (!session) return res.status(404).json({ message: 'Sessão não encontrada' });

    if (session.teacher_id !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await session.update({ status, notes: notes ?? session.notes });
    return res.json({ message: 'Session updated', data: session });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Questões ──────────────────────────────────────────────────────────────────

export const getMyQuestions = async (req, res) => {
  try {
    const questions = await Question.findAll({
      where: { created_by: req.user.id },
      include: [
        { model: Alternative, as: 'alternatives' },
        { model: Topic, as: 'topic', include: [{ model: Subject, as: 'subject' }] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ message: 'Questions fetched', data: questions });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createQuestion = async (req, res) => {
  try {
    const { statement, topic_id, difficulty, source, year, bank, alternatives } = req.body;
    if (!statement || !topic_id || !difficulty) {
      return res.status(400).json({ message: 'statement, topic_id e difficulty são obrigatórios' });
    }

    const question = await Question.create({
      statement, topic_id, difficulty, source, year, bank, created_by: req.user.id,
    });

    if (alternatives && Array.isArray(alternatives)) {
      for (const alt of alternatives) {
        await Alternative.create({ question_id: question.id, ...alt });
      }
    }

    const full = await Question.findByPk(question.id, {
      include: [
        { model: Alternative, as: 'alternatives' },
        { model: Topic, as: 'topic', include: [{ model: Subject, as: 'subject' }] },
      ],
    });

    return res.status(201).json({ message: 'Question created', data: full });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findByPk(id);
    if (!question) return res.status(404).json({ message: 'Questão não encontrada' });

    if (question.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { statement, topic_id, difficulty, source, year, bank } = req.body;
    await question.update({ statement, topic_id, difficulty, source, year, bank });
    return res.json({ message: 'Question updated', data: question });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const question = await Question.findByPk(id);
    if (!question) return res.status(404).json({ message: 'Questão não encontrada' });

    if (question.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await question.destroy();
    return res.json({ message: 'Question deleted' });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Atividade recente ─────────────────────────────────────────────────────────

export const getActivity = async (req, res) => {
  try {
    // 1. Sessões recentes agendadas com este professor
    const recentSessions = await MentoringSession.findAll({
      where: { teacher_id: req.user.id },
      include: [{ model: Student, as: 'student', attributes: ['id', 'name', 'avatar_url'] }],
      order: [['created_at', 'DESC']],
      limit: 6,
    });

    // 2. Progresso recente nos vídeos do professor
    const myVideos = await Video.findAll({
      where: { created_by: req.user.id },
      attributes: ['id', 'title'],
    });
    const myVideoMap = Object.fromEntries(myVideos.map(v => [v.id, v.title]));
    const myVideoIds = myVideos.map(v => v.id);

    let recentViews = [];
    if (myVideoIds.length > 0) {
      recentViews = await VideoProgress.findAll({
        where: { video_id: { [Op.in]: myVideoIds } },
        include: [{ model: Student, as: 'student', attributes: ['id', 'name', 'avatar_url'] }],
        order: [['updated_at', 'DESC']],
        limit: 6,
      });
    }

    // 3. Comentários recentes em posts do professor
    const myPosts = await Post.findAll({
      where: { student_id: req.user.id },
      attributes: ['id'],
    });
    const myPostIds = myPosts.map(p => p.id);

    let recentComments = [];
    if (myPostIds.length > 0) {
      recentComments = await Comment.findAll({
        where: { post_id: { [Op.in]: myPostIds }, student_id: { [Op.ne]: req.user.id } },
        include: [{ model: Student, as: 'student', attributes: ['id', 'name', 'avatar_url'] }],
        order: [['created_at', 'DESC']],
        limit: 6,
      });
    }

    const events = [
      ...recentSessions.map(s => ({
        type: 'session',
        date: s.created_at,
        student: s.student,
        meta: { scheduled_at: s.scheduled_at, status: s.status },
      })),
      ...recentViews.map(vp => ({
        type: 'view',
        date: vp.updated_at,
        student: vp.student,
        meta: { videoTitle: myVideoMap[vp.video_id] ?? 'uma aula' },
      })),
      ...recentComments.map(c => ({
        type: 'comment',
        date: c.created_at,
        student: c.student,
        meta: {},
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return res.json({ message: 'Activity fetched', data: events });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Insights ──────────────────────────────────────────────────────────────────

export const getInsights = async (req, res) => {
  try {
    const period = req.query.period ?? '7d';
    const msMap = { today: 24 * 60 * 60 * 1000, '7d': 7 * 24 * 60 * 60 * 1000, '30d': 30 * 24 * 60 * 60 * 1000 };
    const since = new Date(Date.now() - (msMap[period] ?? msMap['7d']));

    // Dúvidas pendentes — via perfil de mentor legado (pode ser 0 se não existir)
    let pendingDoubts = 0;
    const mentor = await Mentor.findOne({ where: { student_id: req.user.id } });
    if (mentor) {
      pendingDoubts = await StudentDoubt.count({
        where: { mentor_id: mentor.id, answered: false },
      });
    }

    // Alunos ativos nos vídeos do professor
    const myVideos = await Video.findAll({
      where: { created_by: req.user.id },
      attributes: ['id'],
    });
    const myVideoIds = myVideos.map(v => v.id);

    let activeStudents = 0;
    if (myVideoIds.length > 0) {
      const rows = await VideoProgress.findAll({
        where: { video_id: { [Op.in]: myVideoIds }, updated_at: { [Op.gte]: since } },
        attributes: ['student_id'],
        group: ['student_id'],
      });
      activeStudents = rows.length;
    }

    // Avaliação média das sessões do professor
    const doneSessions = await MentoringSession.findAll({
      where: {
        teacher_id: req.user.id,
        status: 'done',
        rating: { [Op.not]: null },
        updated_at: { [Op.gte]: since },
      },
      attributes: ['rating'],
    });
    const avgRating = doneSessions.length > 0
      ? (doneSessions.reduce((sum, s) => sum + s.rating, 0) / doneSessions.length).toFixed(1)
      : null;

    // Status dos vídeos
    const now = new Date();
    const allMyVideos = await Video.findAll({
      where: { created_by: req.user.id },
      attributes: ['id', 'title', 'published_at', 'thumbnail_url', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 5,
    });
    const videoStats = {
      total: await Video.count({ where: { created_by: req.user.id } }),
      published: await Video.count({ where: { created_by: req.user.id, published_at: { [Op.lte]: now, [Op.not]: null } } }),
      scheduled: await Video.count({ where: { created_by: req.user.id, published_at: { [Op.gt]: now } } }),
      draft: await Video.count({ where: { created_by: req.user.id, published_at: null } }),
      recent: allMyVideos.map(v => ({
        id: v.id,
        title: v.title,
        thumbnail_url: v.thumbnail_url,
        status: !v.published_at ? 'draft' : new Date(v.published_at) > now ? 'scheduled' : 'published',
        published_at: v.published_at,
      })),
    };

    return res.json({
      message: 'Insights fetched',
      data: { pendingDoubts, activeStudents, avgRating, ratingCount: doneSessions.length, videoStats },
    });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Avisos para alunos ────────────────────────────────────────────────────────

export const getMyAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.findAll({
      where: { teacher_id: req.user.id },
      order: [['created_at', 'DESC']],
    });
    return res.json({ message: 'Announcements fetched', data: announcements });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createAnnouncement = async (req, res) => {
  try {
    const { content, expires_at } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'Conteúdo obrigatório' });

    const announcement = await Announcement.create({
      teacher_id: req.user.id,
      content: content.trim(),
      expires_at: expires_at ?? null,
    });
    return res.status(201).json({ message: 'Announcement created', data: announcement });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByPk(req.params.id);
    if (!announcement) return res.status(404).json({ message: 'Aviso não encontrado' });
    if (announcement.teacher_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    await announcement.destroy();
    return res.json({ message: 'Announcement deleted' });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Feed de avisos (para alunos) ──────────────────────────────────────────────

export const getAnnouncementsFeed = async (req, res) => {
  try {
    const now = new Date();

    // Busca sessões do aluno para descobrir professores vinculados
    const sessions = await MentoringSession.findAll({
      where: { student_id: req.user.id },
      attributes: ['teacher_id', 'mentor_id'],
      group: ['teacher_id', 'mentor_id'],
    });

    const teacherIds = [...new Set(sessions.map(s => s.teacher_id).filter(Boolean))];
    const mentorIds  = [...new Set(sessions.map(s => s.mentor_id).filter(Boolean))];

    const orConditions = [];
    if (teacherIds.length > 0) orConditions.push({ teacher_id: { [Op.in]: teacherIds } });
    if (mentorIds.length > 0)  orConditions.push({ mentor_id:  { [Op.in]: mentorIds } });

    if (orConditions.length === 0) return res.json({ message: 'No announcements', data: [] });

    const announcements = await Announcement.findAll({
      where: {
        [Op.or]: orConditions,
        [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: now } }],
      },
      order: [['created_at', 'DESC']],
    });

    return res.json({ message: 'Feed fetched', data: announcements });
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
