import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Faculty, User } from '../models/User';
import { AttendanceSession, Course, Enrollment, AttendanceRecord } from '../models/Course';

export const getFacultyCourses = async (req: AuthRequest, res: Response) => {
    // Find faculty profile for this user
    const faculty = await Faculty.findOne({ user_id: req.user._id });
    if (!faculty) return res.status(404).json({ message: 'Faculty profile not found' });

    const courses = await Course.find({ faculty_id: faculty._id });

    // Enrich with stats if needed, or separate call
    const enriched = await Promise.all(courses.map(async (c) => {
        const enrolledCount = await Enrollment.countDocuments({ course_id: c._id });
        // Check active session
        const activeSession = await AttendanceSession.findOne({ course_id: c._id, is_active: true });
        return {
            ...c.toObject(),
            enrolledCount,
            activeSession: activeSession ? activeSession._id : null
        };
    }));

    res.json(enriched);
};

export const startSession = async (req: AuthRequest, res: Response) => {
    const { courseId, type, lat, lng } = req.body;
    const faculty = await Faculty.findOne({ user_id: req.user._id });

    // Check if session already active
    const exist = await AttendanceSession.findOne({ course_id: courseId, is_active: true });
    if (exist) return res.status(400).json({ message: 'Session already active' });

    const session = await AttendanceSession.create({
        course_id: courseId,
        faculty_id: faculty?._id,
        type,
        faculty_lat: lat,
        faculty_lng: lng,
        is_active: true
    });

    res.json(session);
};

export const stopSession = async (req: AuthRequest, res: Response) => {
    const { sessionId } = req.body;
    const session = await AttendanceSession.findById(sessionId);
    if (session) {
        session.is_active = false;
        session.end_time = new Date();
        await session.save();
        res.json({ message: 'Session stopped' });
    } else {
        res.status(404).json({ message: 'Session not found' });
    }
};

export const getAttendanceStats = async (req: AuthRequest, res: Response) => {
    const { courseId } = req.params;

    // Get all sessions
    const sessions = await AttendanceSession.find({ course_id: courseId }).sort({ start_time: -1 });

    // Get all students
    const enrollments = await Enrollment.find({ course_id: courseId }).populate({
        path: 'student_id',
        populate: { path: 'user_id', select: 'name email' }
    });

    // For specific session details or overall? "Student-wise attendance table"
    // Let's build a matrix or list

    // Get all records for this course
    const sessionIds = sessions.map(s => s._id);
    const records = await AttendanceRecord.find({ session_id: { $in: sessionIds } });

    const stats = enrollments.map((enr: any) => {
        const student = enr.student_id;
        const studentRecords = records.filter(r => r.student_id.toString() === student._id.toString() && r.status === 'PRESENT');
        const percentage = sessions.length > 0 ? (studentRecords.length / sessions.length) * 100 : 0;

        return {
            studentId: student._id,
            name: student.user_id.name,
            email: student.user_id.email,
            totalPresent: studentRecords.length,
            percentage: percentage.toFixed(1)
        };
    });

    res.json({ sessions, stats });
};
