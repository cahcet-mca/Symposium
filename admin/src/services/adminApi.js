import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const adminApi = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

adminApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminData');
      localStorage.removeItem('adminLoggedIn');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Admin API Functions
export const fetchAllRegistrations = async (status = 'all') => {
  const response = await adminApi.get(`/admin/registrations?status=${status}`);
  return response.data;
};

export const updateRegistrationStatus = async (id, status) => {
  const response = await adminApi.put(`/admin/registrations/${id}/status`, { status });
  return response.data;
};

export const fetchAdminStats = async () => {
  const response = await adminApi.get('/admin/stats');
  return response.data;
};

export const toggleRegistrations = async () => {
  const response = await adminApi.put('/admin/settings/toggle-registrations');
  return response.data;
};

export const fetchSettings = async () => {
  const response = await adminApi.get('/admin/settings');
  return response.data;
};

export const promoteFromWaitlist = async (eventId, count = 1) => {
  const response = await adminApi.post(`/admin/events/${eventId}/promote-waitlist`, { count });
  return response.data;
};

export default adminApi;