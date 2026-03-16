// src/pages/Dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventContext';
import { useSymposiumDate } from '../context/DateContext'; // ← ADD THIS IMPORT
import axios from 'axios';
import Loader from '../components/common/Loader';
import EventDetailsPopup from '../components/events/EventDetailsPopup';
import './Dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://symposium-veyj.onrender.com/api';

const Dashboard = () => {
  const { user } = useAuth();
  const { events } = useEvents();
  const { symposiumDate } = useSymposiumDate(); // ← ADD THIS LINE
  const navigate = useNavigate();
  
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('myregistrations');
  const [registrationsOpen, setRegistrationsOpen] = useState(true);
  const [error, setError] = useState('');

  // State for REAL event stats from database
  const [eventStats, setEventStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(false);

  // State for event details popup
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    college: user?.college || '',
    department: user?.department || '',
    year: user?.year || 1,
    phone: user?.phone || ''
  });

  const [profileUpdateStatus, setProfileUpdateStatus] = useState({ show: false, message: '', type: '' });

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, redirecting to login');
      navigate('/login');
    }
  }, [navigate]);

  // Check registration status
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/settings/registrations-status`);
        if (response.data.success) {
          setRegistrationsOpen(response.data.data.registrationsOpen);
        }
      } catch (error) {
        console.error('Error checking registration status:', error);
      }
    };

    checkRegistrationStatus();
  }, []);

  // Helper function to get status display
  const getStatusDisplay = (status) => {
    const safeStatus = status || 'pending';
    
    switch (safeStatus) {
      case 'pending':
        return {
          className: 'status-pending',
          icon: '⏳',
          text: 'Pending Approval',
          color: '#ffa502'
        };
      case 'verified':
      case 'confirmed':
        return {
          className: 'status-confirmed',
          icon: '✅',
          text: 'Confirmed',
          color: '#2ecc71'
        };
      case 'rejected':
      case 'cancelled':
        return {
          className: 'status-rejected',
          icon: '❌',
          text: 'Rejected',
          color: '#ff4757'
        };
      default:
        return {
          className: 'status-pending',
          icon: '⏳',
          text: 'Pending',
          color: '#ffa502'
        };
    }
  };

  // Fetch user registrations
  const fetchUserRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, redirecting to login');
        navigate('/login');
        return;
      }

      console.log('📡 Fetching user registrations...');
      const response = await axios.get(`${API_URL}/registrations/myregistrations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        const registrationsData = Array.isArray(response.data.data) ? response.data.data : [];
        setRegisteredEvents(registrationsData);

        const pending = registrationsData.filter(r => r.paymentStatus === 'pending').length;
        const accepted = registrationsData.filter(r => r.paymentStatus === 'verified').length;
        const rejected = registrationsData.filter(r => r.paymentStatus === 'rejected').length;

        console.log(`✅ Fetched ${registrationsData.length} registrations`);
        console.log(`   📊 Pending: ${pending}, Accepted: ${accepted}, Rejected: ${rejected}`);
      } else {
        console.warn('Unexpected response format:', response.data);
        setRegisteredEvents([]);
      }
    } catch (error) {
      console.error('❌ Error fetching registrations:', error);
      
      if (error.response?.status === 401) {
        console.log('Session expired, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      } else {
        setError('Failed to load registrations. Please try again.');
        setRegisteredEvents([]);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Fetch all event real stats
  const fetchAllEventRealStats = useCallback(async () => {
    if (!events || events.length === 0) return;
    
    try {
      setStatsLoading(true);
      const statsPromises = events.map(async (event) => {
        if (!event || !event._id) return null;
        
        try {
          const response = await axios.get(
            `${API_URL}/events/${event._id}/with-count`
          );
          if (response.data.success) {
            const eventData = response.data.data;
            const registered = eventData.registeredCount || 0;
            const max = eventData.maxParticipants || 0;
            const percentage = max > 0 ? Math.round((registered / max) * 100) : 0;

            return {
              eventId: event._id,
              registeredCount: registered,
              maxParticipants: max,
              percentage: percentage,
              availableSpots: max - registered
            };
          }
        } catch (error) {
          console.error(`Error fetching real stats for ${event.name}:`, error);
          
          return {
            eventId: event._id,
            registeredCount: event.registeredCount || 0,
            maxParticipants: event.maxParticipants || 0,
            percentage: event.maxParticipants > 0
              ? Math.round(((event.registeredCount || 0) / event.maxParticipants) * 100)
              : 0,
            availableSpots: (event.maxParticipants || 0) - (event.registeredCount || 0)
          };
        }
      });

      const results = await Promise.all(statsPromises);
      const statsMap = {};
      results.forEach(result => {
        if (result) {
          statsMap[result.eventId] = result;
        }
      });
      setEventStats(statsMap);
      console.log('✅ Fetched REAL stats for all events');
    } catch (error) {
      console.error('Error fetching event stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [events]);

  // Initial data fetch
  useEffect(() => {
    fetchUserRegistrations();
  }, [fetchUserRegistrations]);

  // Fetch REAL stats for all events when on allevents tab
  useEffect(() => {
    if (activeTab === 'allevents' && events && events.length > 0) {
      fetchAllEventRealStats();
    }
  }, [activeTab, events, fetchAllEventRealStats]);

  // Handle view details click
  const handleViewDetails = async (event) => {
    if (!event || !event._id) {
      console.error('Invalid event object');
      return;
    }
    
    try {
      console.log('🔍 Dashboard fetching fresh event data for ID:', event._id);

      const response = await axios.get(
        `${API_URL}/events/${event._id}/with-count`
      );

      if (response.data.success) {
        const freshEventData = response.data.data;
        console.log('✅ Fresh event data received:', {
          name: freshEventData.name,
          registeredCount: freshEventData.registeredCount,
          maxParticipants: freshEventData.maxParticipants
        });

        setSelectedEvent(freshEventData);
        setShowPopup(true);

        setEventStats(prev => ({
          ...prev,
          [event._id]: {
            eventId: event._id,
            registeredCount: freshEventData.registeredCount,
            maxParticipants: freshEventData.maxParticipants,
            percentage: Math.round((freshEventData.registeredCount / freshEventData.maxParticipants) * 100),
            availableSpots: freshEventData.maxParticipants - freshEventData.registeredCount
          }
        }));
      } else {
        setSelectedEvent(event);
        setShowPopup(true);
      }
    } catch (error) {
      console.error('❌ Error fetching fresh event data:', error);
      setSelectedEvent(event);
      setShowPopup(true);
    }
  };

  // Close popup
  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedEvent(null);
    fetchUserRegistrations();
    if (activeTab === 'allevents') {
      fetchAllEventRealStats();
    }
  };

  // Handle profile change
  const handleProfileChange = (e) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value
    });
  };

  // Handle profile submit
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/auth/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
        setProfileUpdateStatus({
          show: true,
          message: 'Profile updated successfully!',
          type: 'success'
        });

        setTimeout(() => {
          setProfileUpdateStatus({ show: false, message: '', type: '' });
        }, 3000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileUpdateStatus({
        show: true,
        message: 'Failed to update profile',
        type: 'error'
      });

      setTimeout(() => {
        setProfileUpdateStatus({ show: false, message: '', type: '' });
      }, 3000);
    }
  };

  // Handle download ticket
  const handleDownloadTicket = (registration) => {
    try {
      const ticketHTML = generateTicketHTML(registration);
      const blob = new Blob([ticketHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${registration.eventName || 'event'}-${registration._id}.html`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading ticket:', error);
      alert('Failed to download ticket. Please try again.');
    }
  };

  // Generate ticket HTML
  const generateTicketHTML = (registration) => {
    const safeReg = {
      _id: registration._id || 'N/A',
      eventName: registration.eventName || 'Event',
      event: registration.event || {},
      teamSize: registration.teamSize || 1,
      teamName: registration.teamName || 'Individual',
      totalAmount: registration.totalAmount || 0,
      participants: registration.participants || [],
      user: registration.user || {}
    };
    
    const event = safeReg.event || {};
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Event Ticket - ${safeReg.eventName}</title>
        <style>
          body { 
            font-family: 'Inter', Arial, sans-serif; 
            background: #0a0a0a; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            margin: 0; 
            padding: 20px;
          }
          .ticket { 
            max-width: 700px; 
            background: linear-gradient(145deg, #1a1a1a, #0d0d0d); 
            border: 2px solid #ffd700; 
            border-radius: 20px; 
            padding: 40px; 
            color: white; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.8); 
            position: relative;
            overflow: hidden;
          }
          .ticket::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 5px;
            background: linear-gradient(90deg, #b8860b, #ffd700, #b8860b);
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid #ffd700; 
            padding-bottom: 20px; 
            margin-bottom: 20px; 
          }
          .header h1 { 
            color: #ffd700; 
            margin: 0; 
            font-size: 2.5em; 
            letter-spacing: 2px;
          }
          .header h2 {
            color: #ffffff;
            margin: 10px 0 0;
            font-size: 1.8em;
          }
          .details { 
            margin: 20px 0; 
          }
          .detail-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 12px 0; 
            border-bottom: 1px solid rgba(255,215,0,0.2); 
          }
          .label { 
            color: #b0b0b0; 
            font-weight: 600; 
          }
          .value { 
            color: #ffd700; 
            font-weight: 700; 
          }
          .participants { 
            margin-top: 20px; 
          }
          .participants h3 {
            color: #ffd700;
            margin-bottom: 15px;
          }
          .participant { 
            background: rgba(255,215,0,0.1); 
            padding: 12px; 
            border-radius: 10px; 
            margin-bottom: 10px; 
            border-left: 3px solid #ffd700;
          }
          .participant strong {
            color: #ffd700;
          }
          .qr { 
            text-align: center; 
            margin: 30px 0; 
          }
          .qr img { 
            width: 150px; 
            height: 150px;
            border: 2px solid #ffd700;
            border-radius: 10px;
            padding: 5px;
            background: white;
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            color: #b0b0b0; 
            font-size: 0.9em; 
            border-top: 1px solid rgba(255,215,0,0.2);
            padding-top: 20px;
          }
          .footer p {
            margin: 5px 0;
          }
          .registration-id {
            font-family: monospace;
            color: #ffd700;
            font-size: 1.1em;
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <h1>TECNO RENDEZVOUS 2026</h1>
            <h2>${safeReg.eventName}</h2>
          </div>
          <div class="details">
            <div class="detail-row">
              <span class="label">Registration ID:</span>
              <span class="value registration-id">${safeReg._id}</span>
            </div>
            <div class="detail-row">
              <span class="label">Date:</span>
              <span class="value">${symposiumDate || '26th July 2026'}</span>
            </div>
            <div class="detail-row">
              <span class="label">Time:</span>
              <span class="value">${event.startTime || 'TBA'} - ${event.endTime || 'TBA'}</span>
            </div>
            <div class="detail-row">
              <span class="label">Venue:</span>
              <span class="value">${event.venue || 'TBA'}</span>
            </div>
            <div class="detail-row">
              <span class="label">Team Size:</span>
              <span class="value">${safeReg.teamSize} members</span>
            </div>
            ${safeReg.teamName && safeReg.teamName !== 'Individual' ? `
            <div class="detail-row">
              <span class="label">Team Name:</span>
              <span class="value">${safeReg.teamName}</span>
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="label">Amount Paid:</span>
              <span class="value">₹${safeReg.totalAmount}</span>
            </div>
          </div>
          <div class="participants">
            <h3>👥 Participants</h3>
            ${safeReg.participants.length > 0 ? 
              safeReg.participants.map((p, index) => `
                <div class="participant">
                  <div><strong>${p.name || 'N/A'}</strong> ${index === 0 ? '(Team Lead)' : ''}</div>
                  <div style="color: #b0b0b0; font-size: 0.9em; margin-top: 5px;">
                    ${p.email || ''} | ${p.phone || ''}
                  </div>
                </div>
              `).join('') : 
              `<div class="participant">
                <div><strong>${safeReg.user?.name || 'N/A'}</strong> (Team Lead)</div>
                <div style="color: #b0b0b0; font-size: 0.9em; margin-top: 5px;">
                  ${safeReg.user?.email || ''} | ${safeReg.user?.phone || ''}
                </div>
              </div>`
            }
          </div>
          <div class="qr">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${safeReg._id}" alt="QR Code">
          </div>
          <div class="footer">
            <p>This is your official ticket. Please show this at the event entrance.</p>
            <p>📱 Scan QR code for quick check-in</p>
            <p style="color: #ffd700; margin-top: 10px;">✨ TECNO RENDEZVOUS 2026 - Think Big • Act Smart • Win Together ✨</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Get status color
  const getStatusColor = (stats) => {
    if (!stats) return '#2ecc71';
    if (stats.percentage >= 90) return '#ff4757';
    if (stats.percentage >= 70) return '#ffa502';
    return '#2ecc71';
  };

  // Get status text
  const getStatusText = (stats) => {
    if (!stats) return 'Available';
    if (stats.registeredCount >= stats.maxParticipants) return 'Event Full';
    if (stats.availableSpots <= 5) return 'Only Few Left!';
    if (stats.availableSpots <= 10) return 'Limited Spots';
    return 'Spots Available';
  };

  if (loading) return <Loader />;

  return (
    <div className="dashboard-page">
      <div className="dashboard-container">
        {error && (
          <div className="error-message" style={{
            background: 'rgba(255, 71, 87, 0.1)',
            border: '1px solid #ff4757',
            color: '#ff4757',
            padding: '15px 20px',
            borderRadius: '10px',
            marginBottom: '20px'
          }}>
            {error}
          </div>
        )}

        {!registrationsOpen && (
          <div className="registration-closed-banner" style={{
            background: 'linear-gradient(135deg, #ff4757, #ff6b81)',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '10px',
            marginBottom: '25px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontWeight: '600',
            boxShadow: '0 4px 15px rgba(255, 71, 87, 0.3)',
            animation: 'slideDown 0.5s ease'
          }}>
            <span style={{ fontSize: '1.5rem' }}>🔒</span>
            <span>Online registration is currently closed. You can still view your existing registrations and profile.</span>
          </div>
        )}

        {showPopup && selectedEvent && (
          <EventDetailsPopup
            event={selectedEvent}
            onClose={handleClosePopup}
            registrationsOpen={registrationsOpen}
          />
        )}

        <div className="profile-section">
          <div className="profile-cover">
            <div className="profile-avatar">
              <span className="avatar-initials">
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </span>
            </div>
          </div>

          <div className="profile-info">
            <h1 className="profile-name">{user?.name || 'User Name'}</h1>
            <p className="profile-email">{user?.email || 'user@example.com'}</p>

            <div className="profile-stats">
              <div className="stat-item">
                <span className="stat-value">{registeredEvents.length}</span>
                <span className="stat-label">Total Registrations</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {registeredEvents.filter(e => e.paymentStatus === 'pending').length}
                </span>
                <span className="stat-label">Pending</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  {registeredEvents.filter(e => e.paymentStatus === 'verified').length}
                </span>
                <span className="stat-label">Confirmed</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">
                  ₹{registeredEvents.reduce((sum, e) => sum + (e.totalAmount || 0), 0)}
                </span>
                <span className="stat-label">Total Paid</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-tabs">
          <button
            className={`tab-btn ${activeTab === 'myregistrations' ? 'active' : ''}`}
            onClick={() => setActiveTab('myregistrations')}
          >
            <span className="tab-icon">📋</span>
            My Registrations
          </button>
          <button
            className={`tab-btn ${activeTab === 'allevents' ? 'active' : ''}`}
            onClick={() => setActiveTab('allevents')}
          >
            <span className="tab-icon">📅</span>
            All Events
          </button>
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="tab-icon">👤</span>
            Profile Settings
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'myregistrations' && (
            <div className="registrations-tab">
              <h2 className="section-title">My Event Registrations</h2>

              {registeredEvents.length > 0 ? (
                <div className="registrations-grid">
                  {registeredEvents.map((registration) => {
                    const safeRegistration = {
                      _id: registration?._id || `temp-${Math.random()}`,
                      paymentStatus: registration?.paymentStatus || 'pending',
                      registrationStatus: registration?.registrationStatus || 'pending',
                      eventName: registration?.eventName || 'Unknown Event',
                      teamName: registration?.teamName || 'Individual',
                      teamSize: registration?.teamSize || 1,
                      totalAmount: registration?.totalAmount || 0,
                      transactionId: registration?.transactionId || 'N/A',
                      createdAt: registration?.createdAt,
                      event: registration?.event || {
                        category: 'Event',
                        startTime: 'TBA',
                        venue: 'TBA',
                        name: registration?.eventName || 'Unknown Event'
                      },
                      user: registration?.user || {},
                      participants: registration?.participants || []
                    };

                    const status = getStatusDisplay(safeRegistration.paymentStatus);

                    return (
                      <div key={safeRegistration._id} className="registration-card">
                        <div className="registration-header">
                          <span className={`event-status ${status.className}`}>
                            <span className="status-icon">{status.icon}</span>
                            {status.text}
                          </span>
                          <span className="event-category-tag">{safeRegistration.event?.category || 'Event'}</span>
                        </div>

                        <h3 className="event-name">{safeRegistration.eventName}</h3>

                        <div className="registration-details">
                          <div className="detail-row">
                            <span className="detail-label">📅 Date:</span>
                            <span className="detail-value">{symposiumDate}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">⏰ Time:</span>
                            <span className="detail-value">{safeRegistration.event?.startTime || 'TBA'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">📍 Venue:</span>
                            <span className="detail-value">{safeRegistration.event?.venue || 'TBA'}</span>
                          </div>
                          {safeRegistration.teamName && safeRegistration.teamName !== 'Individual' && (
                            <div className="detail-row">
                              <span className="detail-label">👥 Team:</span>
                              <span className="detail-value">{safeRegistration.teamName}</span>
                            </div>
                          )}
                          <div className="detail-row">
                            <span className="detail-label">📊 Team Size:</span>
                            <span className="detail-value">{safeRegistration.teamSize} members</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">💰 Amount:</span>
                            <span className="detail-value amount">₹{safeRegistration.totalAmount}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">🆔 Transaction:</span>
                            <span className="detail-value" style={{ fontSize: '0.85rem' }}>
                              {safeRegistration.transactionId?.substring(0, 12)}...
                            </span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">📊 Status:</span>
                            <span className="detail-value" style={{ color: status.color, fontWeight: 'bold' }}>
                              {status.icon} {status.text}
                            </span>
                          </div>
                        </div>

                        <div className="registration-actions">
                          <button
                            onClick={() => handleViewDetails(safeRegistration.event || {
                              ...safeRegistration,
                              _id: safeRegistration.event?._id || registration.eventId
                            })}
                            className="btn-view-details"
                          >
                            View Details
                          </button>
                          {safeRegistration.paymentStatus === 'verified' && (
                            <button
                              className="btn-download"
                              onClick={() => handleDownloadTicket(safeRegistration)}
                            >
                              <span className="btn-icon">📎</span>
                              Download Ticket
                            </button>
                          )}
                          {safeRegistration.paymentStatus === 'pending' && (
                            <div className="pending-message">
                              <span className="pending-icon">⏳</span>
                              <span>Awaiting Admin Approval</span>
                            </div>
                          )}
                          {safeRegistration.paymentStatus === 'rejected' && (
                            <div className="rejected-message">
                              <span className="rejected-icon">❌</span>
                              <span>Registration Rejected</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <h3>No Registrations Yet</h3>
                  <p>You have not registered for any events yet.</p>
                  <button
                    onClick={() => setActiveTab('allevents')}
                    className="btn-browse"
                  >
                    Browse Events
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'allevents' && (
            <div className="allevents-tab">
              <h2 className="section-title">All Events</h2>

              {!registrationsOpen && (
                <div className="registration-closed-warning">
                  <span className="warning-icon">🔒</span>
                  <span className="warning-text">
                    Online registration is currently closed. You cannot register for new events at this time.
                  </span>
                </div>
              )}

              {statsLoading ? (
                <div className="loading">Loading real-time event stats...</div>
              ) : events && events.length > 0 ? (
                <div className="allevents-grid">
                  {events.map((event) => {
                    if (!event || !event._id) return null;
                    
                    const isRegistered = registeredEvents.some(re =>
                      re.event?._id === event._id || re.eventId === event._id
                    );

                    const stats = eventStats[event._id] || {
                      registeredCount: event.registeredCount || 0,
                      maxParticipants: event.maxParticipants || 0,
                      percentage: event.maxParticipants > 0
                        ? Math.round(((event.registeredCount || 0) / event.maxParticipants) * 100)
                        : 0,
                      availableSpots: (event.maxParticipants || 0) - (event.registeredCount || 0)
                    };

                    return (
                      <div key={event._id} className="event-card">
                        <div className="event-badge">{event.category}</div>
                        <div className="event-type">
                          <span className={`type-tag ${event.type?.toLowerCase()}`}>
                            {event.type} Event
                          </span>
                        </div>

                        <h3 className="event-title">{event.name}</h3>
                        <p className="event-description">
                          {event.description?.substring(0, 100)}...
                        </p>

                        <div className="event-details">
                          <div className="detail-item">
                            <span className="icon">🕐</span>
                            <span>{event.startTime} - {event.endTime}</span>
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

                          <div className="detail-item registration-progress">
                            <span className="icon">📊</span>
                            <div className="progress-info" style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <span><strong>{stats.registeredCount}</strong>/{stats.maxParticipants} Registered</span>
                                <span style={{
                                  color: getStatusColor(stats),
                                  fontWeight: 'bold',
                                  fontSize: '0.85rem'
                                }}>
                                  {getStatusText(stats)}
                                </span>
                              </div>
                              <div className="progress-bar-small">
                                <div
                                  className="progress-fill-small"
                                  style={{
                                    width: `${stats.percentage}%`,
                                    backgroundColor: getStatusColor(stats)
                                  }}
                                ></div>
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#b0b0b0', marginTop: '2px' }}>
                                {stats.availableSpots} spots available
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="event-actions">
                          <button
                            onClick={() => handleViewDetails(event)}
                            className="btn-view-details"
                          >
                            View Details
                          </button>
                          {isRegistered ? (
                            <button className="btn-registered" disabled>
                              Already Registered
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                if (!registrationsOpen) {
                                  alert('Online registration is currently closed. You cannot register for new events.');
                                  return;
                                }
                                navigate(`/payment/${event._id}`);
                              }}
                              className="btn-register-now"
                            >
                              Register Now
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📅</div>
                  <h3>No Events Available</h3>
                  <p>Check back later for new events.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="profile-tab">
              <h2 className="section-title">Profile Settings</h2>

              {profileUpdateStatus.show && (
                <div className={`profile-update-message ${profileUpdateStatus.type}`}>
                  <span className="message-icon">{profileUpdateStatus.type === 'success' ? '✅' : '❌'}</span>
                  <span>{profileUpdateStatus.message}</span>
                </div>
              )}

              <form className="profile-form" onSubmit={handleProfileSubmit}>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    className="form-input"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="form-input"
                    disabled
                  />
                  <small className="field-note">Email cannot be changed</small>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>College</label>
                    <input
                      type="text"
                      name="college"
                      value={profileData.college}
                      onChange={handleProfileChange}
                      className="form-input"
                      placeholder="Enter your college name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      name="department"
                      value={profileData.department}
                      onChange={handleProfileChange}
                      className="form-input"
                      placeholder="Enter your department"
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Year of Study</label>
                    <select
                      name="year"
                      value={profileData.year}
                      onChange={handleProfileChange}
                      className="form-select"
                    >
                      <option value={1}>1st Year</option>
                      <option value={2}>2nd Year</option>
                      <option value={3}>3rd Year</option>
                      <option value={4}>4th Year</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      className="form-input"
                      placeholder="Enter 10-digit phone number"
                      pattern="[0-9]{10}"
                      maxLength="10"
                      required
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-save-glow">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="btn-change-password"
                    onClick={() => alert('Password change feature coming soon!')}
                  >
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;