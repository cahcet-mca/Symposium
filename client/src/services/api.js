// API Service - Connects to REAL MongoDB Database
import axios from 'axios';

// API Base URL - Updated to Render backend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://symposium-veyj.onrender.com/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 Request: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.code === 'ERR_NETWORK') {
      console.error('❌ Network Error - Cannot connect to server at:', API_BASE_URL);
      console.error('Please make sure the backend server is running');
    }
    
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// ============================================
// EVENTS API - REAL DATA FROM DATABASE
// ============================================

/**
 * Fetch all events with REAL registration counts
 */
export const fetchEvents = async () => {
  try {
    console.log('📡 Fetching events from database...');
    const response = await api.get('/events');
    
    // The events from /events endpoint might have stale registeredCount
    const events = response.data.data || [];
    
    // Fetch real counts for each event in parallel
    const eventsWithRealCounts = await Promise.all(
      events.map(async (event) => {
        try {
          // This endpoint returns the event with REAL registeredCount from database
          const countResponse = await api.get(`/events/${event._id}/with-count`);
          if (countResponse.data.success) {
            return countResponse.data.data;
          }
          return event;
        } catch (error) {
          console.warn(`⚠️ Could not fetch real count for ${event.name}, using stored value`);
          return event;
        }
      })
    );
    
    console.log(`✅ Fetched ${eventsWithRealCounts.length} events with real counts`);
    
    // Log each event's real count for debugging
    eventsWithRealCounts.forEach(event => {
      console.log(`   📊 ${event.name}: ${event.registeredCount}/${event.maxParticipants} registered (${Math.round((event.registeredCount/event.maxParticipants)*100)}%)`);
    });
    
    return {
      data: {
        success: true,
        count: eventsWithRealCounts.length,
        data: eventsWithRealCounts
      }
    };
  } catch (error) {
    console.error('❌ Error fetching events:', error);
    throw error;
  }
};

/**
 * Fetch single event by ID with REAL registration count
 */
export const fetchEvent = async (id) => {
  try {
    console.log(`📡 Fetching event ${id} from database...`);
    
    // Use the with-count endpoint to get REAL registered count
    const response = await api.get(`/events/${id}/with-count`);
    
    if (response.data.success) {
      const event = response.data.data;
      console.log(`✅ Event fetched: ${event.name}`);
      console.log(`   📊 Registered: ${event.registeredCount}/${event.maxParticipants} (${Math.round((event.registeredCount/event.maxParticipants)*100)}%)`);
      
      return {
        data: {
          success: true,
          data: event
        }
      };
    }
    
    return {
      data: {
        success: false,
        data: null
      }
    };
  } catch (error) {
    console.error('❌ Error fetching event:', error);
    throw error;
  }
};

// ============================================
// AUTH API
// ============================================

/**
 * Login user
 */
export const loginUser = async (credentials) => {
  try {
    console.log('📡 Logging in user...');
    const response = await api.post('/auth/login', credentials);
    
    if (response.data.success) {
      // Store token and user data
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
      console.log('✅ Login successful');
    }
    
    return response;
  } catch (error) {
    console.error('❌ Login error:', error.response?.data?.message || error.message);
    throw error;
  }
};

/**
 * Register new user
 */
export const registerUser = async (userData) => {
  try {
    console.log('📡 Registering new user...');
    const response = await api.post('/auth/register', userData);
    
    if (response.data.success) {
      // Store token and user data
      localStorage.setItem('token', response.data.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.data));
      console.log('✅ Registration successful');
    }
    
    return response;
  } catch (error) {
    console.error('❌ Registration error:', error.response?.data?.message || error.message);
    throw error;
  }
};

/**
 * Get user profile
 */
