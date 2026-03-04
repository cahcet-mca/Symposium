import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://tribyte-symposium.onrender.com/api';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    rejected: 0,
    totalUsers: 0,
    totalRevenue: 0
  });
  const [processingId, setProcessingId] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin is logged in
    const adminToken = localStorage.getItem('adminToken');
    if (!adminToken) {
      navigate('/admin/login');
      return;
    }

    fetchRegistrations();
    fetchStats();
  }, [activeTab, navigate]);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      let url = `${API_URL}/admin/registrations`;
      if (activeTab !== 'all') {
        url = `${API_URL}/admin/registrations?status=${activeTab}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (response.data.success) {
        setRegistrations(response.data.data);
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
  };

  const fetchStats = async () => {
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
  };

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
        // Update local state
        setRegistrations(prev => 
          prev.map(reg => 
            reg._id === registrationId 
              ? { ...reg, paymentStatus: status === 'accepted' ? 'verified' : 'rejected' }
              : reg
          )
        );
        
        // Refresh stats
        fetchStats();
        
        // Show success message
        alert(`Registration ${status} successfully!`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update registration status');
    } finally {
      setProcessingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminId');
    navigate('/admin/login');
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'pending': return 'status-pending';
      case 'verified': return 'status-accepted';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="sidebar-header">
          <h2>TriByte Admin</h2>
          <p>Symposium 2026</p>
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
          </button>
          <button 
            className={`nav-item ${activeTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setActiveTab('rejected')}
          >
            <span className="nav-icon">❌</span>
            Rejected
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
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <h3>₹{stats.totalRevenue}</h3>
              <p>Total Revenue</p>
            </div>
          </div>
        </div>

        {/* Registrations Table */}
        <div className="registrations-section">
          <h2>
            {activeTab === 'pending' && 'Pending Registrations'}
            {activeTab === 'verified' && 'Accepted Registrations'}
            {activeTab === 'rejected' && 'Rejected Registrations'}
            {activeTab === 'all' && 'All Registrations'}
          </h2>

          {loading ? (
            <div className="loading-spinner">Loading...</div>
          ) : (
            <div className="table-container">
              <table className="registrations-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Event</th>
                    <th>Team</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.length > 0 ? (
                    registrations.map(reg => (
                      <tr key={reg._id}>
                        <td>{new Date(reg.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="user-info">
                            <strong>{reg.user?.name}</strong>
                            <small>{reg.user?.email}</small>
                            <small>{reg.user?.phone}</small>
                          </div>
                        </td>
                        <td>
                          <div className="event-info">
                            <strong>{reg.event?.name}</strong>
                            <small>{reg.event?.startTime}</small>
                          </div>
                        </td>
                        <td>
                          {reg.teamName !== 'Individual' ? (
                            <>
                              <strong>{reg.teamName}</strong>
                              <small>{reg.teamSize} members</small>
                            </>
                          ) : (
                            'Individual'
                          )}
                        </td>
                        <td className="amount">₹{reg.totalAmount}</td>
                        <td>
                          <span className={`status-badge ${getStatusBadgeClass(reg.paymentStatus)}`}>
                            {reg.paymentStatus}
                          </span>
                        </td>
                        <td>
                          {reg.paymentStatus === 'pending' && (
                            <div className="action-buttons">
                              <button
                                onClick={() => handleStatusUpdate(reg._id, 'accepted')}
                                className="btn-accept"
                                disabled={processingId === reg._id}
                              >
                                {processingId === reg._id ? '...' : '✓ Accept'}
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(reg._id, 'rejected')}
                                className="btn-reject"
                                disabled={processingId === reg._id}
                              >
                                {processingId === reg._id ? '...' : '✗ Reject'}
                              </button>
                            </div>
                          )}
                          {reg.paymentStatus !== 'pending' && (
                            <span className="status-text">
                              {reg.paymentStatus === 'verified' ? 'Accepted' : 'Rejected'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="no-data">
                        No registrations found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;