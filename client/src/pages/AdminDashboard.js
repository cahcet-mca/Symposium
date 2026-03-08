import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx'; // Re-added for Excel download
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
      
      if (!adminToken) {
        console.log('No admin token found');
        return;
      }
      
      const response = await axios.get(`${API_URL}/admin/settings`, {
        headers: { 
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
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
      
      if (!adminToken) {
        navigate('/admin/login');
        return;
      }
      
      let url = `${API_URL}/admin/registrations`;
      if (activeTab !== 'all' && activeTab !== 'participants') {
        let statusParam = activeTab;
        if (activeTab === 'verified') statusParam = 'verified';
        if (activeTab === 'rejected') statusParam = 'rejected';
        if (activeTab === 'pending') statusParam = 'pending';
        
        url = `${API_URL}/admin/registrations?status=${statusParam}`;
      }

      const response = await axios.get(url, {
        headers: { 
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setRegistrations(response.data.data);
        
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
        
        // Extract participants for participants tab
        if (activeTab === 'participants') {
          const allParticipants = [];
          response.data.data.forEach(reg => {
            if (reg.paymentStatus === 'verified') {
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
      if (!adminToken) return;
      
      const response = await axios.get(`${API_URL}/admin/stats`, {
        headers: { 
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  // Toggle registrations
  const toggleRegistrations = async () => {
    try {
      setToggling(true);
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
        setRegistrations(prev => 
          prev.map(reg => 
            reg._id === registrationId 
              ? { 
                  ...reg, 
                  paymentStatus: status === 'accepted' ? 'verified' : 'rejected'
                }
              : reg
          )
        );
        
        fetchRegistrations();
        fetchStats();
        
        alert(`✅ Registration ${status} successfully!`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert(`❌ Failed to update registration status`);
    } finally {
      setProcessingId(null);
    }
  };

  // View participants
  const viewParticipants = (registration) => {
    setSelectedRegistration(registration);
    setShowParticipantsModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowParticipantsModal(false);
    setSelectedRegistration(null);
  };

  // Download Participants as Excel
  const downloadParticipantsSheet = () => {
    if (participants.length === 0) {
      alert('No participants data to download');
      return;
    }

    try {
      // Prepare data for Excel with detailed columns
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

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // Set column widths for better readability
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
        { wch: 20 },  // Transaction ID - Full 12 digits
        { wch: 12 }   // Amount Paid
      ];
      ws['!cols'] = colWidths;

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Participants');

      // Generate filename with current date
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const fileName = `participants_list_${dateStr}.xlsx`;

      // Download file
      XLSX.writeFile(wb, fileName);

      alert(`✅ Participants list downloaded successfully!\nTotal: ${participants.length} participants`);
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
          {/* Toggle Button */}
          <div className="toggle-container">
            <button 
              onClick={toggleRegistrations}
              className={`toggle-btn ${registrationsOpen ? 'on' : 'off'}`}
              disabled={toggling}
            >
              <span className="toggle-icon">{registrationsOpen ? '🔓' : '🔒'}</span>
              <span className="toggle-text">
                {toggling ? 'Updating...' : (registrationsOpen ? 'Registrations ON' : 'Registrations OFF')}
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
              <h3>{participants.length}</h3>
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
              
              {/* Download Excel Button - Only show in Participants tab */}
              {activeTab === 'participants' && participants.length > 0 && (
                <button 
                  onClick={downloadParticipantsSheet}
                  className="btn-download-excel"
                  title="Download Participants List as Excel"
                >
                  <span className="btn-icon">📥</span>
                  Download Excel
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
                  {/* Participants Tab View */}
                  {activeTab === 'participants' ? (
                    participants.length > 0 ? (
                      participants.map((p, i) => (
                        <tr key={i}>
                          <td>{i+1}</td>
                          <td>
                            {p.name}
                            {p.isTeamLead && <span className="lead-indicator"> (Lead)</span>}
                          </td>
                          <td>{p.mobile}</td>
                          <td>
                            <strong>{p.eventName}</strong>
                            {p.teamName !== 'Individual' && <small> {p.teamName}</small>}
                          </td>
                          <td>{p.college}</td>
                          <td>{formatYear(p.year)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="no-data">No participants found</td>
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
                              <strong>{reg.user?.name}</strong>
                              <small>{reg.user?.email}</small>
                              <small>{reg.user?.phone}</small>
                              <small>{reg.user?.college} - {formatYear(reg.user?.year)}</small>
                            </div>
                          </td>
                          <td>
                            <div className="event-info">
                              <strong>{reg.event?.name || reg.eventName}</strong>
                              <small>{reg.event?.category}</small>
                            </div>
                          </td>
                          <td>
                            {reg.teamName !== 'Individual' ? (
                              <>
                                <strong>{reg.teamName}</strong>
                                <small>{reg.teamSize} members</small>
                              </>
                            ) : 'Individual'}
                          </td>
                          <td className="amount">₹{reg.totalAmount}</td>
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
                                  title="Accept"
                                >
                                  ✓
                                </button>
                                <button 
                                  onClick={() => handleStatusUpdate(reg._id, 'rejected')} 
                                  className="btn-reject" 
                                  disabled={processingId === reg._id}
                                  title="Reject"
                                >
                                  ✗
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

      {/* Participants Modal */}
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
              </div>
              <div className="college-year-section">
                <div><span className="label">College:</span> {selectedRegistration.user?.college}</div>
                <div><span className="label">Year:</span> {formatYear(selectedRegistration.user?.year)}</div>
              </div>
              <div className="participants-list">
                {selectedRegistration.participants?.length > 0 ? 
                  selectedRegistration.participants.map((p, i) => (
                    <div key={i} className="participant-item">
                      <span><strong>{p.name}</strong>{i === 0 && selectedRegistration.teamSize > 1 && ' (Lead)'}</span>
                      <span className="mobile">{p.phone}</span>
                    </div>
                  )) : 
                  <div className="participant-item">
                    <span>{selectedRegistration.user?.name}</span>
                    <span className="mobile">{selectedRegistration.user?.phone}</span>
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