// frontend/src/pages/AdminDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import './AdminDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://symposium-veyj.onrender.com/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [registrations, setRegistrations] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [registrationsOpen, setRegistrationsOpen] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    rejected: 0,
    participants: 0,
    totalRevenue: 0
  });
  
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) return;
      
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

  // Toggle registrations function
  const toggleRegistrations = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        alert('Session expired. Please login again.');
        navigate('/admin/login');
        return;
      }
      
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
      alert(`❌ Failed to toggle registration status`);
    }
  };

  // Fetch registrations
  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        navigate('/admin/login');
        return;
      }
      
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
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminId');
        navigate('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, navigate]);

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }

    fetchRegistrations();
    fetchSettings();
  }, [fetchRegistrations, fetchSettings, navigate]);

  const handleStatusUpdate = async (registrationId, status) => {
    try {
      setProcessingId(registrationId);
      const adminToken = localStorage.getItem('adminToken');

      const response = await axios.put(
        `${API_URL}/admin/registrations/${registrationId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.data.success) {
        fetchRegistrations();
        alert(`✅ Registration ${status} successfully!`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert(`❌ Failed to update registration status`);
    } finally {
      setProcessingId(null);
    }
  };

  const viewParticipants = (registration) => {
    setSelectedRegistration(registration);
    setShowParticipantsModal(true);
  };

  const closeModal = () => {
    setShowParticipantsModal(false);
    setSelectedRegistration(null);
  };

  // Download Participants as Excel - Only specified columns
  const downloadParticipantsSheet = () => {
    if (participants.length === 0) {
      alert('No participants data to download');
      return;
    }

    try {
      const excelData = participants.map((p, index) => ({
        'S.No': index + 1,
        'Participant Name': p.name || 'N/A',
        'Event Name': p.eventName || 'N/A',
        'Mobile Number': p.mobile || 'N/A',
        'College Name': p.college || 'N/A',
        'Year': formatYear(p.year),
        'Role': p.isTeamLead ? 'Team Lead' : 'Member'
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths for better readability
      const colWidths = [
        { wch: 5 },   // S.No
        { wch: 25 },  // Participant Name
        { wch: 25 },  // Event Name
        { wch: 15 },  // Mobile Number
        { wch: 25 },  // College Name
        { wch: 10 },  // Year
        { wch: 10 }   // Role
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

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminId');
    navigate('/admin/login');
  };

  const getTableHeaders = () => {
    if (activeTab === 'participants') {
      return ['S.No', 'Participant Name', 'Mobile', 'Event', 'College', 'Year'];
    }
    const baseHeaders = ['Date', 'Transaction ID', 'User', 'Event', 'Team', 'Amount', 'Status'];
    return activeTab === 'pending' ? [...baseHeaders, 'Actions'] : baseHeaders;
  };

  return (
    <div className="admin-dashboard">
      {/* Navbar */}
      <div className="navbar">
        <div className="navbar-brand">TECNO RENDEZVOUS</div>
        <div className="navbar-links">
          <a href="/">Home</a>
          <a href="/events">Events</a>
          <a href="/admin/login">Admin</a>
          <a href="/dashboard">Dashboard</a>
        </div>
        <div className="navbar-user">
          <span className="user-greeting">Hi,</span>
          <span className="user-name">{user?.name?.split(' ')[0] || 'Admin'}</span>
          <button onClick={handleLogout} className="navbar-logout">Logout</button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <h2>Admin Dashboard</h2>
          <p>2026</p>
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
              </h2>
              <div className="header-actions">
                <div className="live-status-indicator">
                  <span className="live-dot"></span> Live Updates
                </div>
                
                {/* Download Excel Button - Always visible in Participants tab */}
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
                    {/* Participants Tab - CLEAN DISPLAY */}
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
                      /* Registrations Table */
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