import { verifyToken } from '../services/jwtService.js';
import { Student, Teacher, Session, TeacherSession } from '../db/models/index.js';

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'vestweb_token';

const unauthorized = (res) => res.status(401).json({ message: 'Invalid or expired token' });

const getTokenFromRequest = (req) => {
  const tokenFromCookie = req.cookies?.[AUTH_COOKIE_NAME];
  if (tokenFromCookie) return tokenFromCookie;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
};

const authMiddleware = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = verifyToken(token);

    const isTeacher = decoded.type === 'teacher';
    const sessionModel = isTeacher ? TeacherSession : Session;
    const userModel = isTeacher ? Teacher : Student;
    const sessionWhere = isTeacher
      ? { token, teacher_id: decoded.id }
      : { token, student_id: decoded.id };

    const session = await sessionModel.findOne({ where: sessionWhere });
    if (!session) {
      return unauthorized(res);
    }

    const expiresAt = new Date(session.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      await session.destroy();
      return unauthorized(res);
    }

    const user = await userModel.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = isTeacher
      ? { ...user.toJSON(), type: 'teacher', role: 'teacher' }
      : { ...user.toJSON(), type: 'student' };

    return next();
  } catch (error) {
    return unauthorized(res);
  }
};

export default authMiddleware;
