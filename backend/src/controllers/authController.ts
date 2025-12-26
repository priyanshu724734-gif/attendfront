import { Request, Response } from 'express';
import { User, Faculty, Student } from '../models/User';
import jwt from 'jsonwebtoken';

const generateToken = (id: string, role: string) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
        expiresIn: '30d',
    });
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    console.log('Login attempt:', email);

    const user = await User.findOne({ email });
    if (!user) {
        console.log('User not found');
        return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await (user as any).matchPassword(password);
    console.log('Password match:', isMatch);

    if (isMatch) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken((user._id as any).toString(), user.role),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};
