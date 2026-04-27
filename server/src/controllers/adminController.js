import { Op } from 'sequelize';
import {
  Student, Question, Alternative, Topic, Subject, Video,
  MentoringSession, Post, Report, Comment, Like, Subscription,
  Simulation, QuestionSession, Streak, Points,
} from '../db/models/index.js';

// ── helpers ────────────────────────────────────────────────────────────────────
const isAdmin = (req) => {
  const { role, type } = req.user ?? {};
  return type === 'teacher' || role === 'teacher' || role === 'admin';
};

const forbidden = (res) => res.status(403).json({ message: 'Acesso restrito a administradores' });

// ── GET /admin/stats ───────────────────────────────────────────────────────────
export const getStats = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  try {
    const [
      totalStudents,
      totalTeachers,
      totalAdmins,
      totalQuestions,
      totalVideos,
      totalSessions,
      totalPosts,
      totalReports,
      totalSubscriptions,
      totalSimulations,
    ] = await Promise.all([
      Student.count({ where: { role: 'student' } }),
      Student.count({ where: { role: 'teacher' } }),
      Student.count({ where: { role: 'admin' } }),
      Question.count(),
      Video.count(),
      MentoringSession.count(),
      Post.count(),
      Report.count(),
      Subscription.count(),
      Simulation.count(),
    ]);

    return res.json({
      data: {
        totalStudents,
        totalTeachers,
        totalAdmins,
        totalQuestions,
        totalVideos,
        totalSessions,
        totalPosts,
        totalReports,
        totalSubscriptions,
        totalSimulations,
      },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao buscar estatísticas', error: err.message });
  }
};

// ── GET /admin/students ────────────────────────────────────────────────────────
export const getStudents = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  try {
    const { search = '', role = '', page = '1', limit = '30' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (role) where.role = role;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { enrollment: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Student.findAndCountAll({
      where,
      attributes: ['id', 'name', 'email', 'enrollment', 'role', 'avatar_url', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: limitNum,
      offset,
    });

    return res.json({
      data: rows,
      meta: { total: count, page: pageNum, limit: limitNum, pages: Math.ceil(count / limitNum) },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao buscar alunos', error: err.message });
  }
};

// ── PUT /admin/students/:id ────────────────────────────────────────────────────
export const updateStudent = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowed = ['student', 'teacher', 'admin'];
    if (role && !allowed.includes(role)) {
      return res.status(400).json({ message: 'Role inválido' });
    }

    const student = await Student.findByPk(id);
    if (!student) return res.status(404).json({ message: 'Usuário não encontrado' });

    await student.update({ role });
    return res.json({ message: 'Usuário atualizado', data: student });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao atualizar usuário', error: err.message });
  }
};

// ── DELETE /admin/students/:id ─────────────────────────────────────────────────
export const deleteStudent = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  try {
    const { id } = req.params;
    if (String(id) === String(req.user?.id)) {
      return res.status(400).json({ message: 'Não é possível deletar a própria conta' });
    }
    const student = await Student.findByPk(id);
    if (!student) return res.status(404).json({ message: 'Usuário não encontrado' });
    await student.destroy();
    return res.json({ message: 'Usuário deletado com sucesso' });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao deletar usuário', error: err.message });
  }
};

// ── GET /admin/questions ───────────────────────────────────────────────────────
export const getQuestions = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  try {
    const { search = '', page = '1', limit = '30' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (search) where.statement = { [Op.iLike]: `%${search}%` };

    const { count, rows } = await Question.findAndCountAll({
      where,
      include: [
        { model: Topic, as: 'topic', include: [{ model: Subject, as: 'subject' }] },
        { model: Alternative, as: 'alternatives' },
      ],
      order: [['id', 'DESC']],
      limit: limitNum,
      offset,
    });

    return res.json({
      data: rows,
      meta: { total: count, page: pageNum, limit: limitNum, pages: Math.ceil(count / limitNum) },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao buscar questões', error: err.message });
  }
};

// ── DELETE /admin/questions/:id ────────────────────────────────────────────────
export const deleteQuestion = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  try {
    const q = await Question.findByPk(req.params.id);
    if (!q) return res.status(404).json({ message: 'Questão não encontrada' });
    await q.destroy();
    return res.json({ message: 'Questão deletada' });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao deletar questão', error: err.message });
  }
};

// ── GET /admin/videos ──────────────────────────────────────────────────────────
export const getVideos = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  try {
    const { search = '', page = '1', limit = '30' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (search) where.title = { [Op.iLike]: `%${search}%` };

    const { count, rows } = await Video.findAndCountAll({
      where,
      include: [
        { model: Topic, as: 'topic', include: [{ model: Subject, as: 'subject' }] },
        { model: Student, as: 'creator', attributes: ['id', 'name', 'avatar_url'] },
      ],
      order: [['id', 'DESC']],
      limit: limitNum,
      offset,
    });

    return res.json({
      data: rows,
      meta: { total: count, page: pageNum, limit: limitNum, pages: Math.ceil(count / limitNum) },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao buscar vídeos', error: err.message });
  }
};

// ── DELETE /admin/videos/:id ───────────────────────────────────────────────────
export const deleteVideo = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  try {
    const v = await Video.findByPk(req.params.id);
    if (!v) return res.status(404).json({ message: 'Vídeo não encontrado' });
    await v.destroy();
    return res.json({ message: 'Vídeo deletado' });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao deletar vídeo', error: err.message });
  }
};

// ── GET /admin/sessions ────────────────────────────────────────────────────────
export const getSessions = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  try {
    const { status = '', page = '1', limit = '30' } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const offset = (pageNum - 1) * limitNum;

    const where = {};
    if (status) where.status = status;

    const { count, rows } = await MentoringSession.findAndCountAll({
      where,
      include: [
        { model: Student, as: 'student', attributes: ['id', 'name', 'email', 'avatar_url', 'enrollment'] },
      ],
      order: [['scheduled_at', 'DESC']],
      limit: limitNum,
      offset,
    });

    return res.json({
      data: rows,
      meta: { total: count, page: pageNum, limit: limitNum, pages: Math.ceil(count / limitNum) },
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao buscar sessões', error: err.message });
  }
};

// ── GET /admin/reports ─────────────────────────────────────────────────────────
export const getReports = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  try {
    const reports = await Report.findAll({
      include: [
        {
          model: Post, as: 'post',
          include: [
            { model: Student, as: 'student', attributes: ['id', 'name', 'avatar_url'] },
            { model: Like, as: 'likes', attributes: ['id'] },
          ],
        },
        { model: Student, as: 'student', attributes: ['id', 'name', 'avatar_url'] },
      ],
      order: [['id', 'DESC']],
    });
    return res.json({ data: reports });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao buscar reports', error: err.message });
  }
};

// ── DELETE /admin/posts/:id ────────────────────────────────────────────────────
export const deletePost = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  try {
    const post = await Post.findByPk(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post não encontrado' });
    await post.destroy();
    return res.json({ message: 'Post deletado' });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao deletar post', error: err.message });
  }
};

// ── DELETE /admin/reports/:id ──────────────────────────────────────────────────
export const dismissReport = async (req, res) => {
  if (!isAdmin(req)) return forbidden(res);
  try {
    const report = await Report.findByPk(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report não encontrado' });
    await report.destroy();
    return res.json({ message: 'Report descartado' });
  } catch (err) {
    return res.status(500).json({ message: 'Erro ao descartar report', error: err.message });
  }
};
