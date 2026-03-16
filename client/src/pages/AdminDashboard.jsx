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
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  
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

  // Clear action message after 3 seconds
  useEffect(() => {
    if (actionMessage.text) {
      const timer = setTimeout(() => {
        setActionMessage({ type: '', text: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  // ============================================
  // CHECK ADMIN AUTHENTICATION
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
        setActionMessage({
          type: 'success',
          text: `✅ Registrations are now ${newState ? 'OPEN' : 'CLOSED'}`
        });
      }
    } catch (error) {
      console.error('Error toggling registrations:', error);
      setActionMessage({
        type: 'error',
        text: '❌ Failed to toggle registration status'
      });
      
      if (error.response?.status === 401) {
        setTimeout(() => handleLogout(), 2000);
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
      setDateMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update date' 
      });
      
      if (error.response?.status === 401) {
        setDateMessage({ type: 'error', text: 'Session expired. Please login again.' });
        setTimeout(() => handleLogout(), 2000);
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
      setDateMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update venue' 
      });
      
      if (error.response?.status === 401) {
        setDateMessage({ type: 'error', text: 'Session expired. Please login again.' });
        setTimeout(() => handleLogout(), 2000);
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
      
      if (!adminToken) {
        console.error('No admin token found');
        return;
      }

      let url = `${API_URL}/admin/registrations`;
      
      // Add status filter based on active tab
      const statusMap = {
        'pending': 'pending',
        'verified': 'verified',
        'accepted': 'verified',
        'rejected': 'rejected',
        'all': 'all'
      };
      
      const statusParam = statusMap[activeTab] || 'all';
      url = `${API_URL}/admin/registrations?status=${statusParam}`;

      console.log(`📡 Fetching registrations from: ${url}`);

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (response.data.success) {
        const allRegs = response.data.data || [];
        setRegistrations(allRegs);
        
        // Calculate stats from all registrations
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
      setActionMessage({
        type: 'error',
        text: '❌ Failed to fetch registrations'
      });
      
      if (error.response?.status === 401) {
        setActionMessage({
          type: 'error',
          text: 'Session expired. Please login again.'
        });
        setTimeout(() => handleLogout(), 2000);
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
      
      if (!adminToken) {
        setActionMessage({
          type: 'error',
          text: '❌ No admin token found. Please login again.'
        });
        setTimeout(() => handleLogout(), 2000);
        return;
      }

      // Map frontend status to backend expected status
      // 'accepted' -> 'verified', 'rejected' -> 'rejected'
      const backendStatus = status === 'accepted' ? 'verified' : 'rejected';
      
      console.log(`🔄 Updating registration ${registrationId} to ${backendStatus}`);
      
      const response = await axios.put(
        `${API_URL}/admin/registrations/${registrationId}/status`,
        { status: backendStatus },
        { 
          headers: { 
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      if (response.data.success) {
        setActionMessage({
          type: 'success',
          text: `✅ Registration ${status} successfully!`
        });
        
        // Refresh the registrations list
        await fetchRegistrations();
        
        // Also refresh settings if needed
        if (typeof fetchSettings === 'function') {
          await fetchSettings();
        }
      }
    } catch (error) {
      console.error('❌ Error updating status:', error);
      
      let errorMessage = '❌ Failed to update registration status';
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        errorMessage = error.response.data?.message || errorMessage;
        
        if (error.response.status === 401) {
          errorMessage = 'Session expired. Please login again.';
          setTimeout(() => handleLogout(), 2000);
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to perform this action';
        } else if (error.response.status === 404) {
          errorMessage = 'Registration not found';
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      setActionMessage({
        type: 'error',
        text: errorMessage
      });
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
      setActionMessage({
        type: 'error',
        text: '❌ No participants data to download'
      });
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
      
      setActionMessage({
        type: 'success',
        text: `✅ Downloaded ${participants.length} participants`
      });
    } catch (error) {
      console.error('Error downloading Excel:', error);
      setActionMessage({
        type: 'error',
        text: '❌ Failed to download participants list'
      });
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
    if (!year && year !== 0) return 'N/A';
    const yearNum = parseInt(year);
    if (isNaN(yearNum)) return 'N/A';
    const suffix = yearNum === 1 ? 'st' : yearNum === 2 ? 'nd' : yearNum === 3 ? 'rd' : 'th';
    return `${yearNum}${suffix} Year`;
  };

  // ============================================
  // HANDLE LOGOUT
  // ============================================
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    localStorage.removeItem('adminLoggedIn');
    sessionStorage.clear();
    
    console.log('👋 Admin logged out, session cleared');
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
    
    // Safely access properties with defaults
    const safeReg = {
      _id: reg?._id || `temp-${Math.random()}`,
      paymentStatus: reg?.paymentStatus || 'pending',
      registrationStatus: reg?.registrationStatus || 'pending',
      createdAt: reg?.createdAt || new Date().toISOString(),
      transactionId: reg?.transactionId || 'N/A',
      totalAmount: reg?.totalAmount || 0,
      teamName: reg?.teamName || 'Individual',
      teamSize: reg?.teamSize || 1,
      event: reg?.event || {
        name: reg?.eventName || 'Unknown Event',
        subEventName: '',
        category: 'Event',
        startTime: 'TBA'
      },
      user: reg?.user || {
        name: 'Unknown User',
        email: '',
        phone: '',
        college: ''
      },
      participants: reg?.participants || []
    };
    
    return (
      <div key={safeReg._id} className="registration-mobile-card">
        <div className="mobile-card-header">
          <span className="mobile-event-name">{safeReg.event?.name || safeReg.eventName}</span>
          <span className={`mobile-status-badge ${safeReg.paymentStatus}`}>
            {getStatusText(safeReg.paymentStatus)}
          </span>
        </div>
        
        <div className="mobile-card-body">
          {/* Date and Transaction */}
          <div className="mobile-info-row">
            <span className="mobile-info-label">Date:</span>
            <span className="mobile-info-value">{new Date(safeReg.createdAt).toLocaleDateString()}</span>
          </div>
          
          <div className="mobile-info-row">
            <span className="mobile-info-label">Transaction:</span>
            <span className="mobile-info-value transaction-id">{safeReg.transactionId}</span>
          </div>
          
          {/* User Details */}
          <div className="mobile-info-row">
            <span className="mobile-info-label">User:</span>
            <div className="mobile-info-value">
              <strong>{safeReg.user?.name}</strong>
              <div className="mobile-user-details">
                <div>{safeReg.user?.email}</div>
                <div>{safeReg.user?.phone}</div>
                <div>{safeReg.user?.college}</div>
              </div>
            </div>
          </div>
          
          {/* Event Details */}
          <div className="mobile-info-row">
            <span className="mobile-info-label">Event:</span>
            <div className="mobile-info-value">
              <strong>{safeReg.event?.name || safeReg.eventName}</strong>
              {safeReg.event?.subEventName && (
                <div className="mobile-event-details">
                  📌 {safeReg.event.subEventName}
                </div>
              )}
              <div className="mobile-event-details">
                {safeReg.event?.category} • {safeReg.event?.startTime}
              </div>
            </div>
          </div>
          
          {/* Team Info */}
          <div className="mobile-info-row">
            <span className="mobile-info-label">Team:</span>
            <div className="mobile-info-value">
              {safeReg.teamName !== 'Individual' ? (
                <>
                  <strong>{safeReg.teamName}</strong>
                  <div className="mobile-event-details">{safeReg.teamSize} members</div>
                </>
              ) : (
                'Individual'
              )}
            </div>
          </div>
          
          {/* Amount */}
          <div className="mobile-info-row">
            <span className="mobile-info-label">Amount:</span>
            <span className="mobile-info-value" style={{ color: '#ffd700' }}>₹{safeReg.totalAmount}</span>
          </div>
          
          {/* Participants (if any) */}
          {safeReg.participants && safeReg.participants.length > 0 && (
            <div className="mobile-info-row">
              <span className="mobile-info-label">Participants:</span>
              <div className="mobile-info-value">
                <div className="mobile-participants">
                  {safeReg.participants.map((p, idx) => (
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
                onClick={() => handleStatusUpdate(safeReg._id, 'accepted')}
                className="mobile-action-btn accept"
                disabled={processingId === safeReg._id}
              >
                {processingId === safeReg._id ? '⏳' : '✓'} Accept
              </button>
              <button 
                onClick={() => handleStatusUpdate(safeReg._id, 'rejected')}
                className="mobile-action-btn reject"
                disabled={processingId === safeReg._id}
              >
                {processingId === safeReg._id ? '⏳' : '✗'} Reject
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
          <p>{symposiumDate}</p>
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
            className={`nav-item ${activeTab === 'verified' || activeTab === 'accepted' ? 'active' : ''}`} 
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
          {/* Action Message */}
          {actionMessage.text && (
            <div className={`action-message ${actionMessage.type}`} style={{
              padding: '15px 20px',
              borderRadius: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: actionMessage.type === 'success' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(255, 71, 87, 0.1)',
              border: `1px solid ${actionMessage.type === 'success' ? '#2ecc71' : '#ff4757'}`,
              color: actionMessage.type === 'success' ? '#2ecc71' : '#ff4757'
            }}>
              <span>{actionMessage.text}</span>
            </div>
          )}

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
                              registrations.map(reg => {
                                // Safely access properties
                                const safeReg = {
                                  _id: reg?._id,
                                  createdAt: reg?.createdAt,
                                  transactionId: reg?.transactionId || 'N/A',
                                  user: reg?.user || { name: 'N/A', email: '', phone: '', college: '' },
                                  event: reg?.event || { name: reg?.eventName || 'N/A', subEventName: '', category: '' },
                                  teamName: reg?.teamName || 'Individual',
                                  teamSize: reg?.teamSize || 1,
                                  totalAmount: reg?.totalAmount || 0,
                                  paymentStatus: reg?.paymentStatus || 'pending'
                                };

                                return (
                                  <tr key={safeReg._id}>
                                    <td>{safeReg.createdAt ? new Date(safeReg.createdAt).toLocaleDateString() : 'N/A'}</td>
                                    <td>
                                      <span className="transaction-id-full">{safeReg.transactionId}</span>
                                    </td>
                                    <td>
                                      <div className="user-info">
                                        <strong>{safeReg.user?.name || 'N/A'}</strong>
                                        <span className="user-email">{safeReg.user?.email || ''}</span>
                                        <span className="user-phone">{safeReg.user?.phone || ''}</span>
                                        <span className="user-college">{safeReg.user?.college || ''}</span>
                                      </div>
                                    </td>
                                    <td>
                                      <div className="event-info">
                                        <strong>{safeReg.event?.name || safeReg.eventName}</strong>
                                        {safeReg.event?.subEventName && (
                                          <span className="event-subname">📌 {safeReg.event.subEventName}</span>
                                        )}
                                        <span className="event-category">{safeReg.event?.category || ''}</span>
                                      </div>
                                    </td>
                                    <td>
                                      {safeReg.teamName !== 'Individual' ? (
                                        <div className="team-info">
                                          <strong>{safeReg.teamName}</strong>
                                          <span className="team-size">{safeReg.teamSize} members</span>
                                        </div>
                                      ) : (
                                        <span className="individual-tag">Individual</span>
                                      )}
                                    </td>
                                    <td className="amount">₹{safeReg.totalAmount}</td>
                                    <td>
                                      <span className={`status-badge ${getStatusBadgeClass(safeReg.paymentStatus)}`}>
                                        {getStatusText(safeReg.paymentStatus)}
                                      </span>
                                    </td>
                                    
                                    {activeTab === 'pending' && (
                                      <td>
                                        <div className="action-buttons">
                                          <button 
                                            onClick={() => handleStatusUpdate(safeReg._id, 'accepted')} 
                                            className="btn-accept" 
                                            disabled={processingId === safeReg._id}
                                            title="Accept"
                                          >
                                            {processingId === safeReg._id ? '⏳' : '✓'}
                                          </button>
                                          <button 
                                            onClick={() => handleStatusUpdate(safeReg._id, 'rejected')} 
                                            className="btn-reject" 
                                            disabled={processingId === safeReg._id}
                                            title="Reject"
                                          >
                                            {processingId === safeReg._id ? '⏳' : '✗'}
                                          </button>
                                          <button 
                                            onClick={() => viewParticipants(reg)} 
                                            className="btn-view" 
                                            title="View Team"
                                          >
                                            👥
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })
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
                  <span className="value">{selectedRegistration.user?.college || 'N/A'}</span>
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
                        {selectedRegistration.user?.name || 'N/A'}
                        <span className="participant-role"> (Lead)</span>
                      </span>
                    </div>
                    <span className="participant-mobile">{selectedRegistration.user?.phone || 'N/A'}</span>
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