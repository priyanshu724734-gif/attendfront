import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:5001/api',
});

api.interceptors.request.use((config) => {
    const user = localStorage.getItem('user');
    if (user) {
        const { token } = JSON.parse(user);
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
