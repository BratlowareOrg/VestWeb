import { Mentor, MentoringSession, Student } from '../db/models/index.js';

export const getMentors = async (req, res) => {
  try {
    const mentors = await Mentor.findAll({
      include: [{ model: Student, as: 'student', attributes: ['id', 'name', 'avatar_url', 'email'] }],
      order: [['created_at', 'ASC']],
    });
    return res.json({ message: 'Mentors fetched', data: mentors });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getSessions = async (req, res) => {
  try {
    const sessions = await MentoringSession.findAll({
      where: { student_id: req.user.id },
      include: [
        {
          model: Mentor,
          as: 'mentor',
          include: [{ model: Student, as: 'student', attributes: ['id', 'name', 'avatar_url'] }],
        },
      ],
      order: [['scheduled_at', 'DESC']],
    });
    return res.json({ message: 'Sessions fetched', data: sessions });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const bookSession = async (req, res) => {
  try {
    const { mentor_id, scheduled_at, notes } = req.body;
    if (!mentor_id || !scheduled_at) {
      return res.status(400).json({ message: 'mentor_id and scheduled_at are required' });
    }

    const mentor = await Mentor.findByPk(mentor_id);
    if (!mentor) return res.status(404).json({ message: 'Mentor not found' });

    const session = await MentoringSession.create({
      mentor_id, student_id: req.user.id, scheduled_at, notes,
    });

    return res.status(201).json({ message: 'Session booked', data: session });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateSessionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const session = await MentoringSession.findByPk(id);
    if (!session) return res.status(404).json({ message: 'Session not found' });

    // Only mentor's student or admin can update
    const mentor = await Mentor.findByPk(session.mentor_id);
    if (mentor.student_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await session.update({ status, notes: notes ?? session.notes });
    return res.json({ message: 'Session updated', data: session });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
