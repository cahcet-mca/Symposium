import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './AdminLogin.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://symposium-veyj.onrender.com/api';

const AdminLogin = () => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/admin/login`, {
        adminId,
        password
      });

      if (response.data.success) {
        // Store admin token
        localStorage.setItem('adminToken', response.data.data.token);
        localStorage.setItem('adminId', response.data.data.adminId);
        
        // Redirect to admin dashboard
        navigate('/admin/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <h1>Admin Login</h1>
            <p className="admin-subtitle">TECNO RENDEZVOUS Symposium 2026</p>
          </div>

          {error && (
            <div className="admin-error">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="form-group">
              <label>Admin ID</label>
              <div className="input-wrapper">
                <span className="input-icon">👤</span>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  className="admin-input"
                  placeholder="Enter admin ID"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="admin-input"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="admin-login-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Verifying...
                </>
              ) : (
                'Login as Admin'
              )}
            </button>
          </form>

          <div className="admin-login-footer">
            <p>Back to <Link to="/">Home</Link> or <Link to="/login">User Login</Link></p>
          </div>
        </div>

        <div className="admin-info-card">
          <div className="admin-info-badge">
            <span className="badge-icon">⚡</span>
            <span>Admin Access Only</span>
          </div>
          <h2>Manage Registrations</h2>
          <p>Review pending registrations and accept/reject participant requests.</p>
          
          <div className="admin-info-features">
            <div className="feature-item">
              <span className="feature-icon">📋</span>
              <span>Pending Approvals</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">✅</span>
              <span>Accept/Reject</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span>View Statistics</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;