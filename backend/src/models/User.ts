import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// --- User Schema ---
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password_hash: { type: String, required: true },
    role: { type: String, enum: ['FACULTY', 'STUDENT'], required: true },
});

userSchema.methods.matchPassword = async function (enteredPassword: string) {
    return await bcrypt.compare(enteredPassword, this.password_hash);
};

userSchema.pre('save', async function () {
    if (!this.isModified('password_hash')) {
        return;
    }
    const salt = await bcrypt.genSalt(10);
    this.password_hash = await bcrypt.hash(this.password_hash, salt);
});

export const User = mongoose.model('User', userSchema);

// --- Faculty Schema ---
const facultySchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, default: 'General' },
});

export const Faculty = mongoose.model('Faculty', facultySchema);

// --- Student Schema ---
const studentSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    face_data: { type: [Number], default: [] }, // Array of descriptors
    eye_data: { type: [Number], default: [] }, // Placeholder if needed
    device_fingerprint: { type: String, default: '' },
});

export const Student = mongoose.model('Student', studentSchema);
