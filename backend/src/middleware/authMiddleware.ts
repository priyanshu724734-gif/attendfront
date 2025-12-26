import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export interface AuthRequest extends Request {
    user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
            req.user = await User.findById(decoded.id).select('-password_hash');
            next();
        } catch (error) {
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

export const facultyOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'FACULTY') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized, faculty only' });
    }
};

export const studentOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'STUDENT') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized, student only' });
    }
};
