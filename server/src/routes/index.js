import { Router } from 'express';
import authRoutes from './authRoutes.js';
import questionsRoutes from './questionsRoutes.js';
import simulationsRoutes from './simulationsRoutes.js';
import videosRoutes from './videosRoutes.js';
import communityRoutes from './communityRoutes.js';
import mentoringRoutes from './mentoringRoutes.js';
import calendarRoutes from './calendarRoutes.js';
import gamificationRoutes from './gamificationRoutes.js';
import landingRoutes from './landingRoutes.js';
import teacherRoutes from './teacherRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import essayRoutes from './essayRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/questions', questionsRoutes);
router.use('/simulations', simulationsRoutes);
router.use('/videos', videosRoutes);
router.use('/community', communityRoutes);
router.use('/mentoring', mentoringRoutes);
router.use('/calendar', calendarRoutes);
router.use('/gamification', gamificationRoutes);
router.use('/landing', landingRoutes);
router.use('/teacher', teacherRoutes);
router.use('/payments', paymentRoutes);
router.use('/essay', essayRoutes);
router.use('/admin', adminRoutes);

export default router;
