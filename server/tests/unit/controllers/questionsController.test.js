import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockSequelizeQuery = jest.fn();
const mockSequelizeTransaction = jest.fn();
const mockQuestionFindByPk = jest.fn();
const mockQuestionCreate = jest.fn();
const mockAlternativeBulkCreate = jest.fn();

jest.unstable_mockModule('../../../src/db/models/index.js', () => ({
  Answer: {},
  Points: {},
  Streak: {},
  Question: {
    findByPk: mockQuestionFindByPk,
    create: mockQuestionCreate,
  },
  Alternative: {
    bulkCreate: mockAlternativeBulkCreate,
  },
  QuestionSession: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Student: { findByPk: jest.fn() },
  Vestibular: { findByPk: jest.fn() },
}));

jest.unstable_mockModule('../../../src/db/index.js', () => ({
  default: {
    query: mockSequelizeQuery,
    transaction: mockSequelizeTransaction,
  },
}));

const {
  getAll,
  getById,
  getSubjects,
  createQuestion,
  deleteQuestion,
} = await import('../../../src/controllers/questionsController.js');

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('questionsController.getAll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns questions and parsed count', async () => {
    mockSequelizeQuery
      .mockResolvedValueOnce([{ id: 1, statement: 'Q1' }])
      .mockResolvedValueOnce([{ count: '1' }]);

    const req = { query: {} };
    const res = makeRes();

    await getAll(req, res);

    expect(mockSequelizeQuery).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Questions fetched',
      data: {
        count: 1,
        rows: [{ id: 1, statement: 'Q1' }],
      },
    });
  });

  it('applies numeric replacements from query params', async () => {
    mockSequelizeQuery
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ count: '0' }]);

    const req = {
      query: {
        subject_id: '5',
        year: '2024',
        difficulty: 'medium',
        limit: '7',
        offset: '3',
      },
    };
    const res = makeRes();

    await getAll(req, res);

    const firstCallOptions = mockSequelizeQuery.mock.calls[0][1];
    expect(firstCallOptions.replacements).toEqual(expect.objectContaining({
      subject_id: 5,
      year: 2024,
      difficulty: 'medium',
      limit: 7,
      offset: 3,
    }));
  });
});

describe('questionsController.getById', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when question is missing', async () => {
    mockSequelizeQuery.mockResolvedValueOnce([]);

    const req = { params: { id: '999' } };
    const res = makeRes();

    await getById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Question not found' });
  });

  it('returns question payload when found', async () => {
    const question = { id: 10, statement: 'Q10' };
    mockSequelizeQuery.mockResolvedValueOnce([question]);

    const req = { params: { id: '10' } };
    const res = makeRes();

    await getById(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Question fetched', data: question });
  });
});

describe('questionsController.getSubjects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns subject list', async () => {
    const rows = [{ id: 1, name: 'Biologia' }];
    mockSequelizeQuery.mockResolvedValueOnce(rows);

    const req = {};
    const res = makeRes();

    await getSubjects(req, res);

    expect(res.json).toHaveBeenCalledWith({ message: 'Subjects fetched', data: rows });
  });
});

describe('questionsController.createQuestion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSequelizeTransaction.mockResolvedValue({
      commit: jest.fn(),
      rollback: jest.fn(),
    });
  });

  it('returns 400 when required fields are missing', async () => {
    const req = {
      user: { id: 2 },
      body: { topic_id: 1, difficulty: 'easy', alternatives: [{ text: 'A' }] },
    };
    const res = makeRes();

    await createQuestion(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockSequelizeTransaction).not.toHaveBeenCalled();
  });

  it('creates question and alternatives in a transaction', async () => {
    const tx = { commit: jest.fn(), rollback: jest.fn() };
    mockSequelizeTransaction.mockResolvedValue(tx);
    mockQuestionCreate.mockResolvedValue({ id: 55 });
    mockAlternativeBulkCreate.mockResolvedValue([]);

    const req = {
      user: { id: 9 },
      body: {
        statement: 'Pergunta teste',
        topic_id: 1,
        difficulty: 'easy',
        alternatives: [
          { letter: 'A', text: 'Opcao A', is_correct: true },
          { letter: 'B', text: 'Opcao B', is_correct: false },
        ],
      },
    };
    const res = makeRes();

    await createQuestion(req, res);

    expect(mockQuestionCreate).toHaveBeenCalled();
    expect(mockAlternativeBulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ question_id: 55, letter: 'A' }),
        expect.objectContaining({ question_id: 55, letter: 'B' }),
      ]),
      expect.objectContaining({ transaction: tx }),
    );
    expect(tx.commit).toHaveBeenCalledTimes(1);
    expect(tx.rollback).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('questionsController.deleteQuestion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when question does not exist', async () => {
    mockQuestionFindByPk.mockResolvedValue(null);

    const req = { params: { id: '404' } };
    const res = makeRes();

    await deleteQuestion(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Question not found' });
  });

  it('deletes question and returns success', async () => {
    const destroy = jest.fn();
    mockQuestionFindByPk.mockResolvedValue({ id: 1, destroy });

    const req = { params: { id: '1' } };
    const res = makeRes();

    await deleteQuestion(req, res);

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({ message: 'Question deleted' });
  });
});