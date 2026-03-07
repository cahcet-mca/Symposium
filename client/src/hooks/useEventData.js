import { useState, useEffect } from 'react';
import axios from 'axios';

const useEventData = (eventId, initialEvent = null) => {
  const [event, setEvent] = useState(initialEvent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [registrationStats, setRegistrationStats] = useState({
    registeredCount: initialEvent?.registeredCount || 0,
    maxParticipants: initialEvent?.maxParticipants || 0,
    availableSpots: 0,
    percentage: 0
  });

  const fetchEventData = async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Use the with-count endpoint that returns real data
      const response = await axios.get(
        `http://localhost:5000/api/events/${eventId}/with-count`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );

      if (response.data.success) {
        const eventData = response.data.data;
        setEvent(eventData);
        
        // Calculate stats
        const registered = eventData.registeredCount || 0;
        const max = eventData.maxParticipants || 0;
        const available = max - registered;
        const percent = max > 0 ? Math.round((registered / max) * 100) : 0;

        setRegistrationStats({
          registeredCount: registered,
          maxParticipants: max,
          availableSpots: available,
          percentage: percent
        });
      }
    } catch (err) {
      console.error('Error fetching event data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  return { event, loading, error, registrationStats, refetch: fetchEventData };
};

export default useEventData;