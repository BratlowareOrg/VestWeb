import { Post, Comment, Like, Report, Student, Points } from '../db/models/index.js';
import sequelize from '../db/index.js';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const DOMPurify = createDOMPurify(new JSDOM('').window);

const sanitizeCommunityText = (value) => DOMPurify
  .sanitize(String(value ?? ''), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })
  .replace(/\s+/g, ' ')
  .trim();

export const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const posts = await Post.findAndCountAll({
      include: [
        { model: Student, as: 'student', attributes: ['id', 'name', 'avatar_url'] },
        { model: Like, as: 'likes', attributes: ['id', 'student_id'] },
        { model: Comment, as: 'comments', attributes: ['id'] },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    const postsWithCounts = posts.rows.map(post => {
      const p = post.toJSON();
      p.like_count = p.likes.length;
      p.comment_count = p.comments.length;
      p.liked_by_me = p.likes.some(l => l.student_id === req.user.id);
      return p;
    });

    return res.json({ message: 'Posts fetched', data: { count: posts.count, rows: postsWithCounts } });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const createPost = async (req, res) => {
  try {
    const { content, image_url } = req.body;
    const sanitizedContent = sanitizeCommunityText(content);

    if (!sanitizedContent) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const post = await Post.create({
      student_id: req.user.id,
      content: sanitizedContent,
      image_url,
    });

    // Award community points
    await Points.create({ student_id: req.user.id, amount: 5, reason: 'community' });

    const full = await Post.findByPk(post.id, {
      include: [{ model: Student, as: 'student', attributes: ['id', 'name', 'avatar_url'] }],
    });

    return res.status(201).json({ message: 'Post created', data: full });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findByPk(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.student_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await post.destroy();
    return res.json({ message: 'Post deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const likePost = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Like.findOne({ where: { student_id: req.user.id, post_id: id } });

    if (existing) {
      await existing.destroy();
      return res.json({ message: 'Like removed', data: { liked: false } });
    }

    await Like.create({ student_id: req.user.id, post_id: id });
    return res.json({ message: 'Post liked', data: { liked: true } });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await Comment.findAll({
      where: { post_id: id, parent_id: null },
      include: [
        { model: Student, as: 'student', attributes: ['id', 'name', 'avatar_url'] },
        {
          model: Comment,
          as: 'replies',
          include: [{ model: Student, as: 'student', attributes: ['id', 'name', 'avatar_url'] }],
        },
      ],
      order: [['created_at', 'ASC']],
    });
    return res.json({ message: 'Comments fetched', data: comments });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, parent_id } = req.body;
    const sanitizedContent = sanitizeCommunityText(content);

    if (!sanitizedContent) {
      return res.status(400).json({ message: 'Content is required' });
    }

    const comment = await Comment.create({
      post_id: id,
      student_id: req.user.id,
      content: sanitizedContent,
      parent_id: parent_id || null,
    });

    const full = await Comment.findByPk(comment.id, {
      include: [{ model: Student, as: 'student', attributes: ['id', 'name', 'avatar_url'] }],
    });

    return res.status(201).json({ message: 'Comment added', data: full });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const reportPost = async (req, res) => {
  try {
    const { id } = req.params;
    const sanitizedReason = sanitizeCommunityText(req.body?.reason);
    const report = await Report.create({
      student_id: req.user.id,
      post_id: id,
      reason: sanitizedReason || null,
    });
    return res.json({ message: 'Report submitted', data: report });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const getRanking = async (req, res) => {
  try {
    const ranking = await Points.findAll({
      attributes: ['student_id', [sequelize.fn('SUM', sequelize.col('amount')), 'total_points']],
      include: [{ model: Student, as: 'student', attributes: ['id', 'name', 'avatar_url', 'enrollment'] }],
      group: ['student_id', 'student.id'],
      order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
      limit: 20,
    });

    return res.json({ message: 'Ranking fetched', data: ranking });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};
