import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import facultyRoutes from './routes/facultyRoutes';
import studentRoutes from './routes/studentRoutes';

dotenv.config();

connectDB();

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' })); // Large limit for face descriptors/images

app.use('/api/auth', authRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);

app.get('/', (req, res) => {
    res.send('Smart Attendance API is running');
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
