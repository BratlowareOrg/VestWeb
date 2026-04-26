/// <reference types="vite/client" />
import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL as string | undefined) ?? '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('VestWeb_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('VestWeb_token');
      localStorage.removeItem('VestWeb_student');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
