import { StudyEvent, Topic, Subject } from '../db/models/index.js';
import { Op } from 'sequelize';

export const getEvents = async (req, res) => {
  try {
    const { month, year } = req.query;
    const where = { student_id: req.user.id };

    if (month && year) {
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0);
      where.date = { [Op.between]: [start.toISOString().split('T')[0], end.toISOString().split('T')[0]] };
    }

    const events = await StudyEvent.findAll({
      where,
      include: [{ model: Topic, as: 'topic', include: [{ model: Subject, as: 'subject' }] }],
      order: [['date', 'ASC'], ['start_time', 'ASC']],
    });

    return res.json({ message: 'Events fetched', data: events });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createEvent = async (req, res) => {
  try {
    const { title, topic_id, date, start_time, end_time, type } = req.body;
    if (!title || !date) return res.status(400).json({ message: 'title and date are required' });

    const event = await StudyEvent.create({
      student_id: req.user.id,
      title,
      topic_id: topic_id || null,
      date,
      start_time: start_time || null,
      end_time: end_time || null,
      type,
    });

    return res.status(201).json({ message: 'Event created', data: event });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await StudyEvent.findByPk(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.student_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    await event.update(req.body);
    return res.json({ message: 'Event updated', data: event });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await StudyEvent.findByPk(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.student_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    await event.destroy();
    return res.json({ message: 'Event deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const toggleDone = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await StudyEvent.findByPk(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.student_id !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    await event.update({ done: !event.done });
    return res.json({ message: 'Event toggled', data: event });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
