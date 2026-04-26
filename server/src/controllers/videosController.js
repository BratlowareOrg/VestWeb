import { Video, VideoProgress, FavoriteVideo, Topic, Subject, Student } from '../db/models/index.js';
import { Op } from 'sequelize';

export const getAll = async (req, res) => {
  try {
    const { topic_id, search } = req.query;
    const where = {};
    if (topic_id) where.topic_id = topic_id;
    if (search) where.title = { [Op.iLike]: `%${search}%` };

    const videos = await Video.findAll({
      where,
      include: [
        { model: Topic, as: 'topic', include: [{ model: Subject, as: 'subject' }] },
        { model: Student, as: 'creator', attributes: ['id', 'name', 'avatar_url'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ message: 'Videos fetched', data: videos });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findByPk(id, {
      include: [
        { model: Topic, as: 'topic', include: [{ model: Subject, as: 'subject' }] },
        { model: Student, as: 'creator', attributes: ['id', 'name', 'avatar_url'] },
      ],
    });
    if (!video) return res.status(404).json({ message: 'Video not found' });

    // Also get progress for current user
    const progress = await VideoProgress.findOne({
      where: { student_id: req.user.id, video_id: id },
    });

    const favorite = await FavoriteVideo.findOne({
      where: { student_id: req.user.id, video_id: id },
    });

    return res.json({ message: 'Video fetched', data: { ...video.toJSON(), progress, isFavorite: !!favorite } });
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
    const { title, description, youtube_url, thumbnail_url, topic_id, published_at } = req.body;
    const video = await Video.create({
      title, description, youtube_url, thumbnail_url, topic_id, published_at,
      created_by: req.user.id,
    });
    return res.status(201).json({ message: 'Video created', data: video });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findByPk(id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    const { role } = req.user;
    if (role !== 'admin' && video.created_by !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const { title, description, youtube_url, thumbnail_url, topic_id, published_at } = req.body;
    await video.update({ title, description, youtube_url, thumbnail_url, topic_id, published_at });
    return res.json({ message: 'Video updated', data: video });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const destroy = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findByPk(id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    const { role } = req.user;
    if (role !== 'admin' && video.created_by !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await video.destroy();
    return res.json({ message: 'Video deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyVideos = async (req, res) => {
  try {
    const videos = await Video.findAll({
      where: { created_by: req.user.id },
      include: [
        { model: Topic, as: 'topic', include: [{ model: Subject, as: 'subject' }] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.json({ message: 'Videos fetched', data: videos });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { watched, progress_seconds } = req.body;

    const [progress] = await VideoProgress.findOrCreate({
      where: { student_id: req.user.id, video_id: id },
      defaults: { watched: false, progress_seconds: 0 },
    });

    await progress.update({ watched: watched ?? progress.watched, progress_seconds: progress_seconds ?? progress.progress_seconds, updated_at: new Date() });

    return res.json({ message: 'Progress updated', data: progress });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await FavoriteVideo.findOne({
      where: { student_id: req.user.id, video_id: id },
    });

    if (existing) {
      await existing.destroy();
      return res.json({ message: 'Removed from favorites', data: { isFavorite: false } });
    } else {
      await FavoriteVideo.create({ student_id: req.user.id, video_id: id });
      return res.json({ message: 'Added to favorites', data: { isFavorite: true } });
    }
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getFavorites = async (req, res) => {
  try {
    const favorites = await FavoriteVideo.findAll({
      where: { student_id: req.user.id },
      include: [{
        model: Video,
        as: 'video',
        include: [{ model: Topic, as: 'topic', include: [{ model: Subject, as: 'subject' }] }],
      }],
      order: [['created_at', 'DESC']],
    });
    return res.json({ message: 'Favorites fetched', data: favorites });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
