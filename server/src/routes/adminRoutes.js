import { Router } from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import requireTeacher from '../middlewares/requireTeacher.js';
import {
  getStats,
  getStudents, updateStudent, deleteStudent,
  getQuestions, deleteQuestion,
  getVideos, deleteVideo,
  getSessions,
  getReports, deletePost, dismissReport,
} from '../controllers/adminController.js';

const router = Router();

router.use(authMiddleware, requireTeacher);

router.get('/stats', getStats);

router.get('/students', getStudents);
router.put('/students/:id', updateStudent);
router.delete('/students/:id', deleteStudent);

router.get('/questions', getQuestions);
router.delete('/questions/:id', deleteQuestion);

router.get('/videos', getVideos);
router.delete('/videos/:id', deleteVideo);

router.get('/sessions', getSessions);

router.get('/reports', getReports);
router.delete('/posts/:id', deletePost);
router.delete('/reports/:id', dismissReport);

export default router;