export const getProfile = async () => {
  try {
    const response = await api.get('/auth/profile');
    return response;
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    throw error;
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (profileData) => {
  try {
    const response = await api.put('/auth/profile', profileData);
    
    if (response.data.success) {
      // Update stored user data
      localStorage.setItem('user', JSON.stringify(response.data.data));
      console.log('✅ Profile updated');
    }
    
    return response;
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    throw error;
  }
};

// ============================================
// REGISTRATIONS API
// ============================================

/**
 * Register for an event (with payment verification)
 */
export const registerForEvent = async (registrationData) => {
  try {
    console.log('📡 Registering for event with payment...');
    const response = await api.post('/payments/verify', registrationData);
    
    if (response.data.success) {
      console.log('✅ Registration successful:', response.data.message);
    }
    
    return response;
  } catch (error) {
    console.error('❌ Registration error:', error.response?.data?.message || error.message);
    throw error;
  }
};

/**
 * Get user's registrations
 */
export const getMyRegistrations = async () => {
  try {
    console.log('📡 Fetching user registrations...');
    const response = await api.get('/registrations/myregistrations');
    
    if (response.data.success) {
      console.log(`✅ Fetched ${response.data.count} registrations`);
    }
    
    return response;
  } catch (error) {
    console.error('❌ Error fetching registrations:', error);
    throw error;
  }
};

/**
 * Check if user has time conflict with event
 */
export const checkTimeConflict = async (eventId) => {
  try {
    const response = await api.post('/registrations/check-conflict', { eventId });
    return response;
  } catch (error) {
    console.error('❌ Error checking time conflict:', error);
    throw error;
  }
};

/**
 * Check if user is registered for an event
 */
export const checkIfRegistered = async (eventId) => {
  try {
    const response = await api.post('/registrations/check-registered', { eventId });
    return response;
  } catch (error) {
    console.error('❌ Error checking registration status:', error);
    throw error;
  }
};

/**
 * Get verified registration count for an event
 */
export const getRegistrationCount = async (eventId) => {
  try {
    const response = await api.get(`/registrations/count/${eventId}`);
    return response;
  } catch (error) {
    console.error('❌ Error fetching registration count:', error);
    throw error;
  }
};

// ============================================
// PAYMENTS API
// ============================================

/**
 * Verify UPI payment
 */
export const verifyPayment = async (paymentData) => {
  try {
    console.log('📡 Verifying payment...');
    const response = await api.post('/payments/verify', paymentData);
    
    if (response.data.success) {
      console.log('✅ Payment verified successfully');
    }
    
    return response;
  } catch (error) {
    console.error('❌ Payment verification error:', error.response?.data?.message || error.message);
    throw error;
  }
};

/**
 * Get user's payment history
 */
export const getMyPayments = async () => {
  try {
    const response = await api.get('/payments/my-registrations');
    return response;
  } catch (error) {
    console.error('❌ Error fetching payments:', error);
    throw error;
  }
};

// ============================================
// ADMIN API (requires admin role)
// ============================================

/**
 * Sync all event counts with actual registrations (admin only)
 */
export const syncEventCounts = async () => {
  try {
    console.log('📡 Syncing event counts with database...');
    const response = await api.post('/events/admin/sync-counts');
    
    if (response.data.success) {
      console.log('✅ Event counts synced successfully');
      console.log('📊 Summary:', response.data.summary);
    }
    
    return response;
  } catch (error) {
    console.error('❌ Error syncing counts:', error);
    throw error;
  }
};

/**
 * Get all registrations (admin only)
 */
export const getAllRegistrations = async () => {
  try {
    const response = await api.get('/registrations/admin/all');
    return response;
  } catch (error) {
    console.error('❌ Error fetching all registrations:', error);
    throw error;
  }
};

/**
 * Get all transactions (admin only)
 */
export const getAllTransactions = async () => {
  try {
    const response = await api.get('/payments/transactions');
    return response;
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    throw error;
  }
};

// ============================================
// DEBUG API - Check database consistency
// ============================================

/**
 * Debug endpoint to check event counts (public for debugging)
 */
export const debugEventCounts = async () => {
  try {
    console.log('📡 Fetching debug event counts...');
    const response = await api.get('/events/debug/counts');
    
    if (response.data.success) {
      console.log('📊 Database Event Counts:');
      response.data.data.forEach(event => {
        const status = event.storedCount === event.actualCount ? '✅' : '❌';
        console.log(`   ${status} ${event.eventName}: stored=${event.storedCount}, actual=${event.actualCount}, capacity=${event.maxParticipants} (${event.percentage})`);
      });
    }
    
    return response;
  } catch (error) {
    console.error('❌ Debug endpoint not available:', error);
    return null;
  }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Logout user (clear local storage)
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  console.log('👋 Logged out');
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

/**
 * Get current user from localStorage
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

// Default export for backward compatibility
export default api;