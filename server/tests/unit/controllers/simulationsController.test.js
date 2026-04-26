import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// â”€â”€ Mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const mockSimulationFindAll = jest.fn();
const mockSimulationFindByPk = jest.fn();
const mockSimulationCreate = jest.fn();
const mockSimulationQuestionCreate = jest.fn();
const mockQuestionSessionCreate = jest.fn();
const mockQuestionSessionFindByPk = jest.fn();
const mockQuestionSessionFindAll = jest.fn();

jest.unstable_mockModule('../../../src/db/models/index.js', () => ({
  Simulation: {
    findAll: mockSimulationFindAll,
    findByPk: mockSimulationFindByPk,
    create: mockSimulationCreate,
  },
  SimulationQuestion: { create: mockSimulationQuestionCreate },
  Question: {},
  Alternative: {},
  QuestionSession: {
    create: mockQuestionSessionCreate,
    findByPk: mockQuestionSessionFindByPk,
    findAll: mockQuestionSessionFindAll,
  },
  Answer: {},
  Student: {},
}));

jest.unstable_mockModule('../../../src/db/index.js', () => ({ default: {} }));

const {
  getAll, getById, create, startSession, finishSession, getHistory,
} = await import('../../../src/controllers/simulationsController.js');

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const makeSimulation = (id = 1) => ({
  id,
  title: 'Simulado Medicina 2024',
  toJSON: () => ({ id }),
});

// â”€â”€ getAll â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe('simulationsController.getAll', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return all simulations', async () => {
    mockSimulationFindAll.mockResolvedValue([makeSimulation()]);
    const req = {};
    const res = makeRes();
    await getAll(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Simulations fetched', data: expect.any(Array) });
  });
});

// â”€â”€ getById â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe('simulationsController.getById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return simulation with questions', async () => {
    mockSimulationFindByPk.mockResolvedValue(makeSimulation());
    const req = { params: { id: '1' } };
    const res = makeRes();
    await getById(req, res);
    expect(res.json).toHaveBeenCalledWith({ message: 'Simulation fetched', data: expect.any(Object) });
  });

  it('should return 404 for unknown simulation', async () => {
    mockSimulationFindByPk.mockResolvedValue(null);
    const req = { params: { id: '999' } };
    const res = makeRes();
    await getById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

// â”€â”€ create â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe('simulationsController.create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 403 for a student', async () => {
    const req = { user: { role: 'student' }, body: {} };
    const res = makeRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should create simulation and link question_ids for a teacher', async () => {
    mockSimulationCreate.mockResolvedValue({ id: 5 });
    mockSimulationQuestionCreate.mockResolvedValue({});
    const req = {
      user: { id: 2, role: 'teacher' },
      body: { title: 'Simulado X', question_ids: [10, 11, 12] },
    };
    const res = makeRes();
    await create(req, res);
    expect(mockSimulationCreate).toHaveBeenCalled();
    expect(mockSimulationQuestionCreate).toHaveBeenCalledTimes(3);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// â”€â”€ startSession â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe('simulationsController.startSession', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should create a QuestionSession in simulation mode', async () => {
    mockSimulationFindByPk.mockResolvedValue(makeSimulation(1));
    mockQuestionSessionCreate.mockResolvedValue({ id: 99 });
    const req = { params: { id: '1' }, user: { id: 7 } };
    const res = makeRes();
    await startSession(req, res);
    expect(mockQuestionSessionCreate).toHaveBeenCalledWith(expect.objectContaining({
      student_id: 7,
      simulation_id: '1',
      mode: 'simulation',
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// â”€â”€ finishSession â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe('simulationsController.finishSession', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 404 when session does not exist', async () => {
    mockQuestionSessionFindByPk.mockResolvedValue(null);
    const req = { params: { sessionId: '999' }, user: { id: 7 } };
    const res = makeRes();
    await finishSession(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 403 when a different student tries to finish the session', async () => {
    mockQuestionSessionFindByPk.mockResolvedValue({
      id: 1, student_id: 10, answers: [],
      update: jest.fn(),
    });
    const req = { params: { sessionId: '1' }, user: { id: 7 } };
    const res = makeRes();
    await finishSession(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should calculate score correctly and return it', async () => {
    const mockUpdate = jest.fn();
    const session = {
      id: 1,
      student_id: 7,
      answers: [
        { is_correct: true },
        { is_correct: true },
        { is_correct: false },
        { is_correct: false },
      ],
      update: mockUpdate,
      toJSON: () => ({ id: 1, student_id: 7 }),
    };
    mockQuestionSessionFindByPk.mockResolvedValue(session);
    const req = { params: { sessionId: '1' }, user: { id: 7 } };
    const res = makeRes();
    await finishSession(req, res);
    expect(mockUpdate).toHaveBeenCalledWith({ finished_at: expect.any(Date) });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ score: 50, correct: 2, total: 4 }),
    }));
  });

  it('should return score=0 when there are no answers', async () => {
    const session = {
      id: 2, student_id: 7, answers: [],
      update: jest.fn(),
      toJSON: () => ({ id: 2 }),
    };
    mockQuestionSessionFindByPk.mockResolvedValue(session);
    const req = { params: { sessionId: '2' }, user: { id: 7 } };
    const res = makeRes();
    await finishSession(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ score: 0, correct: 0, total: 0 }),
    }));
  });
});
