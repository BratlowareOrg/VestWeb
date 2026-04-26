import { Simulation, SimulationQuestion, Question, Alternative, QuestionSession, Answer, Student } from '../db/models/index.js';
import sequelize from '../db/index.js';

export const getAll = async (req, res) => {
  try {
    const simulations = await Simulation.findAll({
      order: [['created_at', 'DESC']],
    });
    return res.json({ message: 'Simulations fetched', data: simulations });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const simulation = await Simulation.findByPk(id, {
      include: [{
        model: SimulationQuestion,
        as: 'simulationQuestions',
        include: [{
          model: Question,
          as: 'question',
          include: [{ model: Alternative, as: 'alternatives' }],
        }],
        order: [['order', 'ASC']],
      }],
    });
    if (!simulation) return res.status(404).json({ message: 'Simulation not found' });
    return res.json({ message: 'Simulation fetched', data: simulation });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const create = async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== 'teacher' && role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { title, subject_id, difficulty, total_questions, time_limit_minutes, is_weekly, question_ids } = req.body;
    const simulation = await Simulation.create({
      title, subject_id, difficulty, total_questions, time_limit_minutes, is_weekly,
      created_by: req.user.id,
    });

    if (question_ids && Array.isArray(question_ids)) {
      for (let i = 0; i < question_ids.length; i++) {
        await SimulationQuestion.create({ simulation_id: simulation.id, question_id: question_ids[i], order: i + 1 });
      }
    }

    return res.status(201).json({ message: 'Simulation created', data: simulation });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const startSession = async (req, res) => {
  try {
    const { id } = req.params;
    const simulation = await Simulation.findByPk(id);
    if (!simulation) return res.status(404).json({ message: 'Simulation not found' });

    const session = await QuestionSession.create({
      student_id: req.user.id,
      simulation_id: id,
      mode: 'simulation',
    });
    return res.status(201).json({ message: 'Session started', data: session });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const finishSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await QuestionSession.findByPk(sessionId, {
      include: [{ model: Answer, as: 'answers' }],
    });
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (session.student_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    await session.update({ finished_at: new Date() });

    const total = session.answers.length;
    const correct = session.answers.filter(a => a.is_correct).length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    return res.json({ message: 'Session finished', data: { session, score, correct, total } });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getHistory = async (req, res) => {
  try {
    const sessions = await QuestionSession.findAll({
      where: { student_id: req.user.id, mode: 'simulation' },
      include: [
        { model: Simulation, as: 'simulation' },
        { model: Answer, as: 'answers' },
      ],
      order: [['started_at', 'DESC']],
    });

    const history = sessions.map(s => {
      const total = s.answers.length;
      const correct = s.answers.filter(a => a.is_correct).length;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      return { ...s.toJSON(), score, correct, total };
    });

    return res.json({ message: 'History fetched', data: history });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
