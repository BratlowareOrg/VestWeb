import { Router } from 'express';
import { login, teacherLogin, me, updateMe, uploadAvatar, changePassword, logout } from '../controllers/authController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import { authRateLimit } from '../middlewares/rateLimitMiddleware.js';
import { uploadAvatar as uploadMiddleware } from '../middlewares/uploadMiddleware.js';
import { validateBody } from '../middlewares/schemaValidationMiddleware.js';
import {
  changePasswordBodySchema,
  loginBodySchema,
  updateProfileBodySchema,
} from '../validators/authSchemas.js';

const router = Router();

router.post('/login', authRateLimit, validateBody(loginBodySchema), login);
router.post('/teacher-login', authRateLimit, validateBody(loginBodySchema), teacherLogin);
router.get('/me', authMiddleware, me);
router.put('/me', authMiddleware, validateBody(updateProfileBodySchema), updateMe);
router.post('/avatar', authMiddleware, (req, res, next) => {
  uploadMiddleware(req, res, (err) => {
    if (err) return res.status(400).json({ message: 'Arquivo de avatar invalido.' });
    next();
  });
}, uploadAvatar);
router.put('/change-password', authMiddleware, validateBody(changePasswordBodySchema), changePassword);
router.post('/logout', authMiddleware, logout);

export default router;
