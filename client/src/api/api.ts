import axios from 'axios';

const clearLegacyAuthStorage = () => {
  localStorage.removeItem('VestWeb_token');
  localStorage.removeItem('VestWeb_user');
  localStorage.removeItem('VestWeb_student');
};

const api = axios.create({
  baseURL: '/api/v1',
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
