import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { User, Faculty, Student } from './models/User';
import { Course, Enrollment } from './models/Course';

dotenv.config();

const seedData = async () => {
    await connectDB();

    console.log('Clearing old data...');
    await User.deleteMany({});
    await Faculty.deleteMany({});
    await Student.deleteMany({});
    await Course.deleteMany({});
    await Enrollment.deleteMany({});

    console.log('Creating Faculty...');
    const f1User = await User.create({ name: 'Dr. Smith', email: 'smith@univ.edu', password_hash: '123456', role: 'FACULTY' });
    const f2User = await User.create({ name: 'Dr. Jones', email: 'jones@univ.edu', password_hash: '123456', role: 'FACULTY' });

    const f1 = await Faculty.create({ user_id: f1User._id, department: 'CS' });
    const f2 = await Faculty.create({ user_id: f2User._id, department: 'EE' });

    console.log('Creating Courses...');
    const courses = [];
    courses.push(await Course.create({ course_name: 'Intro to CS', faculty_id: f1._id }));
    courses.push(await Course.create({ course_name: 'Data Structures', faculty_id: f1._id }));
    courses.push(await Course.create({ course_name: 'Algorithms', faculty_id: f1._id }));

    courses.push(await Course.create({ course_name: 'Circuits', faculty_id: f2._id }));
    courses.push(await Course.create({ course_name: 'Electronics', faculty_id: f2._id }));
    courses.push(await Course.create({ course_name: 'Signals', faculty_id: f2._id }));

    console.log('Creating Students...');
    // Create 60 students total for distribution? Or 30 per course?
    // "Each course has 30 students". If disjoint, 180 students. If shared, maybe 30 total enrolled in all?
    // "Students are pre-enrolled". I'll create 35 students and enroll them in various ways, or just 30 unique per course (180). 180 is a lot for a seeder delay.
    // I will create 30 students and enroll them in ALL courses or split.
    // "Each course has 30 students". I will create 30 students and enroll ALL of them in ALL 6 courses. Easy.

    const students = [];
    for (let i = 1; i <= 30; i++) {
        const sUser = await User.create({ name: `Student ${i}`, email: `student${i}@univ.edu`, password_hash: '123456', role: 'STUDENT' });
        const s = await Student.create({ user_id: sUser._id });
        students.push(s);
    }

    console.log('Enrolling Students...');
    const enrollments = [];
    for (const c of courses) {
        for (const s of students) {
            enrollments.push({ student_id: s._id, course_id: c._id });
        }
    }
    await Enrollment.insertMany(enrollments);

    console.log('Data Seeded!');
    process.exit();
};

seedData();
