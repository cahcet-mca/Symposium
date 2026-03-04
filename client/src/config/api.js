// API Configuration
const getApiUrl = () => {
  // Get the current hostname
  const hostname = window.location.hostname;
  
  // If accessing via network IP, use that IP for API
  if (hostname === '10.64.217.53') {
    return `http://${hostname}:5000/api`;
  }
  
  // Default to localhost for local development
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getApiUrl();

// Export for use in other files
export default API_BASE_URL;