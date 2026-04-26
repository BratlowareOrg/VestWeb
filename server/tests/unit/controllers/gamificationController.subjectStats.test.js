import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockSequelizeQuery = jest.fn();

jest.unstable_mockModule('../../../src/db/models/index.js', () => ({
  Points: { findAll: jest.fn() },
  Badge: {},
  StudentBadge: { findAll: jest.fn() },
  Streak: { findOne: jest.fn() },
  Student: {},
  QuestionSession: { findAll: jest.fn() },
  Answer: { findAll: jest.fn() },
}));

jest.unstable_mockModule('../../../src/db/index.js', () => ({
  default: {
    query: mockSequelizeQuery,
    fn: jest.fn((name, col) => `${name}(${col})`),
    col: jest.fn((name) => name),
  },
}));

const { getSubjectStats } = await import('../../../src/controllers/gamificationController.js');

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe('gamificationController.getSubjectStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns subject metrics based on answers, topics and subjects', async () => {
    mockSequelizeQuery.mockResolvedValue([
      { subject_name: 'Biologia', total: '10', correct: '7' },
      { subject_name: 'Historia', total: '4', correct: '1' },
    ]);

    const req = { user: { id: 42 } };
    const res = makeRes();

    await getSubjectStats(req, res);

    expect(mockSequelizeQuery).toHaveBeenCalledWith(
      expect.stringContaining('JOIN questions q'),
      expect.objectContaining({ replacements: { student_id: 42 } }),
    );
    expect(mockSequelizeQuery).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN topics t'),
      expect.any(Object),
    );
    expect(mockSequelizeQuery).toHaveBeenCalledWith(
      expect.stringContaining('LEFT JOIN subjects s'),
      expect.any(Object),
    );
    expect(res.json).toHaveBeenCalledWith({
      message: 'Subject stats fetched',
      data: [
        { name: 'Biologia', total: 10, correct: 7, accuracy: 70 },
        { name: 'Historia', total: 4, correct: 1, accuracy: 25 },
      ],
    });
  });

  it('returns an empty list when there are no answered questions', async () => {
    mockSequelizeQuery.mockResolvedValue([]);
    const req = { user: { id: 7 } };
    const res = makeRes();

    await getSubjectStats(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Subject stats fetched',
      data: [],
    });
  });

  it('returns 500 when query fails', async () => {
    mockSequelizeQuery.mockRejectedValue(new Error('db down'));
    const req = { user: { id: 9 } };
    const res = makeRes();

    await getSubjectStats(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Internal server error',
    });
  });
});
