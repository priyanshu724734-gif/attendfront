import express from 'express';
import { protect, facultyOnly } from '../middleware/authMiddleware';
import { getFacultyCourses, startSession, stopSession, getAttendanceStats } from '../controllers/facultyController';

const router = express.Router();

const asyncHandler = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next);

router.get('/courses', protect, facultyOnly, asyncHandler(getFacultyCourses));
router.post('/start-attendance', protect, facultyOnly, asyncHandler(startSession));
router.post('/stop-attendance', protect, facultyOnly, asyncHandler(stopSession));
router.get('/attendance-stats/:courseId', protect, facultyOnly, asyncHandler(getAttendanceStats));

export default router;
