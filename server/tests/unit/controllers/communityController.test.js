import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockPostFindAndCountAll = jest.fn();
const mockPostFindByPk = jest.fn();
const mockPostCreate = jest.fn();
const mockLikeFindOne = jest.fn();
const mockLikeCreate = jest.fn();
const mockCommentFindAll = jest.fn();
const mockCommentCreate = jest.fn();
const mockCommentFindByPk = jest.fn();
const mockReportCreate = jest.fn();
const mockPointsCreate = jest.fn();
const mockPointsFindAll = jest.fn();

jest.unstable_mockModule('../../../src/db/models/index.js', () => ({
  Post: {
    findAndCountAll: mockPostFindAndCountAll,
    findByPk: mockPostFindByPk,
    create: mockPostCreate,
  },
  Comment: {
    findAll: mockCommentFindAll,
    create: mockCommentCreate,
    findByPk: mockCommentFindByPk,
  },
  Like: { findOne: mockLikeFindOne, create: mockLikeCreate },
  Report: { create: mockReportCreate },
  Student: {},
  Points: { create: mockPointsCreate, findAll: mockPointsFindAll },
}));

jest.unstable_mockModule('../../../src/db/index.js', () => ({
  default: { fn: jest.fn((fn, col) => `${fn}(${col})`), col: jest.fn(c => c) },
}));

const {
  getPosts,
  createPost,
  deletePost,
  likePost,
  addComment,
  reportPost,
} = await import('../../../src/controllers/communityController.js');

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

const makePost = (overrides = {}) => ({
  id: 1,
  student_id: 42,
  content: 'Hello community!',
  destroy: jest.fn(),
  toJSON() {
    return { id: this.id, student_id: this.student_id, likes: [], comments: [] };
  },
  ...overrides,
});

describe('communityController.getPosts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return paginated posts with computed like/comment counts', async () => {
    const post = makePost();
    mockPostFindAndCountAll.mockResolvedValue({ count: 1, rows: [post] });

    const req = { query: {}, user: { id: 42 } };
    const res = makeRes();

    await getPosts(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Posts fetched' }));
    const returned = res.json.mock.calls[0][0].data.rows[0];
    expect(returned.like_count).toBe(0);
    expect(returned.comment_count).toBe(0);
  });

  it('should set liked_by_me=true when current user has liked the post', async () => {
    const post = makePost({
      toJSON() {
        return { id: 1, student_id: 10, likes: [{ student_id: 42 }], comments: [] };
      },
    });
    mockPostFindAndCountAll.mockResolvedValue({ count: 1, rows: [post] });

    const req = { query: {}, user: { id: 42 } };
    const res = makeRes();

    await getPosts(req, res);

    const returned = res.json.mock.calls[0][0].data.rows[0];
    expect(returned.liked_by_me).toBe(true);
  });
});

describe('communityController.createPost', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 when content is empty', async () => {
    const req = { body: { content: '' }, user: { id: 1 } };
    const res = makeRes();

    await createPost(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Content is required' });
  });

  it('should return 400 when content becomes empty after sanitization', async () => {
    const req = { body: { content: '<img src=x onerror=alert(1)>' }, user: { id: 1 } };
    const res = makeRes();

    await createPost(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockPostCreate).not.toHaveBeenCalled();
  });

  it('should sanitize post content and award 5 community points', async () => {
    const post = makePost();
    mockPostCreate.mockResolvedValue(post);
    mockPointsCreate.mockResolvedValue({});
    mockPostFindByPk.mockResolvedValue(post);

    const req = {
      body: { content: ' <b>Hello community!</b> ' },
      user: { id: 42 },
    };
    const res = makeRes();

    await createPost(req, res);

    expect(mockPostCreate).toHaveBeenCalledWith(expect.objectContaining({ content: 'Hello community!' }));
    expect(mockPointsCreate).toHaveBeenCalledWith({ student_id: 42, amount: 5, reason: 'community' });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should return 500 when awarding points fails', async () => {
    const post = makePost();
    mockPostCreate.mockResolvedValue(post);
    mockPointsCreate.mockRejectedValue(new Error('points unavailable'));

    const req = { body: { content: 'Hello community!' }, user: { id: 42 } };
    const res = makeRes();

    await createPost(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal server error' });
  });
});

