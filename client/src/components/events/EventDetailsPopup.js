import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import './EventDetailsPopup.css';

const EventDetailsPopup = ({ event, onClose }) => {
  const [eventDetails, setEventDetails] = useState(event);
  const [loading, setLoading] = useState(true);
  const [userRegistration, setUserRegistration] = useState(null);
  const { isAuthenticated } = useAuth(); // Removed 'user' since it's not used

  const [registrationStats, setRegistrationStats] = useState({
    registeredCount: 0,
    maxParticipants: 0,
    availableSpots: 0,
    percentage: 0
  });

  // Fetch latest event data from database with REAL count
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);

        // Get auth token
        const token = localStorage.getItem('token');

        console.log('🔍 EventDetailsPopup fetching data for event:', event._id);

        // Use the with-count endpoint that returns real count
        const response = await axios.get(
          `http://localhost:5000/api/events/${event._id}/with-count`,
          token ? { headers: { Authorization: `Bearer ${token}` } } : {}
        );

        if (response.data.success) {
          const latestEvent = response.data.data;
          setEventDetails(latestEvent);

          // Calculate registration stats using the REAL count
          const registered = latestEvent.registeredCount || 0;
          const max = latestEvent.maxParticipants || 0;
          const available = max - registered;
          const percent = max > 0 ? Math.round((registered / max) * 100) : 0;

          console.log(`📊 EventDetailsPopup REAL stats for ${latestEvent.name}:`);
          console.log(`   Registered: ${registered}`);
          console.log(`   Capacity: ${max}`);
          console.log(`   Available: ${available}`);
          console.log(`   Percentage: ${percent}%`);

          setRegistrationStats({
            registeredCount: registered,
            maxParticipants: max,
            availableSpots: available,
            percentage: percent
          });
        }

        // If user is logged in, check if they're registered for this event
        if (isAuthenticated && token) {
          try {
            const regResponse = await axios.post(
              'http://localhost:5000/api/registrations/check-registered',
              { eventId: event._id },
              { headers: { Authorization: `Bearer ${token}` } }
            );

            if (regResponse.data.success) {
              setUserRegistration(regResponse.data.registration);
            }
          } catch (regError) {
            console.error('Error checking registration:', regError);
          }
        }

      } catch (error) {
        console.error('Error fetching event details:', error);

        // Fallback to passed event data
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
    if (percentage >= 90) return '#ff4757'; // Red - Almost full
    if (percentage >= 70) return '#ffa502'; // Orange - Limited spots
    if (percentage > 0) return '#2ecc71'; // Green - Available
    return '#2ecc71'; // Default green
  };

  const getStatusText = () => {
    if (isEventFull()) return 'Event Full';
    if (registrationStats.availableSpots <= 5) return 'Only Few Spots Left!';
    if (registrationStats.availableSpots <= 10) return 'Limited Spots';
    return 'Spots Available';
  };

  if (!eventDetails) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-container" onClick={(e) => e.stopPropagation()}>
        <button className="popup-close" onClick={onClose}>×</button>

        <div className="popup-header">
          <h2>{eventDetails.name}</h2>
          <div className="badge-container">
            <span className={`category-badge ${eventDetails.category?.toLowerCase()}`}>
              {eventDetails.category}
            </span>
            <span className="type-badge">{eventDetails.type} Event</span>
          </div>
        </div>

        <div className="popup-content">
          {/* Registration Status Section - Shows REAL data from database */}
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

                {/* Show warning if event is almost full */}
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

                {/* Show user's registration status if logged in */}
                {isAuthenticated && userRegistration && (
                  <div className="user-registration-status">
                    <div className="status-badge registered">
                      ✅ You are registered for this event
                    </div>
                    <div className="registration-details-mini">
                      <small>Registration ID: {userRegistration._id}</small>
                      {userRegistration.teamName && userRegistration.teamName !== 'Individual' && (
                        <small>Team: {userRegistration.teamName}</small>
                      )}
                    </div>
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
                <span className="info-value">{eventDetails.date || '26th July 2026'}</span>
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
          {!isEventFull() && !userRegistration && (
            <button
              onClick={() => window.location.href = `/payment/${eventDetails._id}`}
              className="btn-register-popup"
            >
              Register Now
            </button>
          )}
          {userRegistration && (
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="btn-register-popup"
              style={{ background: '#2ecc71' }}
            >
              View in Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDetailsPopup;