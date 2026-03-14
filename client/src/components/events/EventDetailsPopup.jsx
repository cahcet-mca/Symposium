// src/components/events/EventDetailsPopup.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useSymposiumDate } from '../../context/DateContext';
import './EventDetailsPopup.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://symposium-veyj.onrender.com/api';

const EventDetailsPopup = ({ event, onClose, registrationsOpen = true }) => {
  const [eventDetails, setEventDetails] = useState(event);
  const [loading, setLoading] = useState(true);
  const [userRegistration, setUserRegistration] = useState(null);
  const [canRegister, setCanRegister] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { formatEventDate, symposiumDate } = useSymposiumDate();

  const [registrationStats, setRegistrationStats] = useState({
    registeredCount: 0,
    maxParticipants: 0,
    availableSpots: 0,
    percentage: 0
  });

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
    console.warn(`Popup image not found: ${eventDetails.image}`);
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
    } catch {
      return null;
    }
  };

  // Fetch latest event data from database with REAL count
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);

        const token = localStorage.getItem('token');

        console.log('🔍 EventDetailsPopup fetching data for event:', event._id);

        const response = await axios.get(
          `${API_URL}/events/${event._id}/with-count`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );

        if (response.data.success) {
          const latestEvent = response.data.data;
          setEventDetails(latestEvent);
          setImageError(false);

          const registered = latestEvent.registeredCount || 0;
          const max = latestEvent.maxParticipants || 0;
          const available = max - registered;
          const percent = max > 0 ? Math.round((registered / max) * 100) : 0;

          setRegistrationStats({
            registeredCount: registered,
            maxParticipants: max,
            availableSpots: available,
            percentage: percent
          });
        }

        if (isAuthenticated && token) {
          try {
            const regResponse = await axios.post(
              `${API_URL}/registrations/check-registered`,
              { eventId: event._id },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (regResponse.data.success) {
              setUserRegistration(regResponse.data.registration);
              setCanRegister(regResponse.data.canRegister);
            }
          } catch (regError) {
            console.error('Error checking registration:', regError);
          }
        }

      } catch (error) {
        console.error('Error fetching event details:', error);
        setEventDetails(event);

        const registered = event.registeredCount || 0;
        const max = event.maxParticipants || 0;
        const available = max - registered;
        const percent = max > 0 ? Math.round((registered / max) * 100) : 0;

        setRegistrationStats({
          registeredCount: registered,
          maxParticipants: max,
          availableSpots: available,
          percentage: percent
        });
      } finally {
        setLoading(false);
      }
    };

    if (event && event._id) {
      fetchEventData();
    }
  }, [event, isAuthenticated]);

  const isEventFull = () => {
    return registrationStats.registeredCount >= registrationStats.maxParticipants;
  };

  const getStatusColor = () => {
    const percentage = registrationStats.percentage;
    if (percentage >= 90) return '#ff4757';
    if (percentage >= 70) return '#ffa502';
    if (percentage > 0) return '#2ecc71';
    return '#2ecc71';
  };

  const getStatusText = () => {
    if (isEventFull()) return 'Event Full';
    if (registrationStats.availableSpots <= 5) return 'Only Few Spots Left!';
    if (registrationStats.availableSpots <= 10) return 'Limited Spots';
    return 'Spots Available';
  };

  const formatYear = (year) => {
    if (!year && year !== 0) return 'N/A';
    
    const yearNum = parseInt(year);
    if (isNaN(yearNum)) return year;
    
    const suffix = yearNum === 1 ? 'st' : yearNum === 2 ? 'nd' : yearNum === 3 ? 'rd' : 'th';
    return `${yearNum}${suffix} Year`;
  };

  if (!eventDetails) return null;

  const imageSrc = getImageSource();

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-container" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>×</button>

        {/* Event Image with Sunshine Effect */}
        <div className="popup-image-container">
          {imageSrc && !imageError ? (
            <img 
              src={imageSrc}
              alt={eventDetails.name}
              className={`popup-image ${imageLoaded ? 'loaded' : 'loading'}`}
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          ) : (
            <div className="popup-image-placeholder">
              <span>{eventDetails.subEventName?.charAt(0) || eventDetails.name.charAt(0)}</span>
            </div>
          )}
          <div className="sunshine-effect"></div>
        </div>

        <div className="popup-header">
          <h2>{eventDetails.name}</h2>
          
          {eventDetails.subEventName && (
            <div className="sub-event-name">
              <span className="sub-event-label">🏷️ Sub Event:</span>
              <span className="sub-event-value">{eventDetails.subEventName}</span>
            </div>
          )}
          
          <div className="badge-container">
            <span className={`category-badge ${eventDetails.category?.toLowerCase()}`}>
              {eventDetails.category}
            </span>
            <span className="type-badge">{eventDetails.type} Event</span>
          </div>
        </div>

        <div className="popup-content">
          {/* Registration Status Section */}
          <div className="popup-section registration-status-section">
            <h3>📊 Registration Status</h3>
            {loading ? (
              <div className="status-loading">Loading registration data...</div>
            ) : (
              <div className="status-card">
                <div className="status-header">
                  <div className="status-title">
                    <span className="status-indicator" style={{ backgroundColor: getStatusColor() }}></span>
                    <span className="status-text">{getStatusText()}</span>
                  </div>
                  <div className="status-update-time">
                    Live from Database
                  </div>
                </div>

                <div className="stats-grid">
                  <div className="stat-box">
                    <span className="stat-label">REGISTERED</span>
                    <span className="stat-value registered">{registrationStats.registeredCount}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">TOTAL CAPACITY</span>
                    <span className="stat-value total">{registrationStats.maxParticipants}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">AVAILABLE</span>
                    <span className="stat-value available">{registrationStats.availableSpots}</span>
                  </div>
                </div>

                <div className="progress-container">
                  <div className="progress-info">
                    <span>Fill Percentage</span>
                    <span style={{ color: getStatusColor(), fontWeight: 'bold' }}>{registrationStats.percentage}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${registrationStats.percentage}%`,
                        backgroundColor: getStatusColor()
                      }}
                    ></div>
                  </div>
                </div>

                {!isEventFull() && registrationStats.availableSpots <= 5 && (
                  <div className="limited-spots-warning">
                    🏃 Hurry! Only {registrationStats.availableSpots} spots left!
                  </div>
                )}

                {isEventFull() && (
                  <div className="full-event-warning">
                    ⚠️ This event has reached maximum capacity. Registration is closed.
                  </div>
                )}

                {!registrationsOpen && (
                  <div className="global-closure-warning">
                    🔒 Online registration is finished. Only on-time registration is available at the venue.
                  </div>
                )}

                {isAuthenticated && userRegistration && (
                  <div className="user-registration-status">
                    <div className={`status-badge ${userRegistration.paymentStatus}`}>
                      {userRegistration.paymentStatus === 'pending' && (
                        <>
                          <span className="status-icon">⏳</span>
                          Your registration is pending approval
                        </>
                      )}
                      {userRegistration.paymentStatus === 'verified' && (
                        <>
                          <span className="status-icon">✅</span>
                          You are registered for this event
                        </>
                      )}
                      {userRegistration.paymentStatus === 'rejected' && (
                        <>
                          <span className="status-icon">❌</span>
                          Your previous registration was rejected
                        </>
                      )}
                    </div>
                    
                    {userRegistration.paymentStatus === 'rejected' && (
                      <div className="rejected-message-small">
                        <p>✨ You can register again for this event.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Event Description */}
          <div className="popup-section">
            <h3>📝 Description</h3>
            <p className="event-description">{eventDetails.description}</p>
          </div>

          {/* Time & Venue */}
          <div className="popup-section">
            <h3>⏰ Time & Venue</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Start Time:</span>
                <span className="info-value">{eventDetails.startTime}</span>
              </div>
              <div className="info-item">
                <span className="info-label">End Time:</span>
                <span className="info-value">{eventDetails.endTime}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Date:</span>
                <span className="info-value">{formatEventDate(eventDetails.eventDate)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Venue:</span>
                <span className="info-value">{eventDetails.venue || 'To be announced'}</span>
              </div>
            </div>
          </div>

          {/* Team Details */}
          <div className="popup-section">
            <h3>👥 Team Details</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Team Size:</span>
                <span className="info-value">
                  {eventDetails.type === 'Individual'
                    ? 'Individual Participation'
                    : `${eventDetails.minTeamSize} - ${eventDetails.maxTeamSize} members`
                  }
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Registration Fee:</span>
                <span className="info-value fee">₹{eventDetails.fee} per person</span>
              </div>
            </div>
          </div>

          {/* Coordinator Details */}
          <div className="popup-section">
            <h3>📞 Coordinator Details</h3>
            <div className="info-grid coordinator-grid">
              <div className="info-item">
                <span className="info-label">Coordinator Name:</span>
                <span className="info-value coordinator-name">
                  {eventDetails.coordinatorName || 'To be announced'}
                </span>
              </div>
              {eventDetails.coordinatorPhone && (
                <div className="info-item">
                  <span className="info-label">Mobile Number:</span>
                  <span className="info-value coordinator-phone">
                    <a href={`tel:${eventDetails.coordinatorPhone}`} className="phone-link">
                      📞 {eventDetails.coordinatorPhone}
                    </a>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Requirements */}
          {eventDetails.requirements && eventDetails.requirements.length > 0 && (
            <div className="popup-section">
              <h3>📋 Requirements</h3>
              <ul className="requirements-list">
                {eventDetails.requirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Prizes */}
          <div className="popup-section">
            <h3>🏆 Prizes</h3>
            <div className="prizes-grid">
              {eventDetails.prizes?.first && (
                <div className="prize-item first">
                  <span className="prize-place">🥇 First</span>
                  <span className="prize-desc">{eventDetails.prizes.first}</span>
                </div>
              )}
              {eventDetails.prizes?.second && (
                <div className="prize-item second">
                  <span className="prize-place">🥈 Second</span>
                  <span className="prize-desc">{eventDetails.prizes.second}</span>
                </div>
              )}
              {eventDetails.prizes?.third && (
                <div className="prize-item third">
                  <span className="prize-place">🥉 Third</span>
                  <span className="prize-desc">{eventDetails.prizes.third}</span>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="popup-section meta-info">
            <small>Event ID: {eventDetails._id}</small>
            {eventDetails.createdAt && (
              <small>Created: {new Date(eventDetails.createdAt).toLocaleDateString()}</small>
            )}
          </div>
        </div>

        <div className="popup-footer">
          <button onClick={onClose} className="btn-close">Close</button>
          
          {!isEventFull() && canRegister && (
            registrationsOpen ? (
              <button
                onClick={() => window.location.href = `/payment/${eventDetails._id}`}
                className={`btn-register-popup ${userRegistration?.paymentStatus === 'rejected' ? 'rejected' : ''}`}
              >
                {userRegistration?.paymentStatus === 'rejected' ? (
                  <>
                    <span className="btn-icon">🔄</span>
                    Register Again
                  </>
                ) : (
                  <>
                    <span className="btn-icon">📝</span>
                    Register Now
                  </>
                )}
              </button>
            ) : (
              <div className="registrations-closed-message">
                <span className="closed-icon">🔒</span>
                <p>Online registration is finished.</p>
              </div>
            )
          )}
          
          {userRegistration?.paymentStatus === 'verified' && (
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="btn-register-popup verified"
            >
              <span className="btn-icon">📋</span>
              View in Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPopup;