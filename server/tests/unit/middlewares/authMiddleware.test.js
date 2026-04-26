import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockVerifyToken = jest.fn();
const mockStudentFindByPk = jest.fn();
const mockTeacherFindByPk = jest.fn();
const mockSessionFindOne = jest.fn();
const mockTeacherSessionFindOne = jest.fn();

jest.unstable_mockModule('../../../src/services/jwtService.js', () => ({
  verifyToken: mockVerifyToken,
  generateToken: jest.fn(),
}));

jest.unstable_mockModule('../../../src/db/models/index.js', () => ({
  Student: { findByPk: mockStudentFindByPk },
  Teacher: { findByPk: mockTeacherFindByPk },
  Session: { findOne: mockSessionFindOne },
  TeacherSession: { findOne: mockTeacherSessionFindOne },
}));

const { default: authMiddleware } = await import('../../../src/middlewares/authMiddleware.js');

const makeReqRes = (authHeader) => {
  const req = { headers: authHeader ? { authorization: authHeader } : {} };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
};

describe('authMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows student request with valid token and active session', async () => {
    const fakeStudent = { id: 1, name: 'Ana', toJSON: () => ({ id: 1, name: 'Ana' }) };
    const fakeSession = {
      expires_at: new Date(Date.now() + 60_000),
      destroy: jest.fn(),
    };

    mockVerifyToken.mockReturnValue({ id: 1, type: 'student' });
    mockSessionFindOne.mockResolvedValue(fakeSession);
    mockStudentFindByPk.mockResolvedValue(fakeStudent);

    const { req, res, next } = makeReqRes('Bearer valid.student.token');
    await authMiddleware(req, res, next);

    expect(mockVerifyToken).toHaveBeenCalledWith('valid.student.token');
    expect(mockSessionFindOne).toHaveBeenCalledWith({
      where: { token: 'valid.student.token', student_id: 1 },
    });
    expect(mockStudentFindByPk).toHaveBeenCalledWith(1);
    expect(req.user).toEqual({ id: 1, name: 'Ana', type: 'student' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows teacher request with valid token and active session', async () => {
    const fakeTeacher = { id: 9, name: 'Prof', toJSON: () => ({ id: 9, name: 'Prof' }) };
    const fakeSession = {
      expires_at: new Date(Date.now() + 60_000),
      destroy: jest.fn(),
    };

    mockVerifyToken.mockReturnValue({ id: 9, type: 'teacher' });
    mockTeacherSessionFindOne.mockResolvedValue(fakeSession);
    mockTeacherFindByPk.mockResolvedValue(fakeTeacher);

    const { req, res, next } = makeReqRes('Bearer valid.teacher.token');
    await authMiddleware(req, res, next);

    expect(mockTeacherSessionFindOne).toHaveBeenCalledWith({
      where: { token: 'valid.teacher.token', teacher_id: 9 },
    });
    expect(mockTeacherFindByPk).toHaveBeenCalledWith(9);
    expect(req.user).toEqual({ id: 9, name: 'Prof', type: 'teacher', role: 'teacher' });
    expect(next).toHaveBeenCalledTimes(1);
  });


  it('returns 401 when Authorization header is missing', async () => {
    const { req, res, next } = makeReqRes(undefined);
    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when header does not start with Bearer', async () => {
    const { req, res, next } = makeReqRes('Basic token');
    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when session is not found', async () => {
    mockVerifyToken.mockReturnValue({ id: 1, type: 'student' });
    mockSessionFindOne.mockResolvedValue(null);

    const { req, res, next } = makeReqRes('Bearer token.without.session');
    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(mockStudentFindByPk).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 and destroys session when session is expired', async () => {
    const destroy = jest.fn().mockResolvedValue(undefined);
    mockVerifyToken.mockReturnValue({ id: 1, type: 'student' });
    mockSessionFindOne.mockResolvedValue({
      expires_at: new Date(Date.now() - 60_000),
      destroy,
    });

    const { req, res, next } = makeReqRes('Bearer expired.session.token');
    await authMiddleware(req, res, next);

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when user is not found in DB', async () => {
    mockVerifyToken.mockReturnValue({ id: 999, type: 'student' });
    mockSessionFindOne.mockResolvedValue({
      expires_at: new Date(Date.now() + 60_000),
      destroy: jest.fn(),
    });
    mockStudentFindByPk.mockResolvedValue(null);

    const { req, res, next } = makeReqRes('Bearer valid.token.here');
    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token verification fails', async () => {
    mockVerifyToken.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const { req, res, next } = makeReqRes('Bearer expired.token.here');
    await authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });
});
