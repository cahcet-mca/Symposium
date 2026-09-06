// src/pages/Dashboard.jsx - Updated with Scroll Animations

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEvents } from '../context/EventContext';
import { useSymposiumDate } from '../context/DateContext';
import axios from 'axios';
import Loader from '../components/common/Loader';
import EventDetailsPopup from '../components/events/EventDetailsPopup';
import { 
  FileTextIcon, 
  CalendarIcon, 
  UserIcon, 
  ClockIcon, 
  MapPinIcon, 
  UsersIcon, 
  DollarIcon, 
  TagIcon, 
  CheckIcon, 
  XIcon, 
  HourglassIcon, 
  LockIcon, 
  DownloadIcon,
  BarChartIcon
} from '../components/common/Icons';
import './Dashboard.css';

const API_URL = import.meta.env.VITE_API_URL;

const Dashboard = () => {
  const { user } = useAuth();
  const { events } = useEvents();
  const { symposiumDate, symposiumName } = useSymposiumDate();
  const navigate = useNavigate();
  
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('myregistrations');
  const [registrationsOpen, setRegistrationsOpen] = useState(true);
  const [error, setError] = useState('');

  const [eventStats, setEventStats] = useState({});
  const [statsLoading, setStatsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  // Refs for scroll animations
  const profileSectionRef = useRef(null);
  const tabsSectionRef = useRef(null);
  const contentSectionRef = useRef(null);
  const statsSectionRef = useRef(null);

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    college: user?.college || '',
    department: user?.department || '',
    year: user?.year || 1,
    phone: user?.phone || ''
  });

  const [profileUpdateStatus, setProfileUpdateStatus] = useState({ show: false, message: '', type: '' });

  // ============================================
  // SCROLL ANIMATIONS - Intersection Observer
  // ============================================
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -30px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-visible');
        }
      });
    }, observerOptions);

    // Observe all section elements
    const sections = [
      profileSectionRef.current,
      tabsSectionRef.current,
      contentSectionRef.current,
      statsSectionRef.current
    ].filter(Boolean);

    sections.forEach(section => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [loading, registeredEvents]);

  // ============================================
  // AUTH CHECK
  // ============================================
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // ============================================
  // CHECK REGISTRATION STATUS
  // ============================================
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

  // ============================================
  // STATUS DISPLAY HELPER
  // ============================================
  const getStatusDisplay = (registration) => {
    const status = registration.paymentStatus;
    const regStatus = registration.registrationStatus;
    
    if (regStatus === 'waitlist') {
      return {
        className: 'status-waitlist',
        icon: <FileTextIcon size={14} />,
        text: 'Waitlisted',
        color: '#ffa502'
      };
    }
    
    switch (status) {
      case 'pending':
        return {
          className: 'status-pending',
          icon: <HourglassIcon size={14} />,
          text: 'Pending Approval',
          color: '#ffa502'
        };
      case 'verified':
        return {
          className: 'status-confirmed',
          icon: <CheckIcon size={14} />,
          text: 'Confirmed',
          color: '#16a34a'
        };
      case 'rejected':
        return {
          className: 'status-rejected',
          icon: <XIcon size={14} />,
          text: 'Rejected',
          color: '#dc2626'
        };
      default:
        return {
          className: 'status-pending',
          icon: <HourglassIcon size={14} />,
          text: 'Pending',
          color: '#ffa502'
        };
    }
  };

  // ============================================
  // FETCH USER REGISTRATIONS
  // ============================================
  const fetchUserRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(`${API_URL}/registrations/myregistrations`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.success) {
        const registrationsData = Array.isArray(response.data.data) ? response.data.data : [];
        setRegisteredEvents(registrationsData);

        const pending = registrationsData.filter(r => r.paymentStatus === 'pending' && r.registrationStatus !== 'waitlist').length;
        const waitlist = registrationsData.filter(r => r.registrationStatus === 'waitlist').length;
        const accepted = registrationsData.filter(r => r.paymentStatus === 'verified').length;
        const rejected = registrationsData.filter(r => r.paymentStatus === 'rejected').length;

        console.log(`✅ Fetched ${registrationsData.length} registrations`);
        console.log(`   📊 Pending: ${pending}, Waitlist: ${waitlist}, Accepted: ${accepted}, Rejected: ${rejected}`);
      } else {
        setRegisteredEvents([]);
      }
    } catch (error) {
      console.error('❌ Error fetching registrations:', error);
      if (error.response?.status === 401) {
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

  // ============================================
  // FETCH EVENT STATS
  // ============================================
  const fetchAllEventRealStats = useCallback(async () => {
    if (!events || events.length === 0) return;
    
    try {
      setStatsLoading(true);
      const statsPromises = events.map(async (event) => {
        if (!event || !event._id) return null;
        
        try {
          const response = await axios.get(`${API_URL}/events/${event._id}/with-count`);
          if (response.data.success) {
            const eventData = response.data.data;
            const confirmed = eventData.confirmedCount || 0;
            const pending = eventData.pendingCount || 0;
            const max = eventData.maxParticipants || 0;
            const availableSpots = max - (confirmed + pending);
            const percentage = max > 0 ? Math.round(((confirmed + pending) / max) * 100) : 0;
            
            return {
              eventId: event._id,
              confirmedCount: confirmed,
              pendingCount: pending,
              maxParticipants: max,
              availableSpots: availableSpots < 0 ? 0 : availableSpots,
              percentage: percentage,
              isFull: confirmed >= max
            };
          }
        } catch (error) {
          console.error(`Error fetching real stats for ${event.name}:`, error);
          const confirmed = event.registeredCount || 0;
          const max = event.maxParticipants || 0;
          const pending = 0;
          const percentage = max > 0 ? Math.round(((confirmed + pending) / max) * 100) : 0;
          return {
            eventId: event._id,
            confirmedCount: confirmed,
            pendingCount: 0,
            maxParticipants: max,
            availableSpots: max - confirmed,
            percentage: percentage,
            isFull: false
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
    } catch (error) {
      console.error('Error fetching event stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, [events]);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    fetchUserRegistrations();
  }, [fetchUserRegistrations]);

  useEffect(() => {
    if (activeTab === 'allevents' && events && events.length > 0) {
      fetchAllEventRealStats();
    }
  }, [activeTab, events, fetchAllEventRealStats]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleViewDetails = async (event) => {
    if (!event || !event._id) return;
    
    try {
      const response = await axios.get(`${API_URL}/events/${event._id}/with-count`);
      if (response.data.success) {
        setSelectedEvent(response.data.data);
        setShowPopup(true);
      } else {
        setSelectedEvent(event);
        setShowPopup(true);
      }
    } catch (error) {
      console.error('Error fetching fresh event data:', error);
      setSelectedEvent(event);
      setShowPopup(true);
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedEvent(null);
    fetchUserRegistrations();
    if (activeTab === 'allevents') {
      fetchAllEventRealStats();
    }
  };

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/auth/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        localStorage.setItem('user', JSON.stringify(response.data.data));
        setProfileUpdateStatus({ show: true, message: 'Profile updated successfully!', type: 'success' });
        setTimeout(() => setProfileUpdateStatus({ show: false, message: '', type: '' }), 3000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setProfileUpdateStatus({ show: true, message: 'Failed to update profile', type: 'error' });
      setTimeout(() => setProfileUpdateStatus({ show: false, message: '', type: '' }), 3000);
    }
  };

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
  // ============================================
  // TICKET HTML GENERATOR
  // ============================================
  const generateTicketHTML = (registration) => {
    const currentYear = new Date().getFullYear();
    const safeReg = {
      _id: registration._id || 'N/A',
      eventName: registration.eventName || 'Event',
      event: registration.event || {},
      teamSize: registration.teamSize || 1,
      totalAmount: registration.totalAmount || 0,
      participants: registration.participants || [],
      user: registration.user || {}
    };
    
    const event = safeReg.event || {};
    
    return `<!DOCTYPE html>
      <html>
      <head>
        <title>Event Ticket - ${safeReg.eventName}</title>
        <style>
          body { 
          font-family: 'Inter', Arial, sans-serif; 
          background: #0a0a0a; 
          color: #ffffff; 
          display: flex; 
          justify-content: center; 
          padding: 20px; 
          margin: 0;
          }
          .ticket { 
          max-width: 500px; 
          width: 100%; 
          border: 2px solid #ffd700; 
          border-radius: 16px; 
          padding: 25px; 
          background: #141414; 
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          }
          .header { 
          text-align: center; 
          border-bottom: 2px dashed #333; 
          padding-bottom: 20px; 
          margin-bottom: 20px;
          }
          .header h1 { 
          color: #ffd700; 
          margin: 0; 
          font-size: 24px;
          }
          .header h2 { 
          color: #ffffff; 
          margin: 10px 0 0; 
          font-size: 20px;
          }
          .details { 
          margin-bottom: 20px;
          }
          .detail-row { 
          display: flex; 
          justify-content: space-between; 
          padding: 8px 0; 
          border-bottom: 1px solid #222;
          }
          .label { 
          color: #888; 
          font-size: 14px;
          }
          .value { 
          color: #fff; 
          font-weight: 600; 
          font-size: 14px;
          }
          .value.registration-id { 
          color: #ffd700; 
          font-family: monospace; 
          font-size: 13px;
          }
          .participants { 
          background: #1a1a1a; 
          padding: 15px; 
          border-radius: 8px; 
          margin-bottom: 20px;
          }
          .participants h3 { 
          color: #ffd700; 
          margin: 0 0 10px; 
          font-size: 16px;
          }
          .participant { 
          padding: 5px 0; 
          font-size: 13px; 
          color: #ccc; 
          display: flex; 
          justify-content: space-between;
          }
          .qr { 
          text-align: center; 
          margin: 20px 0; 
          padding: 10px; 
          background: #fff; 
          border-radius: 8px; 
          display: inline-block;
          }
          .footer { 
          text-align: center; 
          color: #666; 
          font-size: 12px; 
          border-top: 2px dashed #333; 
          padding-top: 20px;
          }
          @media print {
          body { 
          background: #fff; 
          color: #000;
          }
          .ticket { 
          border-color: #000; 
          background: #fff; 
          box-shadow: none;
          }
          .header h1 { color: #000; }
          .header h2 { color: #000; }
          .label { color: #555; }
          .value { color: #000; }
          .value.registration-id { color: #000; }
          .participants { 
          background: #f5f5f5; 
          color: #000;
          }
          .participants h3 { color: #000; }
          .participant { color: #000; }
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="header">
            <h1>${symposiumName} ${currentYear}</h1>
            <h2>${safeReg.eventName}</h2>
          </div>
          <div class="details">
            <div class="detail-row">
            <span class="label">Registration ID:</span>
            <span class="value registration-id">${safeReg._id}</span>
            </div>
            <div class="detail-row">
            <span class="label">Date:</span>
            <span class="value">${symposiumDate}</span>
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
            <div class="detail-row">
            <span class="label">Amount Paid:</span>
            <span class="value">₹${safeReg.totalAmount}</span>
            </div>
          </div>
          <div class="participants">
          <h3>👥 Participants</h3>
            ${safeReg.participants.length > 0 ? safeReg.participants.map((p, index) => `<div class="participant">
              <div>
              <strong>${p.name || 'N/A'}</strong> ${index === 0 ? '(Team Lead)' : ''}</div>
              <div>${p.email || ''} | ${p.phone || ''}</div></div>`).join('') : 
              `<div class="participant"><div><strong>${safeReg.user?.name || 'N/A'}</strong> (Team Lead)</div><div>${safeReg.user?.email || ''} | ${safeReg.user?.phone || ''}</div></div>`}
          </div>
          <div class="qr"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.origin + '/verify-ticket/' + safeReg._id)}" alt="QR Code"></div>
          <div class="footer">
          <p>This is your official ticket. Please show this at the event entrance.</p>
          <p>📱 Scan QR code for quick check-in</p>
          <p style="color: #ffd700;">✨ ${symposiumName} ${currentYear} - Think Big • Act Smart • Win Together ✨</p></div>
        </div>
      </body>
      </html>`;
  };

  // ============================================
  // RENDER
  // ============================================
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
            fontWeight: '600'
          }}>
            <span style={{ display: 'flex', alignItems: 'center' }}><LockIcon size={20} /></span>
            <span>Online registration is currently closed. You can still view your existing registrations and profile.</span>
          </div>
        )}

        {showPopup && selectedEvent && (
          <EventDetailsPopup event={selectedEvent} onClose={handleClosePopup} registrationsOpen={registrationsOpen} />
        )}

        {/* ========== PROFILE SECTION with Animation ========== */}
        <div 
          ref={profileSectionRef}
          className="profile-section section-animate"
        >
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
                <span className="stat-value">{registeredEvents.filter(e => e.paymentStatus === 'pending' && e.registrationStatus !== 'waitlist').length}</span>
                <span className="stat-label">Pending</span>
              </div>
              <div className="stat-item stat-item-confirmed">
                <span className="stat-value stat-value-confirmed">{registeredEvents.filter(e => e.paymentStatus === 'verified').length}</span>
                <span className="stat-label stat-label-confirmed">Confirmed</span>
              </div>
            </div>
          </div>
        </div>

        {/* ========== TABS SECTION with Animation ========== */}
        <div 
          ref={tabsSectionRef}
          className="dashboard-tabs section-animate"
        >
          <button className={`tab-btn ${activeTab === 'myregistrations' ? 'active' : ''}`} onClick={() => setActiveTab('myregistrations')}>
            <span className="tab-icon"><FileTextIcon size={16} /></span> My Registrations
          </button>
          <button className={`tab-btn ${activeTab === 'allevents' ? 'active' : ''}`} onClick={() => setActiveTab('allevents')}>
            <span className="tab-icon"><CalendarIcon size={16} /></span> All Events
          </button>
          <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <span className="tab-icon"><UserIcon size={16} /></span> Profile Settings
          </button>
        </div>

        {/* ========== CONTENT SECTION with Animation ========== */}
        <div 
          ref={contentSectionRef}
          className="tab-content section-animate"
        >
          {activeTab === 'myregistrations' && (
            <div className="my-registrations-tab">
              {registeredEvents.length > 0 ? (
                <div className="registered-events-grid stagger-children">
                  {registeredEvents.map((registration, index) => {
                    const status = getStatusDisplay(registration);
                    const isWaitlisted = registration.registrationStatus === 'waitlist';
                    const safeRegistration = {
                      ...registration,
                      eventName: registration.event?.name || registration.eventName || 'Event',
                      totalAmount: registration.totalAmount || registration.event?.fee || 0,
                      teamSize: registration.teamSize || 1,
                      transactionId: registration.transactionId || 'N/A'
                    };

                    return (
                      <div key={registration._id || index} className="registration-card">
                        <div className="card-header flex items-center justify-between w-full mb-3.5">
                          <span className={`status-tag status-pill ${status.className} inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase shadow-sm transition-all duration-300 hover:scale-105 backdrop-blur-md`}>
                            <span className="status-icon-wrapper flex items-center justify-center">
                              {status.className === 'status-confirmed' ? (
                                <span className="svg-mask-check-wrap" aria-hidden="true">
                                  <svg className="svg-mask-check" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                  </svg>
                                </span>
                              ) : (
                                <span className="status-icon">{status.icon}</span>
                              )}
                            </span>
                            <span className="status-text-gradient">{status.text}</span>
                          </span>
                          <span className="event-category-tag inline-block px-3 py-1 rounded-full text-xs font-semibold">{safeRegistration.event?.category || 'Event'}</span>
                        </div>
                        <h3 className="event-name">{safeRegistration.eventName}</h3>
                        <div className="registration-details">
                          <div className="detail-row">
                            <span className="detail-label"><CalendarIcon size={13} /> Date:</span>
                            <span className="detail-value">{symposiumDate}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label"><ClockIcon size={13} /> Time:</span>
                            <span className="detail-value">{safeRegistration.event?.startTime || 'TBA'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label"><MapPinIcon size={13} /> Venue:</span>
                            <span className="detail-value">{safeRegistration.event?.venue || 'TBA'}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label"><UsersIcon size={13} /> Team Size:</span>
                            <span className="detail-value">{safeRegistration.teamSize} members</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label"><DollarIcon size={13} /> Amount:</span>
                            <span className="detail-value amount">₹{safeRegistration.totalAmount}</span>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label"><TagIcon size={13} /> Transaction:</span>
                            <span className="detail-value">{safeRegistration.transactionId?.substring(0, 12)}...</span>
                          </div>
                          <div className="detail-row flex justify-between items-center py-2">
                            <span className="detail-label">Status:</span>
                            <span className={`status-tag status-pill status-pill-sm ${status.className} inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold`}>
                              <span className="status-icon-wrapper flex items-center justify-center">
                                {status.className === 'status-confirmed' ? (
                                  <span className="svg-mask-check-wrap" aria-hidden="true" style={{ width: '15px', height: '15px' }}>
                                    <svg className="svg-mask-check" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                      <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                  </span>
                                ) : (
                                  <span className="status-icon">{status.icon}</span>
                                )}
                              </span>
                              <span className="status-text-gradient">{status.text}</span>
                            </span>
                          </div>
                        </div>
                        {isWaitlisted && (
                          <div className="waitlist-message">
                            <span className="waitlist-icon"><FileTextIcon size={14} /></span>
                            You are on the waitlist. You will be notified if a spot opens up.
                          </div>
                        )}
                        <div className="registration-actions">
                          <button onClick={() => handleViewDetails(safeRegistration.event || { ...safeRegistration, _id: safeRegistration.event?._id || registration.eventId })} className="btn-view-details">View Details</button>
                          {safeRegistration.paymentStatus === 'verified' && (
                            <button className="btn-download" onClick={() => handleDownloadTicket(safeRegistration)}>
                              <span className="btn-icon"><DownloadIcon size={14} /></span> Download Ticket
                            </button>
                          )}
                          {safeRegistration.paymentStatus === 'pending' && safeRegistration.registrationStatus !== 'waitlist' && (
                            <div className="pending-message"><span className="pending-icon"><HourglassIcon size={14} /></span><span>Awaiting Admin Approval</span></div>
                          )}
                          {safeRegistration.paymentStatus === 'pending' && safeRegistration.registrationStatus === 'waitlist' && (
                            <div className="pending-message waitlist"><span className="pending-icon"><FileTextIcon size={14} /></span><span>On Waitlist - Waiting for spot</span></div>
                          )}
                          {safeRegistration.paymentStatus === 'rejected' && (
                            <div className="rejected-message"><span className="rejected-icon"><XIcon size={14} /></span><span>Registration Rejected</span></div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon"><FileTextIcon size={36} /></div>
                  <h3>No Registrations Yet</h3>
                  <p>You have not registered for any events yet.</p>
                  <button onClick={() => setActiveTab('allevents')} className="btn-browse">Browse Events</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'allevents' && (
            <div className="allevents-tab">
              <h2 className="section-title">All Events</h2>
              {!registrationsOpen && (
                <div className="registration-closed-warning">
                  <span className="warning-icon"><LockIcon size={16} /></span>
                  <span className="warning-text">Online registration is currently closed.</span>
                </div>
              )}
              {statsLoading ? (
                <div className="loading">Loading real-time event stats...</div>
              ) : events && events.length > 0 ? (
                <div className="allevents-grid stagger-children">
                  {events.map((event) => {
                    if (!event || !event._id) return null;
                    const isRegistered = registeredEvents.some(re => re.event?._id === event._id || re.eventId === event._id);
                    const stats = eventStats[event._id] || {
                      confirmedCount: event.registeredCount || 0,
                      pendingCount: 0,
                      maxParticipants: event.maxParticipants || 0,
                      availableSpots: event.maxParticipants - (event.registeredCount || 0),
                      percentage: event.maxParticipants > 0 
                        ? Math.round(((event.registeredCount || 0) / event.maxParticipants) * 100) 
                        : 0,
                      isFull: false
                    };

                    if (eventStats[event._id]) {
                      const realStats = eventStats[event._id];
                      stats.percentage = realStats.maxParticipants > 0 
                        ? Math.round(((realStats.confirmedCount + realStats.pendingCount) / realStats.maxParticipants) * 100) 
                        : 0;
                      stats.confirmedCount = realStats.confirmedCount;
                      stats.pendingCount = realStats.pendingCount;
                      stats.availableSpots = realStats.availableSpots;
                      stats.isFull = realStats.isFull;
                    }

                    const isFull = stats.isFull || stats.confirmedCount >= stats.maxParticipants;
                    const totalOccupancy = stats.confirmedCount + stats.pendingCount;
                    const fillPercentage = stats.percentage;

                    return (
                      <div key={event._id} className="event-card-dashboard">
                        <div className="event-card-header">
                          <div className="event-badge-dashboard">{event.category}</div>
                          <div className="event-type-dashboard">
                            <span className={`type-tag-dashboard ${event.type?.toLowerCase()}`}>
                              {event.type} Event
                            </span>
                          </div>
                        </div>
                        <h3 className="event-title-dashboard">{event.name}</h3>
                        {event.subEventName && (
                          <div className="event-subname-dashboard">
                            <span className="subname-icon-dashboard"><TagIcon size={13} /></span>
                            <span className="subname-text-dashboard">{event.subEventName}</span>
                          </div>
                        )}
                        <p className="event-description-dashboard">{event.description?.substring(0, 100)}...</p>
                        <div className="event-details-dashboard">
                          <div className="detail-item-dashboard">
                            <span className="icon-dashboard"><ClockIcon size={14} /></span>
                            <span>{event.startTime} - {event.endTime}</span>
                          </div>
                          <div className="detail-item-dashboard">
                            <span className="icon-dashboard"><CalendarIcon size={14} /></span>
                            <span>{symposiumDate}</span>
                          </div>
                          <div className="detail-item-dashboard">
                            <span className="icon-dashboard"><MapPinIcon size={14} /></span>
                            <span>{event.venue}</span>
                          </div>
                          <div className="detail-item-dashboard">
                            <span className="icon-dashboard"><UsersIcon size={14} /></span>
                            <span>
                              {event.type === 'Individual' 
                                ? 'Individual' 
                                : `Team: ${event.minTeamSize}-${event.maxTeamSize} members`
                              }
                            </span>
                          </div>
                          <div className="detail-item-dashboard fee-dashboard">
                            <span className="icon-dashboard"><DollarIcon size={14} /></span>
                            <span>₹{event.fee} per head</span>
                          </div>
                          
                          <div className="detail-item-dashboard registration-progress-dashboard">
                            <span className="icon-dashboard"><BarChartIcon size={14} /></span>
                            <div className="progress-info-dashboard">
                              <div className="registration-summary-dashboard">
                                <span className="registered-count-dashboard">
                                  <strong>{stats.confirmedCount}</strong>/{stats.maxParticipants} Registered
                                </span>
                                {stats.pendingCount > 0 && (
                                  <span className="waitlist-count-dashboard">
                                    · <strong>{stats.pendingCount}</strong> on waitlist
                                  </span>
                                )}
                                <span className="fill-percentage-dashboard" style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>
                                  {fillPercentage}% Full
                                </span>
                              </div>
                              <div className="progress-bar-dashboard">
                                <div
                                  className="progress-fill-dashboard"
                                  style={{
                                    width: `${fillPercentage}%`,
                                    backgroundColor: isFull ? '#ff4757' : '#2ecc71'
                                  }}
                                ></div>
                              </div>
                              <div className="spots-message-dashboard">
                                {stats.availableSpots <= 0 ? (
                                  <span style={{ color: '#ffa502' }}>⏳ Event Full - Join Waitlist</span>
                                ) : (
                                  <span style={{ color: '#2ecc71' }}>{stats.availableSpots} spots available</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="event-actions-dashboard">
                          <button onClick={() => handleViewDetails(event)} className="btn-view-details-dashboard">View Details</button>
                          {isRegistered ? (
                            <button className="btn-registered-dashboard inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all duration-300" disabled>
                              <span className="svg-mask-check-wrap" aria-hidden="true" style={{ width: '15px', height: '15px' }}>
                                <svg className="svg-mask-check" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              </span>
                              <span className="status-text-gradient">Already Registered</span>
                            </button>
                          ) : (
                            <button onClick={() => { if (!registrationsOpen) { alert('Online registration is currently closed.'); return; } navigate(`/payment/${event._id}`); }} className={`btn-register-now-dashboard ${isFull ? 'waitlist-btn-dashboard' : ''}`}>
                              {isFull ? 'Join Waitlist' : 'Register Now'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon"><CalendarIcon size={40} /></div>
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
                  <span className="message-icon">{profileUpdateStatus.type === 'success' ? <CheckIcon size={16} /> : <XIcon size={16} />}</span>
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
                  <button type="submit" className="btn-save-glow">Save Changes</button>
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