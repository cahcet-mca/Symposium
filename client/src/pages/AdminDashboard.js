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
  const [toggling, setToggling] = useState(false);
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    rejected: 0,
    totalUsers: 0,
    totalRevenue: 0
  });
  
  const navigate = useNavigate();

  // Fetch settings
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

  // Fetch registrations based on active tab
  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      let url = `${API_URL}/admin/registrations`;
      if (activeTab !== 'all' && activeTab !== 'participants') {
        url = `${API_URL}/admin/registrations?status=${activeTab}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (response.data.success) {
        setRegistrations(response.data.data);
        
        // Calculate stats from registrations
        const pendingCount = response.data.data.filter(r => r.paymentStatus === 'pending').length;
        const acceptedCount = response.data.data.filter(r => r.paymentStatus === 'verified').length;
        const rejectedCount = response.data.data.filter(r => r.paymentStatus === 'rejected').length;
        const totalRevenue = response.data.data
          .filter(r => r.paymentStatus === 'verified')
          .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
        
        setStats({
          pending: pendingCount,
          accepted: acceptedCount,
          rejected: rejectedCount,
          totalUsers: response.data.data.length,
          totalRevenue: totalRevenue
        });
        
        // If fetching participants tab, extract all participants from verified registrations
        if (activeTab === 'participants') {
          const allParticipants = [];
          response.data.data.forEach(reg => {
            if (reg.paymentStatus === 'verified') { // Only include accepted registrations
              if (reg.participants && reg.participants.length > 0) {
                reg.participants.forEach((p, index) => {
                  allParticipants.push({
                    name: p.name,
                    mobile: p.phone,
                    email: p.email,
                    eventName: reg.event?.name || reg.eventName,
                    eventCategory: reg.event?.category || 'N/A',
                    college: reg.user?.college,
                    year: reg.user?.year,
                    teamName: reg.teamName,
                    teamSize: reg.teamSize,
                    isTeamLead: index === 0,
                    registrationDate: new Date(reg.createdAt).toLocaleDateString(),
                    transactionId: reg.transactionId,
                    amount: reg.totalAmount
                  });
                });
              } else {
                // Individual participant
                allParticipants.push({
                  name: reg.user?.name,
                  mobile: reg.user?.phone,
                  email: reg.user?.email,
                  eventName: reg.event?.name || reg.eventName,
                  eventCategory: reg.event?.category || 'N/A',
                  college: reg.user?.college,
                  year: reg.user?.year,
                  teamName: 'Individual',
                  teamSize: 1,
                  isTeamLead: true,
                  registrationDate: new Date(reg.createdAt).toLocaleDateString(),
                  transactionId: reg.transactionId,
                  amount: reg.totalAmount
                });
              }
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

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await axios.get(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Toggle registrations open/closed
  const toggleRegistrations = async () => {
    try {
      setToggling(true);
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await axios.put(
        `${API_URL}/admin/settings/toggle-registrations`,
        {},
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      if (response.data.success) {
        setRegistrationsOpen(response.data.data.registrationsOpen);
        alert(`✅ Registrations are now ${response.data.data.registrationsOpen ? 'OPEN' : 'CLOSED'}`);
      }
    } catch (error) {
      console.error('Error toggling registrations:', error);
      alert('❌ Failed to toggle registration status');
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }

    fetchRegistrations();
    fetchStats();
    fetchSettings();
  }, [fetchRegistrations, fetchStats, fetchSettings, navigate]);

  // Handle accept/reject
  const handleStatusUpdate = async (registrationId, status) => {
    try {
      setProcessingId(registrationId);
      const adminToken = localStorage.getItem('adminToken');

      const response = await axios.put(
        `${API_URL}/admin/registrations/${registrationId}/status`,
        { status },
        { 
          headers: { 
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      if (response.data.success) {
        // Update local state
        setRegistrations(prev => 
          prev.map(reg => 
            reg._id === registrationId 
              ? { 
                  ...reg, 
                  paymentStatus: status === 'accepted' ? 'verified' : 'rejected',
                  registrationStatus: status === 'accepted' ? 'confirmed' : 'cancelled'
                }
              : reg
          )
        );
        
        // Refresh stats
        fetchRegistrations();
        fetchStats();
        
        // Show success message
        alert(`✅ Registration ${status} successfully!`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      
      let errorMessage = 'Failed to update registration status';
      if (error.response) {
        errorMessage = error.response.data?.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message;
      }
      
      alert(`❌ ${errorMessage}`);
    } finally {
      setProcessingId(null);
    }
  };

  // View participants details
  const viewParticipants = (registration) => {
    setSelectedRegistration(registration);
    setShowParticipantsModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowParticipantsModal(false);
    setSelectedRegistration(null);
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

  // Helper function to format year with suffix
  const formatYear = (year) => {
    if (!year && year !== 0) return 'N/A';
    
    const yearNum = parseInt(year);
    if (isNaN(yearNum)) return year;
    
    const suffix = getYearSuffix(yearNum);
    return `${yearNum}${suffix} Year`;
  };

  const getYearSuffix = (year) => {
    if (year === 1) return 'st';
    if (year === 2) return 'nd';
    if (year === 3) return 'rd';
    return 'th';
  };

  // Download Participants as Excel
  const downloadParticipantsSheet = () => {
    if (participants.length === 0) {
      alert('No participants data to download');
      return;
    }

    try {
      const excelData = participants.map((p, index) => ({
        'S.No': index + 1,
        'Participant Name': p.name || 'N/A',
        'Mobile Number': p.mobile || 'N/A',
        'Email': p.email || 'N/A',
        'Event Name': p.eventName || 'N/A',
        'Event Category': p.eventCategory || 'N/A',
        'College Name': p.college || 'N/A',
        'Year': formatYear(p.year),
        'Team Name': p.teamName || 'Individual',
        'Team Size': p.teamSize || 1,
        'Role': p.isTeamLead ? 'Team Lead' : 'Member',
        'Registration Date': p.registrationDate || 'N/A',
        'Transaction ID': p.transactionId || 'N/A',
        'Amount Paid': p.amount ? `₹${p.amount}` : 'N/A'
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      
      const colWidths = [
        { wch: 5 },   // S.No
        { wch: 25 },  // Participant Name
        { wch: 15 },  // Mobile Number
        { wch: 30 },  // Email
        { wch: 25 },  // Event Name
        { wch: 15 },  // Event Category
        { wch: 25 },  // College Name
        { wch: 10 },  // Year
        { wch: 20 },  // Team Name
        { wch: 10 },  // Team Size
        { wch: 10 },  // Role
        { wch: 15 },  // Registration Date
        { wch: 25 },  // Transaction ID
        { wch: 12 }   // Amount Paid
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Participants');

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const fileName = `participants_list_${dateStr}.xlsx`;

      XLSX.writeFile(wb, fileName);
      alert(`✅ Participants list downloaded successfully!\nTotal: ${participants.length} participants`);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('❌ Failed to download participants list');
    }
  };

  // Download All Registrations as Excel
  const downloadAllRegistrationsSheet = () => {
    if (registrations.length === 0) {
      alert('No registrations data to download');
      return;
    }

    try {
      const excelData = registrations.map((reg, index) => ({
        'S.No': index + 1,
        'Date': new Date(reg.createdAt).toLocaleDateString(),
        'Transaction ID': reg.transactionId || 'N/A',
        'User Name': reg.user?.name || 'N/A',
        'Email': reg.user?.email || 'N/A',
        'Phone': reg.user?.phone || 'N/A',
        'College': reg.user?.college || 'N/A',
        'Year': formatYear(reg.user?.year),
        'Event Name': reg.event?.name || reg.eventName || 'N/A',
        'Event Category': reg.event?.category || 'N/A',
        'Event Time': reg.event?.startTime || 'N/A',
        'Team Name': reg.teamName || 'Individual',
        'Team Size': reg.teamSize || 1,
        'Amount': `₹${reg.totalAmount || 0}`,
        'Payment Status': reg.paymentStatus === 'verified' ? 'Accepted' : 
                          reg.paymentStatus === 'pending' ? 'Pending' : 'Rejected',
        'Registration Status': reg.registrationStatus || 'N/A',
        'Number of Participants': reg.participants?.length || 1
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Registrations');

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const fileName = `all_registrations_${dateStr}.xlsx`;

      XLSX.writeFile(wb, fileName);
      alert(`✅ All registrations downloaded successfully!\nTotal: ${registrations.length} registrations`);
    } catch (error) {
      console.error('Error downloading Excel:', error);
      alert('❌ Failed to download registrations');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminId');
    navigate('/admin/login');
  };

  // Determine which columns to show based on active tab
  const getTableHeaders = () => {
    if (activeTab === 'participants') {
      return ['S.No', 'Participant Name', 'Mobile Number', 'Event Name', 'College Name', 'Year'];
    }
    
    const baseHeaders = ['Date', 'Transaction ID', 'User', 'Event', 'Team', 'Amount', 'Status'];
    
    if (activeTab === 'pending') {
      return [...baseHeaders, 'Actions'];
    } else {
      return baseHeaders;
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <h2>TECNO RENDEZVOUS</h2>
          <p>Admin Dashboard 2026</p>
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
            {participants.length > 0 && <span className="badge info">{participants.length}</span>}
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
          {/* Toggle Button - Above Logout */}
          <div className="toggle-container">
            <button 
              onClick={toggleRegistrations}
              className={`toggle-btn ${registrationsOpen ? 'on' : 'off'}`}
              disabled={toggling}
              title={registrationsOpen ? 'Click to close registrations' : 'Click to open registrations'}
            >
              <span className="toggle-icon">{registrationsOpen ? '🔓' : '🔒'}</span>
              <span className="toggle-text">
                {toggling ? 'Updating...' : (registrationsOpen ? 'Registrations: ON' : 'Registrations: OFF')}
              </span>
            </button>
          </div>
          
          {/* Logout Button */}
          <button onClick={handleLogout} className="logout-btn">
            <span className="nav-icon">🚪</span>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="admin-main">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <h3>{stats.pending}</h3>
              <p>Pending Approvals</p>
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
              <h3>{participants.length || stats.accepted}</h3>
              <p>Total Participants</p>
            </div>
          </div>
          <div className="stat-card revenue-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3>₹{stats.totalRevenue}</h3>
              <p>Total Revenue</p>
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
                <span className="live-dot"></span>
                <span>Live Updates</span>
              </div>
              
              {/* Download Excel Button - Only show in Participants tab */}
              {activeTab === 'participants' && participants.length > 0 && (
                <button 
                  onClick={downloadParticipantsSheet}
                  className="btn-download-excel"
                  title="Download Participants List as Excel"
                >
                  <span className="btn-icon">📊</span>
                  Download Excel
                </button>
              )}
              
              {/* Download All Registrations Button - Only show in All tab */}
              {activeTab === 'all' && registrations.length > 0 && (
                <button 
                  onClick={downloadAllRegistrationsSheet}
                  className="btn-download-excel all"
                  title="Download All Registrations as Excel"
                >
                  <span className="btn-icon">📋</span>
                  Download All
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading data...</p>
            </div>
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
                  {/* Participants Tab View */}
                  {activeTab === 'participants' ? (
                    participants.length > 0 ? (
                      participants.map((participant, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>
                            <div className="participant-name-cell">
                              {participant.name}
                              {participant.teamSize > 1 && participant.isTeamLead && 
                                <span className="lead-indicator">(Lead)</span>
                              }
                            </div>
                          </td>
                          <td>
                            <span className="participant-mobile-cell">{participant.mobile}</span>
                          </td>
                          <td>
                            <div className="participant-event-cell">
                              <strong>{participant.eventName}</strong>
                              {participant.teamName !== 'Individual' && 
                                <small className="team-name">{participant.teamName}</small>
                              }
                            </div>
                          </td>
                          <td>{participant.college || 'N/A'}</td>
                          <td>{formatYear(participant.year)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="no-data">
                          <div className="no-data-content">
                            <span className="no-data-icon">👥</span>
                            <p>No participants found</p>
                          </div>
                        </td>
                      </tr>
                    )
                  ) : (
                    /* Registrations Table View */
                    registrations.length > 0 ? (
                      registrations.map(reg => (
                        <tr key={reg._id}>
                          <td>{new Date(reg.createdAt).toLocaleDateString()}</td>
                          <td>
                            <span className="transaction-id-full" title={reg.transactionId}>
                              {reg.transactionId || 'N/A'}
                            </span>
                          </td>
                          <td>
                            <div className="user-info">
                              <strong>{reg.user?.name || 'N/A'}</strong>
                              <span className="user-email">{reg.user?.email || 'N/A'}</span>
                              <span className="user-phone">{reg.user?.phone || 'N/A'}</span>
                              <span className="user-college">
                                {reg.user?.college || 'N/A'} - {formatYear(reg.user?.year)}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="event-info">
                              <strong>{reg.event?.name || reg.eventName || 'N/A'}</strong>
                              <span className="event-category">{reg.event?.category || 'N/A'}</span>
                              <span className="event-time">{reg.event?.startTime || 'N/A'}</span>
                            </div>
                          </td>
                          <td>
                            {reg.teamName && reg.teamName !== 'Individual' ? (
                              <div className="team-info">
                                <strong>{reg.teamName}</strong>
                                <span className="team-size">{reg.teamSize} members</span>
                              </div>
                            ) : (
                              <span className="individual-tag">Individual</span>
                            )}
                          </td>
                          <td className="amount">₹{reg.totalAmount || 0}</td>
                          <td>
                            <span className={`status-badge ${getStatusBadgeClass(reg.paymentStatus)}`}>
                              {getStatusText(reg.paymentStatus)}
                            </span>
                          </td>
                          
                          {/* Actions column - only for pending registrations */}
                          {activeTab === 'pending' && (
                            <td>
                              <div className="action-buttons">
                                <button
                                  onClick={() => handleStatusUpdate(reg._id, 'accepted')}
                                  className="btn-accept"
                                  disabled={processingId === reg._id}
                                  title="Accept Registration"
                                >
                                  {processingId === reg._id ? '...' : '✓ Accept'}
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(reg._id, 'rejected')}
                                  className="btn-reject"
                                  disabled={processingId === reg._id}
                                  title="Reject Registration"
                                >
                                  {processingId === reg._id ? '...' : '✗ Reject'}
                                </button>
                                <button 
                                  onClick={() => viewParticipants(reg)}
                                  className="btn-view-participants"
                                  title="View Team Members"
                                >
                                  👥
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={activeTab === 'pending' ? 8 : 7} className="no-data">
                          <div className="no-data-content">
                            <span className="no-data-icon">📭</span>
                            <p>No {activeTab} registrations found</p>
                          </div>
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

      {/* Participants Modal - Shows details for specific registration */}
      {showParticipantsModal && selectedRegistration && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Team Members</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Event Name */}
              <div className="event-name-section">
                <span className="event-label">Event:</span>
                <span className="event-name">
                  {selectedRegistration.event?.name || selectedRegistration.eventName || 'N/A'}
                </span>
              </div>

              {/* College & Year */}
              <div className="college-year-section">
                <div className="college-info">
                  <span className="college-label">College:</span>
                  <span className="college-value">
                    {selectedRegistration.user?.college || 'N/A'}
                  </span>
                </div>
                <div className="year-info">
                  <span className="year-label">Year:</span>
                  <span className="year-value">
                    {formatYear(selectedRegistration.user?.year)}
                  </span>
                </div>
              </div>

              {/* Participants List */}
              <div className="participants-section">
                <h4 className="section-subtitle">Team Members</h4>
                <div className="participants-list-detailed">
                  {selectedRegistration.participants && selectedRegistration.participants.length > 0 ? (
                    selectedRegistration.participants.map((p, index) => (
                      <div key={index} className="participant-card-detailed">
                        <div className="participant-name-row">
                          <span className="participant-name-label">Name:</span>
                          <span className="participant-name-value">
                            {p.name || 'N/A'}
                            {index === 0 && selectedRegistration.teamSize > 1 && 
                              <span className="lead-badge-detailed"> (Team Lead)</span>
                            }
                          </span>
                        </div>
                        <div className="participant-mobile-row">
                          <span className="participant-mobile-label">Mobile:</span>
                          <span className="participant-mobile-value">{p.phone || 'N/A'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="participant-card-detailed">
                      <div className="participant-name-row">
                        <span className="participant-name-label">Name:</span>
                        <span className="participant-name-value">{selectedRegistration.user?.name || 'N/A'}</span>
                      </div>
                      <div className="participant-mobile-row">
                        <span className="participant-mobile-label">Mobile:</span>
                        <span className="participant-mobile-value">{selectedRegistration.user?.phone || 'N/A'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="status-section">
                <div className="status-card">
                  <span className="status-label">Current Status:</span>
                  <span className={`status-value ${selectedRegistration.paymentStatus}`}>
                    {selectedRegistration.paymentStatus === 'pending' && '⏳ Pending Approval'}
                    {selectedRegistration.paymentStatus === 'verified' && '✅ Accepted'}
                    {selectedRegistration.paymentStatus === 'rejected' && '❌ Rejected'}
                  </span>
                </div>
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