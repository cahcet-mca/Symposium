// frontend/src/components/events/EventCard.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './EventCard.css';

// Use environment variable or Render URL
const API_URL = process.env.REACT_APP_API_URL || 'https://symposium-veyj.onrender.com/api';

const EventCard = ({ event, onViewDetails }) => {
  const [realCount, setRealCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventDetails, setEventDetails] = useState(event);

  // Fetch REAL registration count from database - wrapped in useCallback
  const fetchRealCount = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
        `${API_URL}/events/${event._id}/with-count`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      );
      
      if (response.data.success) {
        const realEventData = response.data.data;
        setEventDetails(realEventData);
        setRealCount(realEventData.registeredCount || 0);
        console.log(`✅ EventCard: ${event.name} - Real count: ${realEventData.registeredCount}/${realEventData.maxParticipants}`);
      }
    } catch (error) {
      console.error('Error fetching real event data:', error);
      setEventDetails(event);
      setRealCount(event.registeredCount || 0);
    } finally {
      setLoading(false);
    }
  }, [event]);

  // Fetch on component mount
  useEffect(() => {
    fetchRealCount();
  }, [fetchRealCount]);

  // Calculate available spots using real data
  const maxParticipants = eventDetails.maxParticipants || 0;
  const currentCount = realCount !== null ? realCount : (eventDetails.registeredCount || 0);
  const availableSpots = maxParticipants - currentCount;
  const percentage = maxParticipants > 0 ? Math.round((currentCount / maxParticipants) * 100) : 0;

  // Get status color based on fill percentage
  const getStatusColor = () => {
    if (percentage >= 90) return '#ff4757';
    if (percentage >= 70) return '#ffa502';
    return '#2ecc71';
  };

  // Get status text
  const getStatusText = () => {
    if (currentCount >= maxParticipants) return 'Event Full';
    if (availableSpots <= 5) return 'Only Few Left!';
    if (availableSpots <= 10) return 'Limited Spots';
    return 'Spots Available';
  };

  return (
    <div className={`event-card ${event.category?.toLowerCase()}`}>
      <div className="event-badge">{event.category}</div>
      <div className="event-type">
        <span className={`type-tag ${event.type?.toLowerCase()}`}>
          {event.type} Event
        </span>
      </div>
      
      <h3>{event.name}</h3>
      <p className="event-description">
        {event.description?.substring(0, 100)}...
      </p>
      
      <div className="event-details">
        <div className="detail-item">
          <span className="icon">🕐</span>
          <span>{event.startTime} - {event.endTime}</span>
        </div>
        <div className="detail-item">
          <span className="icon">📍</span>
          <span>{event.venue}</span>
        </div>
        <div className="detail-item">
          <span className="icon">👥</span>
          <span>
            {event.type === 'Individual' 
              ? 'Individual' 
              : `Team: ${event.minTeamSize}-${event.maxTeamSize} members`
            }
          </span>
        </div>
        <div className="detail-item fee">
          <span className="icon">💰</span>
          <span>₹{event.fee} per head</span>
        </div>
        
        {/* REAL REGISTRATION COUNT SECTION */}
        <div className="detail-item registration-count">
          <span className="icon">📊</span>
          <div className="registration-stats">
            {loading ? (
              <span>Loading counts...</span>
            ) : (
              <div className="stats-display">
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span><strong>{currentCount}</strong>/{maxParticipants} Registered</span>
                  <span style={{ color: getStatusColor(), fontWeight: 'bold' }}>
                    {getStatusText()}
                  </span>
                </div>
                <div className="stats-bar">
                  <div 
                    className="stats-fill" 
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: getStatusColor()
                    }}
                  ></div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#b0b0b0', marginTop: '2px' }}>
                  {availableSpots} spots left
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="event-footer">
        <button 
          onClick={() => onViewDetails(event)}
          className="btn-details"
        >
          View Details
        </button>
        <Link to={`/payment/${event._id}`} className="btn-register">
          Register Now
        </Link>
      </div>
    </div>
  );
};

export default EventCard;