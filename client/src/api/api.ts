/// <reference types="vite/client" />
import axios from 'axios';

const clearLegacyAuthStorage = () => {
  localStorage.removeItem('VestWeb_token');
  localStorage.removeItem('VestWeb_user');
  localStorage.removeItem('VestWeb_student');
};

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_BASE_URL as string | undefined)
    ?? (import.meta.env.VITE_API_URL as string | undefined)
    ?? '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearLegacyAuthStorage();
      window.dispatchEvent(new CustomEvent('vestweb:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
