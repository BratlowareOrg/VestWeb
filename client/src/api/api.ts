/// <reference types="vite/client" />
import axios from 'axios';

const clearLegacyAuthStorage = () => {
  localStorage.removeItem('VestWeb_token');
  localStorage.removeItem('VestWeb_user');
  localStorage.removeItem('VestWeb_student');
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
    || import.meta.env.VITE_API_URL
    || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('vestweb_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearLegacyAuthStorage();
      localStorage.removeItem('vestweb_token');
      window.dispatchEvent(new CustomEvent('vestweb:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
