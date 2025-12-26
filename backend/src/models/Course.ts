import mongoose from 'mongoose';

// --- Course Schema ---
const courseSchema = new mongoose.Schema({
    course_name: { type: String, required: true },
    faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
});

export const Course = mongoose.model('Course', courseSchema);

// --- Enrollment Schema ---
const enrollmentSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
});

export const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

// --- Attendance Session Schema ---
const sessionSchema = new mongoose.Schema({
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
    type: { type: String, enum: ['FACE', 'SIMPLE'], required: true },
    start_time: { type: Date, default: Date.now },
    end_time: { type: Date },
    faculty_lat: { type: Number },
    faculty_lng: { type: Number },
    is_active: { type: Boolean, default: true },
});

export const AttendanceSession = mongoose.model('AttendanceSession', sessionSchema);

// --- Attendance Record Schema ---
const recordSchema = new mongoose.Schema({
    session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    timestamp: { type: Date, default: Date.now },
    location_lat: { type: Number },
    location_lng: { type: Number },
    device_fingerprint: { type: String },
    status: { type: String, enum: ['PRESENT', 'REJECTED'], required: true },
});

export const AttendanceRecord = mongoose.model('AttendanceRecord', recordSchema);
