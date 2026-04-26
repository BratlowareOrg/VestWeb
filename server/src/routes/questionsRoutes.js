import { Router } from 'express';
import {
  getAll, getById, createQuestion, updateQuestion, deleteQuestion,
  getSubjects, getTopics, getVestibulares, getYears,
  setTargetVestibular, submitAnswer, startPracticeSession,
} from '../controllers/questionsController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import requireTeacher from '../middlewares/requireTeacher.js';
import { validateBody } from '../middlewares/schemaValidationMiddleware.js';
import {
  setTargetVestibularBodySchema,
  submitAnswerBodySchema,
} from '../validators/questionsSchemas.js';

const router = Router();

router.get('/subjects', getSubjects);
router.get('/topics', getTopics);
router.get('/vestibulares', getVestibulares);
router.get('/years', getYears);
router.get('/', authMiddleware, getAll);
router.get('/:id', authMiddleware, getById);
router.post('/', authMiddleware, requireTeacher, createQuestion);
router.put('/:id', authMiddleware, requireTeacher, updateQuestion);
router.delete('/:id', authMiddleware, requireTeacher, deleteQuestion);
router.post('/session', authMiddleware, startPracticeSession);
router.post('/answer', authMiddleware, validateBody(submitAnswerBodySchema), submitAnswer);
router.post('/target-vestibular', authMiddleware, validateBody(setTargetVestibularBodySchema), setTargetVestibular);

export default router;
