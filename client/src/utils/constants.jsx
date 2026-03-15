// API Endpoints
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://symposium-veyj.onrender.com/api';

// Event Categories
export const EVENT_CATEGORIES = {
  TECHNICAL: 'Technical',
  NON_TECHNICAL: 'Non-Technical',
  ALL: 'All'
};

// Event Types
export const EVENT_TYPES = {
  INDIVIDUAL: 'Individual',
  TEAM: 'Team',
  ALL: 'All'
};

// Event Status
export const EVENT_STATUS = {
  UPCOMING: 'Upcoming',
  ONGOING: 'Ongoing',
  COMPLETED: 'Completed'
};

// Registration Status
export const REGISTRATION_STATUS = {
  CONFIRMED: 'Confirmed',
  PENDING: 'Pending',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed'
};

// Payment Status
export const PAYMENT_STATUS = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  REFUNDED: 'Refunded'
};

// User Roles
export const USER_ROLES = {
  PARTICIPANT: 'participant',
  ORGANIZER: 'organizer',
  ADMIN: 'admin'
};

// Symposium Details
export const SYMPOSIUM = {
  NAME: 'TECNO RENDEZVOUS',
  TAGLINE: 'Innovate • Inspire • Integrate',
  DATE: '26th July 2026',
  VENUE: 'C. Abdul Hakeem College of Engineering and Technology (Auditorium)',
  TOTAL_EVENTS: 9,
  EXPECTED_PARTICIPANTS: '500+',
  ORGANIZER: 'C. Abdul Hakeem College of Engineering and Technology'
};

// Theme Colors
export const THEME_COLORS = {
  PRIMARY: '#b8860b',
  SECONDARY: '#ffd700',
  SUCCESS: '#2ecc71',
  DANGER: '#ff4757',
  WARNING: '#ffa502',
  INFO: '#70a1ff',
  LIGHT: '#f8f9fa',
  DARK: '#0a0a0a',
  WHITE: '#ffffff',
  GRADIENT: 'linear-gradient(135deg, #b8860b 0%, #ffd700 100%)'
};

// Local Storage Keys
export const LOCAL_STORAGE = {
  TOKEN: 'tecno_rendezvous_token',
  USER: 'TECNO_RENDEZVOUS_user'
};