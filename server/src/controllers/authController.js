import { Student, Session, Teacher, TeacherSession } from '../db/models/index.js';
import { generateToken } from '../services/jwtService.js';
import { comparePassword, hashPassword } from '../services/hashService.js';
import { getRequestLogger } from '../services/logger.js';

const DEFAULT_COOKIE_NAME = 'vestweb_token';
const DEFAULT_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || DEFAULT_COOKIE_NAME;
const AUTH_COOKIE_MAX_AGE_MS = Number.parseInt(
  process.env.AUTH_COOKIE_MAX_AGE_MS ?? `${DEFAULT_COOKIE_MAX_AGE_MS}`,
  10,
);

const parseSameSite = (value) => {
  const normalized = String(value || 'lax').toLowerCase();
  if (normalized === 'strict' || normalized === 'none') return normalized;
  return 'lax';
};

const AUTH_COOKIE_SECURE = process.env.AUTH_COOKIE_SECURE
  ? process.env.AUTH_COOKIE_SECURE === 'true'
  : process.env.NODE_ENV === 'production';

const AUTH_COOKIE_SAME_SITE = parseSameSite(process.env.AUTH_COOKIE_SAME_SITE);

const cookieBaseOptions = {
  httpOnly: true,
  secure: AUTH_COOKIE_SECURE,
  sameSite: AUTH_COOKIE_SAME_SITE,
  path: '/',
};

const setAuthCookie = (res, token) => {
  const maxAge = Number.isFinite(AUTH_COOKIE_MAX_AGE_MS) && AUTH_COOKIE_MAX_AGE_MS > 0
    ? AUTH_COOKIE_MAX_AGE_MS
    : DEFAULT_COOKIE_MAX_AGE_MS;

  res.cookie(AUTH_COOKIE_NAME, token, { ...cookieBaseOptions, maxAge });
};

const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, cookieBaseOptions);
};

const getTokenFromRequest = (req) => {
  const tokenFromCookie = req.cookies?.[AUTH_COOKIE_NAME];
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : null;

  return tokenFromCookie || tokenFromHeader || null;
};

export const login = async (req, res) => {
  const requestLogger = getRequestLogger(req);

  try {
    const { enrollment, password } = req.body;
    if (!enrollment || !password) {
      return res.status(400).json({ message: 'MatrÃƒÂ­cula e senha sÃƒÂ£o obrigatÃƒÂ³rios' });
    }

    const student = await Student.findOne({ where: { enrollment } });
    if (!student) {
      return res.status(401).json({ message: 'MatrÃƒÂ­cula ou senha invÃƒÂ¡lidos' });
    }

    const isMatch = await comparePassword(password, student.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'MatrÃƒÂ­cula ou senha invÃƒÂ¡lidos' });
    }

    const token = generateToken({ id: student.id, type: 'student' });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await Session.create({ student_id: student.id, token, expires_at: expiresAt });

    setAuthCookie(res, token);

    return res.json({
      message: 'Login successful',
      data: { user: { ...student.toJSON(), type: 'student' }, token },
    });
  } catch (error) {
    requestLogger.error({ err: error, event: 'auth_login_error' }, 'Login error');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const teacherLogin = async (req, res) => {
  const requestLogger = getRequestLogger(req);

  try {
    const { enrollment, password } = req.body;
    if (!enrollment || !password) {
      return res.status(400).json({ message: 'MatrÃƒÂ­cula e senha sÃƒÂ£o obrigatÃƒÂ³rios' });
    }

    const teacher = await Teacher.findOne({ where: { enrollment } });
    if (!teacher) {
      return res.status(401).json({ message: 'MatrÃƒÂ­cula ou senha invÃƒÂ¡lidos' });
    }

    const isMatch = await comparePassword(password, teacher.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'MatrÃƒÂ­cula ou senha invÃƒÂ¡lidos' });
    }

    const token = generateToken({ id: teacher.id, type: 'teacher' });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await TeacherSession.create({ teacher_id: teacher.id, token, expires_at: expiresAt });

    setAuthCookie(res, token);

    return res.json({
      message: 'Login successful',
      data: { user: { ...teacher.toJSON(), type: 'teacher', role: 'teacher' }, token },
    });
  } catch (error) {
    requestLogger.error({ err: error, event: 'auth_teacher_login_error' }, 'Teacher login error');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const me = async (req, res) => {
  try {
    return res.json({ message: 'User data', data: req.user });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const uploadAvatar = async (req, res) => {
  const requestLogger = getRequestLogger(req);

  try {
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado' });

    const Model = req.user.type === 'teacher' ? Teacher : Student;
    const record = await Model.findByPk(req.user.id);
    if (!record) return res.status(404).json({ message: 'User not found' });

    const base64 = req.file.buffer.toString('base64');
    const avatar_url = `data:${req.file.mimetype};base64,${base64}`;
    await record.update({ avatar_url });
    return res.json({ message: 'Avatar updated', data: { avatar_url } });
  } catch (error) {
    requestLogger.error({ err: error, event: 'auth_upload_avatar_error' }, 'uploadAvatar error');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateMe = async (req, res) => {
  const requestLogger = getRequestLogger(req);

  try {
    const { name, email, avatar_url } = req.body;
    const Model = req.user.type === 'teacher' ? Teacher : Student;
    const record = await Model.findByPk(req.user.id);
    if (!record) return res.status(404).json({ message: 'User not found' });

    await record.update({ name, email, avatar_url });
    return res.json({ message: 'Profile updated', data: record });
  } catch (error) {
    requestLogger.error({ err: error, event: 'auth_update_profile_error' }, 'updateMe error');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const changePassword = async (req, res) => {
  const requestLogger = getRequestLogger(req);

  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'current_password e new_password sÃƒÂ£o obrigatÃƒÂ³rios' });
    }
    const Model = req.user.type === 'teacher' ? Teacher : Student;
    const record = await Model.findByPk(req.user.id);
    if (!record) return res.status(404).json({ message: 'User not found' });

    const isMatch = await comparePassword(current_password, record.password_hash);
    if (!isMatch) return res.status(401).json({ message: 'Senha atual incorreta' });

    const password_hash = await hashPassword(new_password);
    await record.update({ password_hash });
    return res.json({ message: 'Password updated' });
  } catch (error) {
    requestLogger.error({ err: error, event: 'auth_change_password_error' }, 'changePassword error');
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = async (req, res) => {
  const requestLogger = getRequestLogger(req);

  try {
    const token = getTokenFromRequest(req);
    if (token) {
      if (req.user?.type === 'teacher') {
        await TeacherSession.destroy({ where: { token } });
      } else {
        await Session.destroy({ where: { token } });
      }
    }

    clearAuthCookie(res);
    return res.json({ message: 'Logged out successfully' });
  } catch (error) {
    requestLogger.error({ err: error, event: 'auth_logout_error' }, 'logout error');
    return res.status(500).json({ message: 'Internal server error' });
  }
};
