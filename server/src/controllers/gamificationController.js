import { Points, Badge, StudentBadge, Streak, Student, QuestionSession, Answer } from '../db/models/index.js';
import sequelize from '../db/index.js';
import { Op, QueryTypes } from 'sequelize';

export const getMyPoints = async (req, res) => {
  try {
    const result = await Points.findAll({
      where: { student_id: req.user.id },
      attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total_points']],
      raw: true,
    });
    const total_points = result[0]?.total_points || 0;
    return res.json({ message: 'Points fetched', data: { total_points } });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyBadges = async (req, res) => {
  try {
    const badges = await StudentBadge.findAll({
      where: { student_id: req.user.id },
      include: [{ model: Badge, as: 'badge' }],
      order: [['earned_at', 'DESC']],
    });
    return res.json({ message: 'Badges fetched', data: badges });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyStreak = async (req, res) => {
  try {
    const streak = await Streak.findOne({ where: { student_id: req.user.id } });
    return res.json({ message: 'Streak fetched', data: streak || { current_streak: 0, longest_streak: 0, last_activity_date: null } });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyStats = async (req, res) => {
  try {
    const sessions = await QuestionSession.findAll({
      where: { student_id: req.user.id },
      attributes: ['id'],
      raw: true,
    });
    const sessionIds = sessions.map(s => s.id);
    if (sessionIds.length === 0) {
      return res.json({ message: 'Stats fetched', data: { total_answered: 0, accuracy: 0 } });
    }
    const answers = await Answer.findAll({
      where: { session_id: sessionIds },
      attributes: ['is_correct'],
      raw: true,
    });
    const total_answered = answers.length;
    const correct = answers.filter(a => a.is_correct).length;
    const accuracy = total_answered > 0 ? Math.round((correct / total_answered) * 100) : 0;
    return res.json({ message: 'Stats fetched', data: { total_answered, accuracy } });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSubjectStats = async (req, res) => {
  try {
    const results = await sequelize.query(
      `SELECT COALESCE(s.name, 'Sem materia')               AS subject_name,
              COUNT(a.id)                                    AS total,
              SUM(CASE WHEN a.is_correct THEN 1 ELSE 0 END) AS correct
       FROM answers a
       JOIN question_sessions qs ON a.session_id = qs.id
       JOIN questions q          ON a.question_id = q.id
       LEFT JOIN topics t        ON q.topic_id = t.id
       LEFT JOIN subjects s      ON t.subject_id = s.id
       WHERE qs.student_id = :student_id
       GROUP BY s.name
       ORDER BY s.name`,
      { replacements: { student_id: req.user.id }, type: QueryTypes.SELECT }
    );
    const subjects = results.map(r => ({
      name:     r.subject_name,
      total:    Number(r.total),
      correct:  Number(r.correct),
      accuracy: Number(r.total) > 0 ? Math.round((Number(r.correct) / Number(r.total)) * 100) : 0,
    }));
    return res.json({ message: 'Subject stats fetched', data: subjects });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getRecentSessions = async (req, res) => {
  try {
    const sessions = await QuestionSession.findAll({
      where: { student_id: req.user.id, finished_at: { [Op.ne]: null } },
      include: [{ model: Answer, as: 'answers', attributes: ['is_correct'] }],
      order: [['started_at', 'DESC']],
      limit: 7,
    });
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const result = sessions.reverse().map(s => {
      const total = s.answers.length;
      const correct = s.answers.filter(a => a.is_correct).length;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      const label = days[new Date(s.started_at).getDay()];
      return { label, score };
    });
    return res.json({ message: 'Recent sessions fetched', data: result });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getLeaderboard = async (req, res) => {
  try {
    const leaderboard = await Points.findAll({
      attributes: ['student_id', [sequelize.fn('SUM', sequelize.col('amount')), 'total_points']],
      include: [{ model: Student, as: 'student', attributes: ['id', 'name', 'avatar_url', 'enrollment'] }],
      group: ['student_id', 'student.id'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      limit: 20,
    });
    return res.json({ message: 'Leaderboard fetched', data: leaderboard });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
