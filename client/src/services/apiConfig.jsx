// API Configuration for tecno rendezvous Frontend

// Base URL for backend API - Updated to Render
export const API_BASE_URL = import.meta.env.VITE_API_URL;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: `${API_BASE_URL}/auth/login`,
  REGISTER: `${API_BASE_URL}/auth/register`,
  PROFILE: `${API_BASE_URL}/auth/profile`,
  
  // Events
  EVENTS: `${API_BASE_URL}/events`,
  EVENT: (id) => `${API_BASE_URL}/events/${id}`,
  EVENT_WITH_COUNT: (id) => `${API_BASE_URL}/events/${id}/with-count`,
  
  // Registrations
  MY_REGISTRATIONS: `${API_BASE_URL}/registrations/myregistrations`,
  CHECK_CONFLICT: `${API_BASE_URL}/registrations/check-conflict`,
  CHECK_REGISTERED: `${API_BASE_URL}/registrations/check-registered`,
  REGISTRATION_COUNT: (id) => `${API_BASE_URL}/registrations/count/${id}`,
  
  // Payments
  VERIFY_PAYMENT: `${API_BASE_URL}/payments/verify`,
  MY_PAYMENTS: `${API_BASE_URL}/payments/my-registrations`,
};

export default API_BASE_URL;