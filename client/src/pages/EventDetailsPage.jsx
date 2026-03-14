import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvents } from '../context/EventContext';
import EventDetailsPopup from '../components/events/EventDetailsPopup';
import Loader from '../components/common/Loader';

const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getEvent } = useEvents();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true);
        const eventData = await getEvent(id);
        if (!eventData) {
          setError('Event not found');
          return;
        }
        setEvent(eventData);
      } catch (err) {
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, getEvent]);

  const handleClose = () => {
    navigate('/events');
  };

  if (loading) return <Loader />;
  if (error) return <div className="error">{error}</div>;
  if (!event) return <div className="error">Event not found</div>;

  return <EventDetailsPopup event={event} onClose={handleClose} />;
};

export default EventDetailsPage;