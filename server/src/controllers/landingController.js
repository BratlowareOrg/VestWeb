import { Banner, Testimonial, InstitutionalVideo, Student } from '../db/models/index.js';
import { sendContactEmail } from '../services/emailService.js';
import { getRequestLogger } from '../services/logger.js';

export const getBanners = async (req, res) => {
  try {
    const banners = await Banner.findAll({
      where: { active: true },
      order: [['order', 'ASC']],
    });
    return res.json({ message: 'Banners fetched', data: banners });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getTestimonials = async (req, res) => {
  try {
    const testimonials = await Testimonial.findAll({
      where: { active: true },
      order: [['created_at', 'DESC']],
    });
    return res.json({ message: 'Testimonials fetched', data: testimonials });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getInstitutionalVideo = async (req, res) => {
  try {
    const video = await InstitutionalVideo.findOne({ order: [['updated_at', 'DESC']] });
    return res.json({ message: 'Video fetched', data: video });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getCollaborators = async (req, res) => {
  try {
    const collaborators = await Student.findAll({
      where: { role: 'teacher' },
      attributes: ['id', 'name', 'avatar_url', 'email', 'specialty', 'bio', 'experience_years'],
    });
    return res.json({ message: 'Collaborators fetched', data: collaborators });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const submitContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'name, email and message are required' });
    }
    await sendContactEmail({ name, email, message });
    return res.json({ message: 'Mensagem recebida com sucesso! Entraremos em contato em breve.' });
  } catch (error) {
    getRequestLogger(req).error({ err: error, event: 'landing_submit_contact_error' }, 'Erro ao enviar email de contato');
    return res.status(500).json({ message: 'Erro ao enviar mensagem' });
  }
};