describe('communityController.deletePost', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 404 when post not found', async () => {
    mockPostFindByPk.mockResolvedValue(null);
    const req = { params: { id: '999' }, user: { id: 1, role: 'student' } };
    const res = makeRes();

    await deletePost(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 403 when a different student tries to delete', async () => {
    mockPostFindByPk.mockResolvedValue(makePost({ student_id: 99 }));
    const req = { params: { id: '1' }, user: { id: 42, role: 'student' } };
    const res = makeRes();

    await deletePost(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('should allow the post owner to delete', async () => {
    const post = makePost({ student_id: 42 });
    mockPostFindByPk.mockResolvedValue(post);

    const req = { params: { id: '1' }, user: { id: 42, role: 'student' } };
    const res = makeRes();

    await deletePost(req, res);

    expect(post.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Post deleted' });
  });

  it('should allow an admin to delete any post', async () => {
    const post = makePost({ student_id: 99 });
    mockPostFindByPk.mockResolvedValue(post);

    const req = { params: { id: '1' }, user: { id: 1, role: 'admin' } };
    const res = makeRes();

    await deletePost(req, res);

    expect(post.destroy).toHaveBeenCalled();
  });
});

describe('communityController.likePost', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should add a like when one does not exist yet', async () => {
    mockLikeFindOne.mockResolvedValue(null);
    mockLikeCreate.mockResolvedValue({});

    const req = { params: { id: '1' }, user: { id: 42 } };
    const res = makeRes();

    await likePost(req, res);

    expect(mockLikeCreate).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Post liked', data: { liked: true } });
  });

  it('should toggle like off when it already exists', async () => {
    const existing = { destroy: jest.fn() };
    mockLikeFindOne.mockResolvedValue(existing);

    const req = { params: { id: '1' }, user: { id: 42 } };
    const res = makeRes();

    await likePost(req, res);

    expect(existing.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Like removed', data: { liked: false } });
  });
});

describe('communityController.addComment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 when content is empty', async () => {
    const req = { params: { id: '1' }, body: { content: '' }, user: { id: 1 } };
    const res = makeRes();

    await addComment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should return 400 when content becomes empty after sanitization', async () => {
    const req = { params: { id: '1' }, body: { content: '<iframe src=x></iframe>' }, user: { id: 1 } };
    const res = makeRes();

    await addComment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockCommentCreate).not.toHaveBeenCalled();
  });

  it('should create a top-level comment with sanitized content when parent_id is not provided', async () => {
    const comment = { id: 5 };
    mockCommentCreate.mockResolvedValue(comment);
    mockCommentFindByPk.mockResolvedValue(comment);

    const req = {
      params: { id: '1' },
      body: { content: ' <i>Great post!</i> ' },
      user: { id: 42 },
    };
    const res = makeRes();

    await addComment(req, res);

    expect(mockCommentCreate).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Great post!',
      parent_id: null,
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should create a reply with sanitized content when parent_id is provided', async () => {
    const comment = { id: 6 };
    mockCommentCreate.mockResolvedValue(comment);
    mockCommentFindByPk.mockResolvedValue(comment);

    const req = {
      params: { id: '1' },
      body: { content: ' <b>Reply!</b> ', parent_id: 5 },
      user: { id: 42 },
    };
    const res = makeRes();

    await addComment(req, res);

    expect(mockCommentCreate).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Reply!',
      parent_id: 5,
    }));
  });
});

describe('communityController.reportPost', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should sanitize report reason before saving', async () => {
    mockReportCreate.mockResolvedValue({ id: 1 });

    const req = {
      params: { id: '10' },
      body: { reason: ' <b>Spam</b> ' },
      user: { id: 42 },
    };
    const res = makeRes();

    await reportPost(req, res);

    expect(mockReportCreate).toHaveBeenCalledWith({
      student_id: 42,
      post_id: '10',
      reason: 'Spam',
    });
    expect(res.json).toHaveBeenCalledWith({ message: 'Report submitted', data: { id: 1 } });
  });
});
