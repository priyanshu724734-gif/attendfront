# Deployment Guide for Smart Attendance System

This guide will help you host your MERN stack application for free using **Render (Backend)** and **Vercel (Frontend)**.

## Prerequisites
1.  **GitHub Account**: You must be logged in.
2.  **Git Installed**: You need to handle version control.
3.  **MongoDB Atlas**: Your database is already hosted (keep your connection string safe).

---

## Step 1: Push Code to GitHub
You need to push your local code to a GitHub repository.

1.  Log in to [GitHub](https://github.com) and create a **New Repository** (e.g., `smart-attendance`).
2.  Open your terminal in the project root (`/Users/priyanshuyadav/projects/newnewnew`) and run:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/YOUR_USERNAME/smart-attendance.git
    git push -u origin main
    ```
    *(Replace `YOUR_USERNAME` with your actual GitHub username)*

---

## Step 2: Deploy Backend (Render)
We will host the Node.js/Express server on Render.

1.  Go to [dashboard.render.com](https://dashboard.render.com) and sign up/login.
2.  Click **New +** -> **Web Service**.
3.  Connect your GitHub account and select the `smart-attendance` repository.
4.  **Configure Settings**:
    *   **Name**: `smart-attendance-backend`
    *   **Region**: Closest to you (e.g., Singapore or Frankfurt).
    *   **Root Directory**: `backend` (Important!)
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm start`
    *   **Instance Type**: Free
5.  **Environment Variables** (Scroll down to "Advanced"):
    *   Click **Add Environment Variable** for each:
        *   `MONGO_URI`: `mongodb+srv://priyanshuy4561_db_user:priyanshuhu@cluster0.yfpe0b7.mongodb.net/smart_attendance_db?retryWrites=true&w=majority&appName=Cluster0`
        *   `JWT_SECRET`: `super_secret_jwt_key_secure`
        *   `PORT`: `5000` (Render handles port binding automatically, but good to set).
6.  Click **Create Web Service**.
7.  **Wait** for the deployment to finish. Once done, copy the **URL** (e.g., `https://smart-attendance-backend.onrender.com`).

---

## Step 3: Deploy Frontend (Vercel)
We will host the React/Vite app on Vercel.

1.  Go to [vercel.com](https://vercel.com) and sign up/login.
2.  Click **Add New...** -> **Project**.
3.  Import the `smart-attendance` repository.
4.  **Configure Project**:
    *   **Framework Preset**: Vite (should detect automatically).
    *   **Root Directory**: Click "Edit" and select `frontend`.
5.  **Environment Variables**:
    *   **Name**: `VITE_API_URL`
    *   **Value**: The **Backend URL** you copied from Render (e.g., `https://smart-attendance-backend.onrender.com/api`).
    *   *Note: Make sure to add `/api` at the end if your backend routes start with it.*
6.  Click **Deploy**.

---

## Step 4: Final Connection Check
1.  Once Vercel finishes, click on the **Domian/Link** provided.
2.  Try to **Login** (`student1@univ.edu` / `123456`).
3.  If you see "Network Error", check the Console (F12) to see if the URL is correct.

## Troubleshooting
*   **CORS Error**: If the browser blocks the request, go to your Backend code (`server.ts`), ensure `app.use(cors({ origin: '*' }));` is present (it is currently set), ensuring it accepts requests from anywhere.
*   **Whitelisting**: In MongoDB Atlas, go to "Network Access" and ensure `0.0.0.0/0` (Allow Access from Anywhere) is active so Render can connect.
