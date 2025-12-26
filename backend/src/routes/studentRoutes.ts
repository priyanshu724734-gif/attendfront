import express from 'express';
import { protect, studentOnly } from '../middleware/authMiddleware';
import { registerFace, getStudentCourses, applyAttendance } from '../controllers/studentController';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);

router.post('/register-face', protect, studentOnly, asyncHandler(registerFace));
router.get('/courses', protect, studentOnly, asyncHandler(getStudentCourses));
router.post('/apply-attendance', protect, studentOnly, asyncHandler(applyAttendance));

export default router;
