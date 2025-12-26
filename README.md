# Smart Attendance Management System

A production-ready full-stack web application for managing student attendance using Face Recognition and Geolocation.

## Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, MongoDB, Mongoose
- **AI/ML**: Face-API.js (TensorFlow.js) for Face Detection & Liveness Check
- **Security**: JWT Auth, Geolocation Validation, Device Fingerprinting

## Features
- **Faculty Dashboard**: Create courses, Start/Stop attendance sessions (Face/Simple), View Real-time Stats.
- **Student Dashboard**: Register Face ID, View Courses, Apply Attendance with Liveness Check.
- **Security**: VPN/Dev mode heuristics, Location fencing (50m), Single device policy.

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB Atlas URI (configured in backend/.env)

### 1. Backend Setup
```bash
cd backend
npm install
npm run seed  # Seeds the database with demo data (Faculty, Courses, Students)
npm start     # Starts server on port 5000
```
*Note: The `.env` file is already created with the provided MongoDB URI.*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
*Access the app at `http://localhost:5173`*

## Demo Credentials
### Faculty
- **Email**: `smith@univ.edu`
- **Password**: `123456`

### Student
- **Email**: `student1@univ.edu`
- **Password**: `123456`

## Usage Workflow
1. **Login as Faculty**: Start an "Attendance Session" (Face or Simple) for a course. Location permission is required.
2. **Login as Student**: Go to Dashboard.
3. **Register Face**: If new, click "Update Face Data" and follow instructions (Blink to verify).
4. **Mark Attendance**: Click "Mark Attendance". Camera opens -> Blink verification -> Face Match -> Success.
   - Must be within 50m of Faculty.
   - Must use same device.

## Project Structure
- `backend/src`: API Routes, Controllers, Models.
- `frontend/src`: React Pages, Components, Context.
