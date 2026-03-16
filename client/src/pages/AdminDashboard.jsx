// src/pages/AdminDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useSymposiumDate } from '../context/DateContext';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://symposium-veyj.onrender.com/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [registrations, setRegistrations] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [registrationsOpen, setRegistrationsOpen] = useState(true);
  
  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Date update states
  const [newDate, setNewDate] = useState('');
  const [updatingDate, setUpdatingDate] = useState(false);
  const [dateMessage, setDateMessage] = useState({ type: '', text: '' });
  const [newVenue, setNewVenue] = useState('');
  const [newVenueDetails, setNewVenueDetails] = useState('');
  const [updatingVenue, setUpdatingVenue] = useState(false);
  
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    rejected: 0,
    participants: 0,
    totalRevenue: 0
  });
  
  const navigate = useNavigate();
  const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
  const { symposiumDate, venue, venueDetails, refreshSettings, formatEventDate } = useSymposiumDate();

  // Close mobile sidebar when window resizes above mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile sidebar when tab changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [activeTab]);

  // ============================================
  // CHECK ADMIN AUTHENTICATION - ONLY REDIRECT IF NO SESSION EXISTS
  // ============================================
  useEffect(() => {
    const checkAdminAuth = () => {
      const adminToken = localStorage.getItem('adminToken');
      const adminLoggedIn = localStorage.getItem('adminLoggedIn');
      const adminData = localStorage.getItem('adminData');
      
      console.log('🔍 AdminDashboard - Checking authentication:');
      console.log('   adminToken:', adminToken ? '✅ Present' : '❌ Missing');
      console.log('   adminLoggedIn:', adminLoggedIn);
      console.log('   adminData:', adminData ? '✅ Present' : '❌ Missing');
      
      // If any of the required items are missing, redirect to login
      if (!adminToken || adminLoggedIn !== 'true' || !adminData) {
        console.log('❌ Admin session incomplete, redirecting to login');
        navigate('/admin/login');
        return false;
      }
      
      console.log('✅ Admin session valid, staying on dashboard');
      return true;
    };

    checkAdminAuth();
  }, [navigate]);

  // ============================================
  // VERIFY SESSION WITH BACKEND (OPTIONAL - WON'T LOGOUT ON FAILURE)
  // ============================================
  useEffect(() => {
    const verifySession = async () => {
      try {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) return;
        
        // Optional: Verify with backend - but don't logout on failure
        // Just log the warning
        const response = await axios.get(`${API_URL}/admin/verify-session`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        if (response.data.success) {
          console.log('✅ Backend session verified');
        }
      } catch (error) {
        // Just log the error, don't logout
        console.warn('⚠️ Session verification warning:', error.message);
        console.log('Continuing with local session - user can still use dashboard');
      }
    };

    verifySession();
  }, []);

  // ============================================
  // FETCH SETTINGS
  // ============================================
  const fetchSettings = useCallback(async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await axios.get(`${API_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (response.data.success) {
        setRegistrationsOpen(response.data.data.registrationsOpen);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Don't logout on error, just show error in console
    }
  }, []);

  // ============================================
  // TOGGLE REGISTRATIONS FUNCTION
  // ============================================
  const toggleRegistrations = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await axios.put(
        `${API_URL}/admin/settings/toggle-registrations`,
        {},
        { 
          headers: { 
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      if (response.data.success) {
        const newState = response.data.data.registrationsOpen;
        setRegistrationsOpen(newState);
        alert(`✅ Registrations are now ${newState ? 'OPEN' : 'CLOSED'}`);
      }
    } catch (error) {
      console.error('Error toggling registrations:', error);
      if (error.response?.status === 401) {
        // Only redirect if explicitly unauthorized
        alert('Session expired. Please login again.');
        handleLogout();
      } else {
        alert(`❌ Failed to toggle registration status`);
      }
    }
  };

  // ============================================
  // UPDATE SYMPOSIUM DATE
  // ============================================
  const handleUpdateDate = async (e) => {
    e.preventDefault();
    setUpdatingDate(true);
    setDateMessage({ type: '', text: '' });

    try {
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await axios.put(
        `${API_URL}/symposium/admin/date`,
        { date: newDate },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.data.success) {
        setDateMessage({ type: 'success', text: 'Symposium date updated successfully!' });
        refreshSettings();
        setNewDate('');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setDateMessage({ type: 'error', text: 'Session expired. Please login again.' });
        setTimeout(() => handleLogout(), 2000);
      } else {
        setDateMessage({ 
          type: 'error', 
          text: error.response?.data?.message || 'Failed to update date' 
        });
      }
    } finally {
      setUpdatingDate(false);
    }
  };

  // ============================================
  // UPDATE SYMPOSIUM VENUE
  // ============================================
  const handleUpdateVenue = async (e) => {
    e.preventDefault();
    setUpdatingVenue(true);
    setDateMessage({ type: '', text: '' });

    try {
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await axios.put(
        `${API_URL}/symposium/admin/venue`,
        { venue: newVenue, venueDetails: newVenueDetails },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.data.success) {
        setDateMessage({ type: 'success', text: 'Symposium venue updated successfully!' });
        refreshSettings();
        setNewVenue('');
        setNewVenueDetails('');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setDateMessage({ type: 'error', text: 'Session expired. Please login again.' });
        setTimeout(() => handleLogout(), 2000);
      } else {
        setDateMessage({ 
          type: 'error', 
          text: error.response?.data?.message || 'Failed to update venue' 
        });
      }
    } finally {
      setUpdatingVenue(false);
    }
  };

  // ============================================
  // FETCH REGISTRATIONS
  // ============================================
  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      let url = `${API_URL}/admin/registrations`;
      
      if (activeTab === 'pending') {
        url = `${API_URL}/admin/registrations?status=pending`;
      } else if (activeTab === 'verified' || activeTab === 'accepted') {
        url = `${API_URL}/admin/registrations?status=verified`;
      } else if (activeTab === 'rejected') {
        url = `${API_URL}/admin/registrations?status=rejected`;
      } else if (activeTab === 'all') {
        url = `${API_URL}/admin/registrations?status=all`;
      } else if (activeTab === 'participants') {
        url = `${API_URL}/admin/registrations?status=verified`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (response.data.success) {
        const allRegs = response.data.data || [];
        setRegistrations(allRegs);
        
        // Calculate stats
        const allRegsResponse = await axios.get(`${API_URL}/admin/registrations?status=all`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        if (allRegsResponse.data.success) {
          const allData = allRegsResponse.data.data || [];
          const totalPending = allData.filter(r => r.paymentStatus === 'pending').length;
          const totalAccepted = allData.filter(r => r.paymentStatus === 'verified').length;
          const totalRejected = allData.filter(r => r.paymentStatus === 'rejected').length;
          const totalRevenue = allData
            .filter(r => r.paymentStatus === 'verified')
            .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
          
          const totalParticipants = allData
            .filter(r => r.paymentStatus === 'verified')
            .reduce((sum, r) => sum + (r.teamSize || 1), 0);
          
          setStats({
            pending: totalPending,
            accepted: totalAccepted,
            rejected: totalRejected,
            participants: totalParticipants,
            totalRevenue: totalRevenue
          });
        }
        
        // Extract participants for participants tab
        if (activeTab === 'participants') {
          const allParticipants = [];
          const verifiedRegs = allRegs.filter(r => r.paymentStatus === 'verified');
          
          verifiedRegs.forEach(reg => {
            if (reg.participants && reg.participants.length > 0) {
              reg.participants.forEach((p, index) => {
                allParticipants.push({
                  name: p.name || 'N/A',
                  mobile: p.phone || 'N/A',
                  eventName: reg.event?.name || reg.eventName || 'N/A',
                  eventSubName: reg.event?.subEventName || '',
                  college: reg.user?.college || 'N/A',
                  year: reg.user?.year,
                  teamName: reg.teamName || 'Individual',
                  isTeamLead: index === 0
                });
              });
            } else {
              allParticipants.push({
                name: reg.user?.name || 'N/A',
                mobile: reg.user?.phone || 'N/A',
                eventName: reg.event?.name || reg.eventName || 'N/A',
                eventSubName: reg.event?.subEventName || '',
                college: reg.user?.college || 'N/A',
                year: reg.user?.year,
                teamName: 'Individual',
                isTeamLead: true
              });
            }
          });
          setParticipants(allParticipants);
        }
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
      if (error.response?.status === 401) {
        // Only redirect if explicitly unauthorized
        alert('Session expired. Please login again.');
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // ============================================
  // INITIAL DATA FETCH
  // ============================================
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    
    if (adminToken && adminLoggedIn === 'true') {
      fetchRegistrations();
      fetchSettings();
    }
  }, [fetchRegistrations, fetchSettings]);

  // ============================================
  // HANDLE STATUS UPDATE (ACCEPT/REJECT)
  // ============================================
  const handleStatusUpdate = async (registrationId, status) => {
    try {
      setProcessingId(registrationId);
      const adminToken = localStorage.getItem('adminToken');
      
      const apiStatus = status === 'accepted' ? 'verified' : status;
      
      const response = await axios.put(
        `${API_URL}/admin/registrations/${registrationId}/status`,
        { status: apiStatus },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.data.success) {
        fetchRegistrations();
        alert(`✅ Registration ${status} successfully!`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      if (error.response?.status === 401) {
        alert('Session expired. Please login again.');
        handleLogout();
      } else {
        alert(`❌ Failed to update registration status`);
      }
    } finally {
      setProcessingId(null);
    }
  };

  // ============================================
  // VIEW PARTICIPANTS MODAL
  // ============================================
  const viewParticipants = (registration) => {
    setSelectedRegistration(registration);
    setShowParticipantsModal(true);
  };

  const closeModal = () => {
    setShowParticipantsModal(false);
    setSelectedRegistration(null);
  };

  // ============================================
  // DOWNLOAD PARTICIPANTS AS EXCEL
  // ============================================
  const downloadParticipantsSheet = () => {
    if (participants.length === 0) {
      alert('No participants data to download');
      return;
    }

    try {
      const excelData = participants.map((p, index) => ({
        'S.No': index + 1,
        'Participant Name': p.name || 'N/A',
        'Event Name': `${p.eventName} ${p.eventSubName ? `- ${p.eventSubName}` : ''}`,
        'Mobile Number': p.mobile || 'N/A',
        'College Name': p.college || 'N/A',
        'Year': formatYear(p.year),
        'Role': p.isTeamLead ? 'Team Lead' : 'Member'
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      
      const colWidths = [
        { wch: 5 },   // S.No
        { wch: 25 },  // Participant Name
        { wch: 35 },  // Event Name
        { wch: 15 },  // Mobile Number
        { wch: 30 },  // College Name
        { wch: 12 },  // Year
        { wch: 12 }   // Role
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Participants');

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const fileName = `participants_list_${dateStr}.xlsx`;

      XLSX.writeFile(wb, fileName);
      alert(`✅ Downloaded ${participants.length} participants`);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('❌ Failed to download participants list');
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'pending': return 'status-pending';
      case 'verified': return 'status-accepted';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'Pending';
      case 'verified': return 'Accepted';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const formatYear = (year) => {
    if (!year) return 'N/A';
    const suffix = year === 1 ? 'st' : year === 2 ? 'nd' : year === 3 ? 'rd' : 'th';
    return `${year}${suffix} Year`;
  };

  // ============================================
  // HANDLE LOGOUT - CLEAR ALL STORAGE (ONLY WAY TO LOGOUT)
  // ============================================
  const handleLogout = () => {
    // Clear all admin-related storage
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    localStorage.removeItem('adminLoggedIn');
    
    // Clear any other admin-specific data
    sessionStorage.clear();
    
    console.log('👋 Admin logged out, session cleared');
    
    // Navigate to admin login
    navigate('/admin/login');
  };

  // ============================================
  // TOGGLE MOBILE SIDEBAR
  // ============================================
  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  // ============================================
  // GET TABLE HEADERS BASED ON ACTIVE TAB
  // ============================================
  const getTableHeaders = () => {
    if (activeTab === 'participants') {
      return ['S.No', 'Participant Name', 'Mobile', 'Event', 'College', 'Year'];
    }
    const baseHeaders = ['Date', 'Transaction ID', 'User', 'Event', 'Team', 'Amount', 'Status'];
    return activeTab === 'pending' ? [...baseHeaders, 'Actions'] : baseHeaders;
  };

  // ============================================
  // RENDER MOBILE CARD FOR REGISTRATION
  // ============================================
  const renderMobileRegistrationCard = (reg) => {
    const isPending = activeTab === 'pending';
    
    return (
      <div key={reg._id} className="registration-mobile-card">
        <div className="mobile-card-header">
          <span className="mobile-event-name">{reg.event?.name || reg.eventName}</span>
          <span className={`mobile-status-badge ${reg.paymentStatus}`}>
            {getStatusText(reg.paymentStatus)}
          </span>
        </div>
        
        <div className="mobile-card-body">
          {/* Date and Transaction */}
          <div className="mobile-info-row">
            <span className="mobile-info-label">Date:</span>
            <span className="mobile-info-value">{new Date(reg.createdAt).toLocaleDateString()}</span>
          </div>
          
          <div className="mobile-info-row">
            <span className="mobile-info-label">Transaction:</span>
            <span className="mobile-info-value transaction-id">{reg.transactionId || 'N/A'}</span>
          </div>
          
          {/* User Details */}
          <div className="mobile-info-row">
            <span className="mobile-info-label">User:</span>
            <div className="mobile-info-value">
              <strong>{reg.user?.name}</strong>
              <div className="mobile-user-details">
                <div>{reg.user?.email}</div>
                <div>{reg.user?.phone}</div>
                <div>{reg.user?.college}</div>
              </div>
            </div>
          </div>
          
          {/* Event Details */}
          <div className="mobile-info-row">
            <span className="mobile-info-label">Event:</span>
            <div className="mobile-info-value">
              <strong>{reg.event?.name || reg.eventName}</strong>
              {reg.event?.subEventName && (
                <div className="mobile-event-details">
                  📌 {reg.event.subEventName}
                </div>
              )}
              <div className="mobile-event-details">
                {reg.event?.category} • {reg.event?.startTime}
              </div>
            </div>
          </div>
          
          {/* Team Info */}
          <div className="mobile-info-row">
            <span className="mobile-info-label">Team:</span>
            <div className="mobile-info-value">
              {reg.teamName !== 'Individual' ? (
                <>
                  <strong>{reg.teamName}</strong>
                  <div className="mobile-event-details">{reg.teamSize} members</div>
                </>
              ) : (
                'Individual'
              )}
            </div>
          </div>
          
          {/* Amount */}
          <div className="mobile-info-row">
            <span className="mobile-info-label">Amount:</span>
            <span className="mobile-info-value" style={{ color: '#ffd700' }}>₹{reg.totalAmount}</span>
          </div>
          
          {/* Participants (if any) */}
          {reg.participants && reg.participants.length > 0 && (
            <div className="mobile-info-row">
              <span className="mobile-info-label">Participants:</span>
              <div className="mobile-info-value">
                <div className="mobile-participants">
                  {reg.participants.map((p, idx) => (
                    <div key={idx} className="mobile-participant">
                      <span className="mobile-participant-name">{p.name}</span>
                      <span className="mobile-participant-detail">{p.phone} • {p.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Actions for pending */}
          {isPending && (
            <div className="mobile-card-actions">
              <button 
                onClick={() => handleStatusUpdate(reg._id, 'accepted')}
                className="mobile-action-btn accept"
                disabled={processingId === reg._id}
              >
                ✓ Accept
              </button>
              <button 
                onClick={() => handleStatusUpdate(reg._id, 'rejected')}
                className="mobile-action-btn reject"
                disabled={processingId === reg._id}
              >
                ✗ Reject
              </button>
              <button 
                onClick={() => viewParticipants(reg)}
                className="mobile-action-btn view"
              >
                👥 View Team
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER MOBILE PARTICIPANT CARD
  // ============================================
  const renderMobileParticipantCard = (participant, index) => {
    return (
      <div key={index} className="registration-mobile-card">
        <div className="mobile-card-header">
          <span className="mobile-event-name">{participant.name}</span>
          <span className={`mobile-status-badge ${participant.isTeamLead ? 'verified' : 'pending'}`}>
            {participant.isTeamLead ? 'Team Lead' : 'Member'}
          </span>
        </div>
        
        <div className="mobile-card-body">
          <div className="mobile-info-row">
            <span className="mobile-info-label">Mobile:</span>
            <span className="mobile-info-value">{participant.mobile}</span>
          </div>
          
          <div className="mobile-info-row">
            <span className="mobile-info-label">Event:</span>
            <div className="mobile-info-value">
              <strong>{participant.eventName}</strong>
              {participant.eventSubName && (
                <div className="mobile-event-details">📌 {participant.eventSubName}</div>
              )}
            </div>
          </div>
          
          <div className="mobile-info-row">
            <span className="mobile-info-label">College:</span>
            <span className="mobile-info-value">{participant.college}</span>
          </div>
          
          <div className="mobile-info-row">
            <span className="mobile-info-label">Year:</span>
            <span className="mobile-info-value">{formatYear(participant.year)}</span>
          </div>
          
          {participant.teamName !== 'Individual' && (
            <div className="mobile-info-row">
              <span className="mobile-info-label">Team:</span>
              <span className="mobile-info-value">{participant.teamName}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER COMPONENT
  // ============================================
  return (
    <div className="admin-dashboard">
      {/* Mobile Sidebar Toggle Button */}
      <button 
        className="mobile-sidebar-toggle" 
        onClick={toggleMobileSidebar}
        aria-label="Toggle menu"
      >
        {mobileSidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar Overlay for mobile */}
      <div 
        className={`sidebar-overlay ${mobileSidebarOpen ? 'active' : ''}`}
        onClick={toggleMobileSidebar}
      ></div>

      {/* Sidebar */}
      <div className={`admin-sidebar ${mobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h2>Admin Dashboard</h2>
          <p>{formatEventDate()}</p>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'pending' ? 'active' : ''}`} 
            onClick={() => setActiveTab('pending')}
          >
            <span className="nav-icon">⏳</span> 
            Pending 
            {stats.pending > 0 && <span className="badge">{stats.pending}</span>}
          </button>
          <button 
            className={`nav-item ${activeTab === 'verified' ? 'active' : ''}`} 
            onClick={() => setActiveTab('verified')}
          >
            <span className="nav-icon">✅</span> 
            Accepted 
            {stats.accepted > 0 && <span className="badge success">{stats.accepted}</span>}
          </button>
          <button 
            className={`nav-item ${activeTab === 'rejected' ? 'active' : ''}`} 
            onClick={() => setActiveTab('rejected')}
          >
            <span className="nav-icon">❌</span> 
            Rejected 
            {stats.rejected > 0 && <span className="badge danger">{stats.rejected}</span>}
          </button>
          <button 
            className={`nav-item ${activeTab === 'participants' ? 'active' : ''}`} 
            onClick={() => setActiveTab('participants')}
          >
            <span className="nav-icon">👥</span> 
            Participants 
            {stats.participants > 0 && <span className="badge info">{stats.participants}</span>}
          </button>
          <button 
            className={`nav-item ${activeTab === 'all' ? 'active' : ''}`} 
            onClick={() => setActiveTab('all')}
          >
            <span className="nav-icon">📋</span> 
            All Registrations
          </button>
          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} 
            onClick={() => setActiveTab('settings')}
          >
            <span className="nav-icon">⚙️</span> 
            Symposium Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="toggle-container">
            <button 
              onClick={toggleRegistrations}
              className={`toggle-btn ${registrationsOpen ? 'on' : 'off'}`}
            >
              <span className="toggle-icon">{registrationsOpen ? '🔓' : '🔒'}</span>
              <span className="toggle-text">
                {registrationsOpen ? 'Registrations ON' : 'Registrations OFF'}
              </span>
            </button>
          </div>
          
          <button onClick={handleLogout} className="logout-btn">
            <span className="nav-icon">🚪</span> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-main">
        <div className="admin-content">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-info">
                <h3>{stats.pending}</h3>
                <p>Pending</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <h3>{stats.accepted}</h3>
                <p>Accepted</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">❌</div>
              <div className="stat-info">
                <h3>{stats.rejected}</h3>
                <p>Rejected</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <h3>{stats.participants}</h3>
                <p>Participants</p>
              </div>
            </div>
            <div className="stat-card revenue-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <h3>₹{stats.totalRevenue}</h3>
                <p>Revenue</p>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="registrations-section">
            <div className="section-header">
              <h2>
                {activeTab === 'pending' && 'Pending Registrations'}
                {activeTab === 'verified' && 'Accepted Registrations'}
                {activeTab === 'rejected' && 'Rejected Registrations'}
                {activeTab === 'participants' && 'All Participants'}
                {activeTab === 'all' && 'All Registrations'}
                {activeTab === 'settings' && 'Symposium Settings'}
              </h2>
              <div className="header-actions">
                <div className="live-status-indicator">
                  <span className="live-dot"></span> Live Updates
                </div>
                
                {activeTab === 'participants' && (
                  <button 
                    onClick={downloadParticipantsSheet} 
                    className="btn-download-excel"
                    disabled={participants.length === 0}
                  >
                    <span className="btn-icon">📥</span>
                    Download Excel {participants.length > 0 ? `(${participants.length})` : ''}
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="loading-spinner">Loading...</div>
            ) : (
              <>
                {activeTab === 'settings' ? (
                  <div className="settings-container">
                    {/* Update Date Section */}
                    <div className="settings-card">
                      <h3>📅 Update Symposium Date</h3>
                      <p className="current-setting">
                        Current Date: <strong>{symposiumDate}</strong>
                      </p>
                      
                      <form onSubmit={handleUpdateDate}>
                        <div className="form-group">
                          <label htmlFor="newDate">Select New Date</label>
                          <input
                            type="date"
                            id="newDate"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            required
                            min="2026-01-01"
                            max="2026-12-31"
                            className="settings-input"
                          />
                        </div>
                        
                        {dateMessage.type === 'success' && (
                          <div className="success-message">
                            ✅ {dateMessage.text}
                          </div>
                        )}
                        {dateMessage.type === 'error' && (
                          <div className="error-message">
                            ❌ {dateMessage.text}
                          </div>
                        )}
                        
                        <button 
                          type="submit" 
                          disabled={updatingDate || !newDate}
                          className="btn-save-settings"
                        >
                          {updatingDate ? 'Updating...' : 'Update Symposium Date'}
                        </button>
                      </form>
                    </div>

                    {/* Update Venue Section */}
                    <div className="settings-card">
                      <h3>📍 Update Venue Details</h3>
                      <p className="current-setting">
                        Current Venue: <strong>{venue}</strong><br />
                        Current Details: <strong>{venueDetails}</strong>
                      </p>
                      
                      <form onSubmit={handleUpdateVenue}>
                        <div className="form-group">
                          <label htmlFor="newVenue">Venue Name</label>
                          <input
                            type="text"
                            id="newVenue"
                            value={newVenue}
                            onChange={(e) => setNewVenue(e.target.value)}
                            placeholder="Enter venue name"
                            className="settings-input"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="newVenueDetails">Venue Details</label>
                          <input
                            type="text"
                            id="newVenueDetails"
                            value={newVenueDetails}
                            onChange={(e) => setNewVenueDetails(e.target.value)}
                            placeholder="Enter venue details"
                            className="settings-input"
                          />
                        </div>
                        
                        <button 
                          type="submit" 
                          disabled={updatingVenue || (!newVenue && !newVenueDetails)}
                          className="btn-save-settings"
                        >
                          {updatingVenue ? 'Updating...' : 'Update Venue Details'}
                        </button>
                      </form>
                    </div>

                    {/* Current Settings Summary */}
                    <div className="settings-summary">
                      <h3>Current Symposium Settings</h3>
                      <div className="summary-grid">
                        <div className="summary-item">
                          <span className="summary-label">Date:</span>
                          <span className="summary-value">{symposiumDate}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Venue:</span>
                          <span className="summary-value">{venue}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Venue Details:</span>
                          <span className="summary-value">{venueDetails}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Registrations:</span>
                          <span className={`summary-value ${registrationsOpen ? 'open' : 'closed'}`}>
                            {registrationsOpen ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View - Hidden on Mobile */}
                    <div className="table-container">
                      <table className="registrations-table">
                        <thead>
                          <tr>
                            {getTableHeaders().map(header => (
                              <th key={header}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Participants Tab - Desktop */}
                          {activeTab === 'participants' ? (
                            participants.length > 0 ? (
                              participants.map((p, i) => (
                                <tr key={i}>
                                  <td>{i + 1}</td>
                                  <td className="participant-name-cell">
                                    {p.name}
                                    {p.isTeamLead ? (
                                      <span className="lead-indicator">(Lead)</span>
                                    ) : (
                                      <span className="member-indicator">(Member)</span>
                                    )}
                                  </td>
                                  <td className="participant-mobile-cell">{p.mobile}</td>
                                  <td className="participant-event-cell">
                                    <span className="event-main">{p.eventName}</span>
                                    {p.eventSubName && (
                                      <span className="event-sub">📌 {p.eventSubName}</span>
                                    )}
                                    {p.teamName !== 'Individual' && (
                                      <span className="event-team">👥 {p.teamName}</span>
                                    )}
                                  </td>
                                  <td className="participant-college-cell">{p.college}</td>
                                  <td className="participant-year-cell">{formatYear(p.year)}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="6" className="no-data">No participants found</td>
                              </tr>
                            )
                          ) : (
                            /* Registrations Table - Desktop */
                            registrations.length > 0 ? (
                              registrations.map(reg => (
                                <tr key={reg._id}>
                                  <td>{new Date(reg.createdAt).toLocaleDateString()}</td>
                                  <td>
                                    <span className="transaction-id-full">{reg.transactionId || 'N/A'}</span>
                                  </td>
                                  <td>
                                    <div className="user-info">
                                      <strong>{reg.user?.name}</strong>
                                      <span className="user-email">{reg.user?.email}</span>
                                      <span className="user-phone">{reg.user?.phone}</span>
                                      <span className="user-college">{reg.user?.college}</span>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="event-info">
                                      <strong>{reg.event?.name || reg.eventName}</strong>
                                      {reg.event?.subEventName && (
                                        <span className="event-subname">📌 {reg.event.subEventName}</span>
                                      )}
                                      <span className="event-category">{reg.event?.category}</span>
                                    </div>
                                  </td>
                                  <td>
                                    {reg.teamName !== 'Individual' ? (
                                      <div className="team-info">
                                        <strong>{reg.teamName}</strong>
                                        <span className="team-size">{reg.teamSize} members</span>
                                      </div>
                                    ) : (
                                      <span className="individual-tag">Individual</span>
                                    )}
                                  </td>
                                  <td className="amount">₹{reg.totalAmount}</td>
                                  <td>
                                    <span className={`status-badge ${getStatusBadgeClass(reg.paymentStatus)}`}>
                                      {getStatusText(reg.paymentStatus)}
                                    </span>
                                  </td>
                                  
                                  {activeTab === 'pending' && (
                                    <td>
                                      <div className="action-buttons">
                                        <button 
                                          onClick={() => handleStatusUpdate(reg._id, 'accepted')} 
                                          className="btn-accept" 
                                          disabled={processingId === reg._id}
                                          title="Accept"
                                        >✓</button>
                                        <button 
                                          onClick={() => handleStatusUpdate(reg._id, 'rejected')} 
                                          className="btn-reject" 
                                          disabled={processingId === reg._id}
                                          title="Reject"
                                        >✗</button>
                                        <button 
                                          onClick={() => viewParticipants(reg)} 
                                          className="btn-view" 
                                          title="View Team"
                                        >👥</button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={activeTab === 'pending' ? 8 : 7} className="no-data">
                                  No {activeTab} registrations found
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="mobile-cards-view">
                      {activeTab === 'participants' ? (
                        participants.length > 0 ? (
                          participants.map((p, i) => renderMobileParticipantCard(p, i))
                        ) : (
                          <div className="no-data">No participants found</div>
                        )
                      ) : (
                        registrations.length > 0 ? (
                          registrations.map(reg => renderMobileRegistrationCard(reg))
                        ) : (
                          <div className="no-data">No {activeTab} registrations found</div>
                        )
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showParticipantsModal && selectedRegistration && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Team Members</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="event-name-section">
                <span className="event-label">Event:</span>
                <span className="event-name">
                  {selectedRegistration.event?.name || selectedRegistration.eventName}
                </span>
                {selectedRegistration.event?.subEventName && (
                  <span className="event-subname">📌 {selectedRegistration.event.subEventName}</span>
                )}
              </div>
              <div className="college-year-section">
                <div className="info-row">
                  <span className="label">College:</span>
                  <span className="value">{selectedRegistration.user?.college}</span>
                </div>
                <div className="info-row">
                  <span className="label">Year:</span>
                  <span className="value">{formatYear(selectedRegistration.user?.year)}</span>
                </div>
              </div>
              <div className="participants-list">
                {selectedRegistration.participants?.length > 0 ? 
                  selectedRegistration.participants.map((p, i) => (
                    <div key={i} className="participant-item">
                      <div className="participant-info">
                        <span className="participant-name">
                          {p.name}
                          {i === 0 && selectedRegistration.teamSize > 1 && (
                            <span className="participant-role"> (Lead)</span>
                          )}
                          {i > 0 && <span className="participant-role"> (Member)</span>}
                        </span>
                      </div>
                      <span className="participant-mobile">{p.phone}</span>
                    </div>
                  )) : 
                  <div className="participant-item">
                    <div className="participant-info">
                      <span className="participant-name">
                        {selectedRegistration.user?.name}
                        <span className="participant-role"> (Lead)</span>
                      </span>
                    </div>
                    <span className="participant-mobile">{selectedRegistration.user?.phone}</span>
                  </div>
                }
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={closeModal} className="btn-close">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;