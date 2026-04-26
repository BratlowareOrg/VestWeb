import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockStudentFindOne = jest.fn();
const mockStudentFindByPk = jest.fn();
const mockTeacherFindOne = jest.fn();
const mockTeacherFindByPk = jest.fn();
const mockSessionCreate = jest.fn();
const mockSessionDestroy = jest.fn();
const mockTeacherSessionCreate = jest.fn();
const mockTeacherSessionDestroy = jest.fn();
const mockGenerateToken = jest.fn(() => 'mocked_jwt_token');
const mockComparePassword = jest.fn();
const mockHashPassword = jest.fn();

jest.unstable_mockModule('../../../src/db/models/index.js', () => ({
  Student: { findOne: mockStudentFindOne, findByPk: mockStudentFindByPk },
  Teacher: { findOne: mockTeacherFindOne, findByPk: mockTeacherFindByPk },
  Session: { create: mockSessionCreate, destroy: mockSessionDestroy },
  TeacherSession: { create: mockTeacherSessionCreate, destroy: mockTeacherSessionDestroy },
}));

jest.unstable_mockModule('../../../src/services/jwtService.js', () => ({
  generateToken: mockGenerateToken,
  verifyToken: jest.fn(),
}));

jest.unstable_mockModule('../../../src/services/hashService.js', () => ({
  comparePassword: mockComparePassword,
  hashPassword: mockHashPassword,
}));

const { login, teacherLogin, me, logout } = await import('../../../src/controllers/authController.js');

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  cookie: jest.fn().mockReturnThis(),
  clearCookie: jest.fn().mockReturnThis(),
});

const makeStudent = (overrides = {}) => ({
  id: 1,
  name: 'Ana Lima',
  enrollment: 'ANA001',
  email: 'ana@teste.com',
  password_hash: 'hashed_pw',
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      enrollment: this.enrollment,
      email: this.email,
    };
  },
  ...overrides,
});

describe('authController.login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when enrollment or password is missing', async () => {
    const req = { body: { enrollment: '', password: '' } };
    const res = makeRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'MatrÃƒÂ­cula e senha sÃƒÂ£o obrigatÃƒÂ³rios' });
  });

  it('returns 401 when student is not found', async () => {
    mockStudentFindOne.mockResolvedValue(null);
    const req = { body: { enrollment: 'UNKNOWN', password: '123' } };
    const res = makeRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'MatrÃƒÂ­cula ou senha invÃƒÂ¡lidos' });
  });

  it('returns 401 when password does not match', async () => {
    mockStudentFindOne.mockResolvedValue(makeStudent());
    mockComparePassword.mockResolvedValue(false);
    const req = { body: { enrollment: 'ANA001', password: 'wrong' } };
    const res = makeRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'MatrÃƒÂ­cula ou senha invÃƒÂ¡lidos' });
  });

  it('sets auth cookie and returns user payload on successful login', async () => {
    const student = makeStudent();
    mockStudentFindOne.mockResolvedValue(student);
    mockComparePassword.mockResolvedValue(true);
    mockSessionCreate.mockResolvedValue({});

    const req = { body: { enrollment: 'ANA001', password: 'correct' }, cookies: {} };
    const res = makeRes();

    await login(req, res);

    expect(mockGenerateToken).toHaveBeenCalledWith({ id: 1, type: 'student' });
    expect(mockSessionCreate).toHaveBeenCalledTimes(1);
    expect(res.cookie).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Login successful',
      data: expect.objectContaining({
        user: expect.objectContaining({ id: 1, type: 'student' }),
      }),
    }));
  });
});

describe('authController.teacherLogin', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when teacher is not found', async () => {
    mockTeacherFindOne.mockResolvedValue(null);
    const req = { body: { enrollment: 'PROF001', password: 'pw' } };
    const res = makeRes();

    await teacherLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'MatrÃƒÂ­cula ou senha invÃƒÂ¡lidos' });
  });

  it('sets auth cookie and returns teacher payload on success', async () => {
    const teacher = makeStudent({ id: 22, enrollment: 'PROF001' });
    mockTeacherFindOne.mockResolvedValue(teacher);
    mockComparePassword.mockResolvedValue(true);
    mockTeacherSessionCreate.mockResolvedValue({});

    const req = { body: { enrollment: 'PROF001', password: 'correct' }, cookies: {} };
    const res = makeRes();

    await teacherLogin(req, res);

    expect(mockGenerateToken).toHaveBeenCalledWith({ id: 22, type: 'teacher' });
    expect(mockTeacherSessionCreate).toHaveBeenCalledTimes(1);
    expect(res.cookie).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Login successful',
      data: expect.objectContaining({
        user: expect.objectContaining({ id: 22, type: 'teacher', role: 'teacher' }),
      }),
    }));
  });

});

describe('authController.me', () => {
  it('returns user data from req.user', async () => {
    const req = { user: { id: 1, name: 'Ana', type: 'student' } };
    const res = makeRes();

    await me(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'User data', data: req.user });
  });
});

describe('authController.logout', () => {
  beforeEach(() => jest.clearAllMocks());

  it('destroys student session and clears cookie when token comes from cookie', async () => {
    mockSessionDestroy.mockResolvedValue(1);
    const req = {
      headers: {},
      cookies: { vestweb_token: 'cookie.token.here' },
      user: { type: 'student' },
    };
    const res = makeRes();

    await logout(req, res);

    expect(mockSessionDestroy).toHaveBeenCalledWith({ where: { token: 'cookie.token.here' } });
    expect(res.clearCookie).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
  });

  it('destroys teacher session and clears cookie when token comes from bearer header', async () => {
    mockTeacherSessionDestroy.mockResolvedValue(1);
    const req = {
      headers: { authorization: 'Bearer bearer.token.here' },
      cookies: {},
      user: { type: 'teacher' },
    };
    const res = makeRes();

    await logout(req, res);

    expect(mockTeacherSessionDestroy).toHaveBeenCalledWith({ where: { token: 'bearer.token.here' } });
    expect(res.clearCookie).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ message: 'Logged out successfully' });
  });
});
