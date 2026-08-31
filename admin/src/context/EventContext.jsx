// P:\project\Symposium\admin\src\context\EventContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const EventContext = createContext();

export const useEvents = () => useContext(EventContext);

export const EventProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      console.log('📡 Loading events from database...');
      const response = await axios.get(`${API_URL}/events`);
      
      const eventsData = response.data?.data || [];
      
      console.log(`✅ ${eventsData.length} events loaded from database`);
      setEvents(eventsData);
      setError(null);
    } catch (err) {
      console.error('❌ Error loading events:', err);
      setError('Failed to load events from database');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const getEvent = async (id) => {
    try {
      console.log('📡 Fetching event with ID:', id);
      
      if (!id) {
        console.error('❌ No ID provided to getEvent');
        return null;
      }
      
      // Fetch fresh from API
      const response = await axios.get(`${API_URL}/events/${id}`);
      
      if (response.data?.success && response.data?.data) {
        console.log('✅ Event fetched:', response.data.data.name);
        return response.data.data;
      }
      
      console.log('❌ Event not found in database');
      return null;
    } catch (err) {
      console.error('❌ Error fetching event:', err);
      throw err;
    }
  };

  // Get event with real registration counts (for admin dashboard)
  const getEventWithCount = async (id) => {
    try {
      console.log('📡 Fetching event with real counts:', id);
      
      if (!id) {
        console.error('❌ No ID provided to getEventWithCount');
        return null;
      }
      
      const response = await axios.get(`${API_URL}/events/${id}/with-count`);
      
      if (response.data?.success && response.data?.data) {
        console.log('✅ Event with counts fetched:', response.data.data.name);
        return response.data.data;
      }
      
      return null;
    } catch (err) {
      console.error('❌ Error fetching event with counts:', err);
      throw err;
    }
  };

  const refreshEvents = async () => {
    await loadEvents();
  };

  const value = {
    events,
    loading,
    error,
    loadEvents,
    getEvent,
    getEventWithCount,
    refreshEvents
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
};

export default EventContext;