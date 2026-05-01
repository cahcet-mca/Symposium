import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://symposium-veyj.onrender.com/api';

const DateContext = createContext();

export const useSymposiumDate = () => useContext(DateContext);

export const DateProvider = ({ children }) => {
  const [symposiumDate, setSymposiumDate] = useState('26th July 2026');
  const [symposiumDateObj, setSymposiumDateObj] = useState(null);
  const [symposiumName, setSymposiumName] = useState('TECNO RENDEZVOUS');
  const [venue, setVenue] = useState('C. Abdul Hakeem College of Engineering and Technology');
  const [venueDetails, setVenueDetails] = useState('Master of Computer Application');
  const [upiId, setUpiId] = useState('8098932041@ptsbi');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSymposiumSettings();
  }, []);

  const fetchSymposiumSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📡 Fetching symposium settings...');
      const response = await axios.get(`${API_URL}/symposium/settings`);
      
      if (response.data.success) {
        const data = response.data.data;
        setSymposiumDate(data.formattedDate || '26th July 2026');
        setSymposiumDateObj(new Date(data.symposiumDate));
        setSymposiumName(data.symposiumName || 'TECNO RENDEZVOUS');
        setVenue(data.venue || 'C. Abdul Hakeem College of Engineering and Technology');
        setVenueDetails(data.venueDetails || 'Master of Computer Application');
        setUpiId(data.upiId || '8098932041@ptsbi');
        
        console.log('✅ Symposium settings loaded:', {
          name: data.symposiumName,
          date: data.formattedDate,
          venue: data.venue,
          upiId: data.upiId
        });
      }
    } catch (error) {
      console.error('❌ Error fetching symposium settings:', error);
      setError('Failed to load symposium settings');
      
      // Fallback to defaults
      setSymposiumDate('26th July 2026');
      setSymposiumName('TECNO RENDEZVOUS');
      setUpiId('8098932041@ptsbi');
    } finally {
      setLoading(false);
    }
  };

  // Get event date (always returns symposium date)
  const getEventDate = () => {
    return symposiumDate;
  };

  // Format event date (always returns symposium date)
  const formatEventDate = (eventDate) => {
    return symposiumDate;
  };

  // Refresh settings
  const refreshSettings = async () => {
    await fetchSymposiumSettings();
  };

  // Update methods for admin use
  const updateSymposiumName = async (newName) => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await axios.put(
        `${API_URL}/symposium/admin/name`,
        { name: newName },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.data.success) {
        setSymposiumName(newName);
        return { success: true, message: 'Symposium name updated successfully' };
      }
    } catch (error) {
      console.error('Error updating symposium name:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to update symposium name' 
      };
    }
  };

  const updateUpiId = async (newUpiId) => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await axios.put(
        `${API_URL}/symposium/admin/upi-id`,
        { upiId: newUpiId },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.data.success) {
        setUpiId(newUpiId);
        return { success: true, message: 'UPI ID updated successfully' };
      }
    } catch (error) {
      console.error('Error updating UPI ID:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to update UPI ID' 
      };
    }
  };

  const value = {
    // State values
    symposiumDate,
    symposiumDateObj,
    symposiumName,
    venue,
    venueDetails,
    upiId,
    loading,
    error,
    
    // Methods
    formatEventDate,
    getEventDate,
    refreshSettings,
    updateSymposiumName,
    updateUpiId,
  };

  return (
    <DateContext.Provider value={value}>
      {children}
    </DateContext.Provider>
  );
};

export default DateContext;