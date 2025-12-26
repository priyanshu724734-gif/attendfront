import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Student, User } from '../models/User';
import { Course, Enrollment, AttendanceSession, AttendanceRecord } from '../models/Course';

// Helper: Haversine Distance (meters)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Helper: Euclidean Distance for Face (128D)
function getEuclideanDistance(d1: number[], d2: number[]) {
    if (!d1 || !d2 || d1.length !== d2.length) return 100; // Mismatch
    let sum = 0;
    for (let i = 0; i < d1.length; i++) {
        sum += (d1[i] - d2[i]) ** 2;
    }
    return Math.sqrt(sum);
}

export const registerFace = async (req: AuthRequest, res: Response) => {
    const { faceDescriptor } = req.body;
    console.log('Registering Face. Descriptor length:', faceDescriptor?.length);
    // faceDescriptor should be array of numbers
    const student = await Student.findOne({ user_id: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student profile not found' });

    student.face_data = faceDescriptor;
    await student.save();
    res.json({ message: 'Face data registered successfully' });
};

export const getStudentCourses = async (req: AuthRequest, res: Response) => {
    const student = await Student.findOne({ user_id: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const enrollments = await Enrollment.find({ student_id: student._id }).populate({
        path: 'course_id',
        populate: { path: 'faculty_id', populate: { path: 'user_id', select: 'name' } }
    });

    const data = await Promise.all(enrollments.map(async (enr: any) => {
        const course = enr.course_id;
        // Check active session
        const activeSession = await AttendanceSession.findOne({ course_id: course._id, is_active: true });

        // Calculate attendance %
        const totalSessions = await AttendanceSession.countDocuments({ course_id: course._id });
        const attended = await AttendanceRecord.countDocuments({ student_id: student._id, session_id: { $in: await AttendanceSession.find({ course_id: course._id }).distinct('_id') }, status: 'PRESENT' });

        // Check if student already marked attendance for this active session
        let hasMarkedAttendance = false;
        if (activeSession) {
            const attendanceRecord = await AttendanceRecord.findOne({
                session_id: activeSession._id,
                student_id: student._id
            });
            hasMarkedAttendance = !!attendanceRecord;
        }

        return {
            courseId: course._id,
            courseName: course.course_name,
            facultyName: course.faculty_id.user_id.name,
            totalClasses: totalSessions,
            attendedClasses: attended,
            attendancePercentage: totalSessions > 0 ? ((attended / totalSessions) * 100).toFixed(1) : 0,
            activeSession: activeSession ? {
                id: activeSession._id,
                type: activeSession.type,
                lat: activeSession.faculty_lat,
                lng: activeSession.faculty_lng,
                hasMarkedAttendance
            } : null
        };
    }));

    res.json({
        hasFaceData: student.face_data && student.face_data.length > 0,
        courses: data
    });
};

export const applyAttendance = async (req: AuthRequest, res: Response) => {
    const { sessionId, lat, lng, faceDescriptor, deviceFingerprint, isVpn, isDevMode } = req.body;

    // 1. Initial Checks (Mock Security)
    if (isVpn || isDevMode) {
        return res.status(403).json({ message: 'Security Alert: VPN or Developer Mode detected.' });
    }

    const session = await AttendanceSession.findById(sessionId);
    if (!session || !session.is_active) {
        return res.status(400).json({ message: 'Session is not active' });
    }

    const student = await Student.findOne({ user_id: req.user._id });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // 2. Already marked?
    const existing = await AttendanceRecord.findOne({ session_id: sessionId, student_id: student._id });
    if (existing) return res.status(400).json({ message: 'Attendance already marked for this session' });

    // 3. STRICT Device Check - One device per student PERMANENTLY
    if (!deviceFingerprint || deviceFingerprint.length < 10) {
        return res.status(403).json({ message: 'Invalid device fingerprint' });
    }

    if (student.device_fingerprint) {
        // Device already registered - MUST match exactly
        if (student.device_fingerprint !== deviceFingerprint) {
            console.log('Device mismatch:', { stored: student.device_fingerprint, received: deviceFingerprint });
            return res.status(403).json({
                message: 'Device mismatch detected. You can only use the device you registered with. Contact admin to reset.'
            });
        }
    } else {
        // First time - lock this device permanently
        student.device_fingerprint = deviceFingerprint;
        await student.save();
        console.log('Device locked for student:', student._id, 'Fingerprint:', deviceFingerprint);
    }

    // 4. Location Check (50m) - MANDATORY if session has location
    if (!lat || !lng) {
        return res.status(400).json({ message: 'Location is required for attendance' });
    }

    if (session.faculty_lat && session.faculty_lng) {
        const dist = getDistance(session.faculty_lat, session.faculty_lng, lat, lng);
        console.log('Distance check:', { distance: dist, threshold: 50 });

        if (dist > 50) {
            return res.status(400).json({
                message: `You are too far from the classroom. Distance: ${Math.round(dist)}m (Max: 50m)`
            });
        }
    }

    // 5. Face Check (If FACE type)
    if (session.type === 'FACE') {
        console.log('Verifying Face. Input len:', faceDescriptor?.length, 'Stored len:', student.face_data?.length);
        if (!faceDescriptor || faceDescriptor.length === 0) {
            return res.status(400).json({ message: 'Face data required for this session' });
        }
        // Match with stored
        if (!student.face_data || student.face_data.length === 0) {
            return res.status(400).json({ message: 'Face not registered. Please register first.' });
        }

        const dist = getEuclideanDistance(faceDescriptor, student.face_data);
        if (dist > 0.6) { // standard threshold
            return res.status(400).json({ message: 'Face verification failed.' });
        }
    }

    // Success
    await AttendanceRecord.create({
        session_id: sessionId,
        student_id: student._id,
        location_lat: lat,
        location_lng: lng,
        device_fingerprint: deviceFingerprint,
        status: 'PRESENT'
    });

    res.json({ message: 'Attendance marked successfully' });
};
