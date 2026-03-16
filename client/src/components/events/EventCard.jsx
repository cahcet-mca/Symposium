// src/components/events/EventCard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSymposiumDate } from '../../context/DateContext';
import axios from 'axios';
import './EventCard.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://symposium-veyj.onrender.com/api';

const EventCard = ({ event, onViewDetails, registrationsOpen = true }) => {
  const [realCount, setRealCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventDetails, setEventDetails] = useState(event);
  const [registrationStatus, setRegistrationStatus] = useState(registrationsOpen);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { symposiumDate, formatEventDate } = useSymposiumDate();
  const navigate = useNavigate();

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
    console.warn(`Image not found for event: ${eventDetails.name}, file: ${eventDetails.image}`);
  };

  // Handle image load success
  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  // Get image source with simple filename
  const getImageSource = () => {
    if (!eventDetails.image || imageError) {
      return null;
    }
    
    try {
      const filename = eventDetails.image.split('/').pop();
      return new URL(`/src/assets/images/${filename}`, import.meta.url).href;
    } catch (error) {
      console.warn(`Failed to load image: ${eventDetails.image}`);
      return null;
    }
  };

  // Fetch REAL registration count from database
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
        setImageError(false);
      }
    } catch (error) {
      console.error('Error fetching real event data:', error);
      setEventDetails(event);
      setRealCount(event.registeredCount || 0);
    } finally {
      setLoading(false);
    }
  }, [event]);

  // Check registration status
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/settings/registrations-status`);
        if (response.data.success) {
          setRegistrationStatus(response.data.data.registrationsOpen);
        }
      } catch (error) {
        console.error('Error checking registration status:', error);
      }
    };

    checkRegistrationStatus();
  }, []);

  // Fetch on component mount
  useEffect(() => {
    fetchRealCount();
  }, [fetchRealCount]);

  // Handle register click
  const handleRegisterClick = (e) => {
    e.preventDefault();
    
    if (!registrationStatus) {
      alert('Online registration is finished. Only on-time registration is available at the venue.');
      return;
    }
    
    navigate(`/payment/${event._id}`);
  };

  // Handle coordinator phone click
  const handleCoordinatorCall = (phone) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

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

  const imageSrc = getImageSource();

  return (
    <div className={`event-card ${event.category?.toLowerCase()}`}>
      {/* Event Image with Sunshine Effect */}
      <div className="event-image-container">
        {imageSrc && !imageError ? (
          <img 
            src={imageSrc}
            alt={event.name}
            className={`event-image ${imageLoaded ? 'loaded' : 'loading'}`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
          />
        ) : (
          <div className="event-image-placeholder">
            <span>{event.subEventName?.charAt(0) || event.name.charAt(0)}</span>
          </div>
        )}
        <div className="event-badge">{event.category}</div>
        {/* Sunshine Effect Overlay */}
        <div className="sunshine-effect"></div>
      </div>
      
      <div className="event-content">
        <div className="event-type">
          <span className={`type-tag ${event.type?.toLowerCase()}`}>
            {event.type} Event
          </span>
        </div>
        
        <h3>{event.name}</h3>
        
        {/* Sub Event Name */}
        {eventDetails.subEventName && (
          <div className="event-subname">
            <span className="subname-icon">🏷️</span>
            <span className="subname-text">{eventDetails.subEventName}</span>
          </div>
        )}
        
        <p className="event-description">
          {event.description?.substring(0, 80)}...
        </p>
        
        <div className="event-details">
          <div className="detail-item">
            <span className="icon">🕐</span>
            <span>{event.startTime} - {event.endTime}</span>
          </div>
          <div className="detail-item">
            <span className="icon">📅</span>
            {/* Use symposiumDate instead of individual event date */}
            <span>{symposiumDate}</span>
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
          
          {/* Coordinator Details */}
          {(eventDetails.coordinatorName || eventDetails.coordinatorPhone) && (
            <div className="detail-item coordinator">
              <span className="icon">📞</span>
              <div className="coordinator-info">
                {eventDetails.coordinatorName && (
                  <span className="coordinator-name">{eventDetails.coordinatorName}</span>
                )}
                {eventDetails.coordinatorPhone && (
                  <button 
                    onClick={() => handleCoordinatorCall(eventDetails.coordinatorPhone)}
                    className="coordinator-call-btn"
                    title={`Call ${eventDetails.coordinatorPhone}`}
                  >
                    📞 {eventDetails.coordinatorPhone}
                  </button>
                )}
              </div>
            </div>
          )}
          
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
            onClick={() => onViewDetails(eventDetails)}
            className="btn-details"
          >
            View Details
          </button>
          {!registrationStatus ? (
            <button 
              onClick={handleRegisterClick}
              className="btn-register-closed"
              title="Online registration closed"
            >
              <span>🔒</span> Registration Closed
            </button>
          ) : (
            <button 
              onClick={handleRegisterClick}
              className="btn-register"
            >
              Register Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;