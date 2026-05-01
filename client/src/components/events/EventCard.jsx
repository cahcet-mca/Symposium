import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSymposiumDate } from '../../context/DateContext';
import axios from 'axios';
import './EventCard.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://symposium-veyj.onrender.com/api';

const EventCard = ({ event, onViewDetails, registrationsOpen = true }) => {
  const [realCounts, setRealCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eventDetails, setEventDetails] = useState(event);
  const [registrationStatus, setRegistrationStatus] = useState(registrationsOpen);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { symposiumDate } = useSymposiumDate();
  const navigate = useNavigate();

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const getImageSource = () => {
    if (!eventDetails.image || imageError) {
      return null;
    }
    
    try {
      const filename = eventDetails.image.split('/').pop();
      return new URL(`/src/assets/images/${filename}`, import.meta.url).href;
    } catch (error) {
      return null;
    }
  };

  const fetchRealCounts = useCallback(async () => {
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
        setRealCounts({
          confirmed: realEventData.confirmedCount || 0,
          pending: realEventData.pendingCount || 0,
          maxParticipants: realEventData.maxParticipants || 0,
          isFull: realEventData.isFull || false
        });
        setImageError(false);
      }
    } catch (error) {
      console.error('Error fetching real event data:', error);
      setEventDetails(event);
      setRealCounts({
        confirmed: event.registeredCount || 0,
        pending: 0,
        maxParticipants: event.maxParticipants || 0,
        isFull: false
      });
    } finally {
      setLoading(false);
    }
  }, [event]);

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
    fetchRealCounts();
  }, [fetchRealCounts]);

  const handleRegisterClick = (e) => {
    e.preventDefault();
    
    if (!registrationStatus) {
      alert('Online registration is finished. Only on-time registration is available at the venue.');
      return;
    }
    
    navigate(`/payment/${event._id}`);
  };

  const handleCoordinatorCall = (phone) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    }
  };

  const confirmedCount = realCounts?.confirmed || 0;
  const pendingCount = realCounts?.pending || 0;
  const maxParticipants = realCounts?.maxParticipants || eventDetails.maxParticipants || 0;
  const isFull = realCounts?.isFull || (confirmedCount >= maxParticipants);
  
  // AVAILABLE SPOTS = TOTAL CAPACITY - (REGISTERED + WAITLIST)
  const availableSpots = maxParticipants - (confirmedCount + pendingCount);

  const imageSrc = getImageSource();

  return (
    <div className={`event-card ${event.category?.toLowerCase()}`}>
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
        <div className="sunshine-effect"></div>
      </div>
      
      <div className="event-content">
        <div className="event-type">
          <span className={`type-tag ${event.type?.toLowerCase()}`}>
            {event.type} Event
          </span>
        </div>
        
        <h3>{event.name}</h3>
        
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
          
          {/* REGISTRATION COUNT SECTION */}
          <div className="detail-item registration-count">
            <span className="icon">📊</span>
            <div className="registration-stats">
              {loading ? (
                <span>Loading...</span>
              ) : (
                <div className="stats-display-simple">
                  {/* First line: Registered count and waitlist */}
                  <div className="registration-summary">
                    <span className="registered-count">
                      <strong>{confirmedCount}</strong> / {maxParticipants} Registered
                    </span>
                    {pendingCount > 0 && (
                      <span className="waitlist-count">
                        · <strong>{pendingCount}</strong> on waitlist
                      </span>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  <div className="stats-bar">
                    <div 
                      className="stats-fill" 
                      style={{ 
                        width: `${((confirmedCount + pendingCount) / maxParticipants) * 100}%`,
                        backgroundColor: isFull ? '#ff4757' : '#2ecc71'
                      }}
                    ></div>
                  </div>
                  
                  {/* Second line: Spots available message (Capacity - Registered - Waitlist) */}
                  <div className="spots-message">
                    {availableSpots <= 0 ? (
                      <span style={{ color: '#ffa502' }}>
                        ⏳ Event Full - Join Waitlist
                      </span>
                    ) : (
                      <span style={{ color: '#2ecc71' }}>
                        {availableSpots} spots available
                      </span>
                    )}
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
            <button onClick={handleRegisterClick} className="btn-register-closed">
              <span>🔒</span> Registration Closed
            </button>
          ) : isFull ? (
            <button onClick={handleRegisterClick} className="btn-register waitlist-btn">
              <span>⏳</span> Join Waitlist
            </button>
          ) : (
            <button onClick={handleRegisterClick} className="btn-register">
              Register Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;