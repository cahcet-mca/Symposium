import React, { createContext, useState, useContext, useEffect } from 'react';
import { fetchEvents, fetchEvent, registerForEvent } from '../services/api';

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
      const response = await fetchEvents();
      
      const eventsData = response.data?.data || [];
      
      // Log the REAL event IDs for debugging
      console.log('✅ Events loaded from database:');
      eventsData.forEach(event => {
        console.log(`   ${event.name}: ID = ${event._id}`);
      });
      
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
      
      // Check if ID is a valid MongoDB ObjectId (24 characters hex)
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(id);
      if (!isValidObjectId) {
        console.error('❌ Invalid MongoDB ObjectId format:', id);
        return null;
      }
      
      // Always fetch fresh from API to get real count
      const response = await fetchEvent(id);
      
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

  const registerForEventMock = async (registrationData) => {
    try {
      console.log('📡 Registering for event:', registrationData);
      const response = await registerForEvent(registrationData);
      return response.data;
    } catch (err) {
      console.error('❌ Error registering for event:', err);
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
    registerForEvent: registerForEventMock,
    refreshEvents
  };

  return (
    <EventContext.Provider value={value}>
      {children}
    </EventContext.Provider>
  );
};