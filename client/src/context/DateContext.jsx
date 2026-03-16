// src/context/DateContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://symposium-veyj.onrender.com/api';

const DateContext = createContext();

export const useSymposiumDate = () => useContext(DateContext);

export const DateProvider = ({ children }) => {
  const [symposiumDate, setSymposiumDate] = useState('26th July 2026');
  const [symposiumDateObj, setSymposiumDateObj] = useState(null);
  const [venue, setVenue] = useState('C. Abdul Hakeem College of Engineering and Technology');
  const [venueDetails, setVenueDetails] = useState('Master of Computer Application');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSymposiumSettings();
  }, []);

  const fetchSymposiumSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/symposium/settings`);
      if (response.data.success) {
        setSymposiumDate(response.data.data.formattedDate);
        setSymposiumDateObj(new Date(response.data.data.symposiumDate));
        setVenue(response.data.data.venue);
        setVenueDetails(response.data.data.venueDetails);
      }
    } catch (error) {
      console.error('Error fetching symposium settings:', error);
      // Fallback to default
      setSymposiumDate('26th July 2026');
    } finally {
      setLoading(false);
    }
  };

  // NEW: Always return symposium date (ignore individual event dates)
  const getEventDate = () => {
    return symposiumDate;
  };

  // Keep for backward compatibility but ignore the eventDate parameter
  const formatEventDate = (eventDate) => {
    return symposiumDate; // Always return symposium date
  };

  const value = {
    symposiumDate,
    symposiumDateObj,
    venue,
    venueDetails,
    loading,
    formatEventDate,  
    getEventDate,     
    refreshSettings: fetchSymposiumSettings
  };

  return (
    <DateContext.Provider value={value}>
      {children}
    </DateContext.Provider>
  );
};