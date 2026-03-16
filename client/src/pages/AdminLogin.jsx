// src/pages/AdminLogin.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSymposiumDate } from '../context/DateContext';
import axios from 'axios';
import './AdminLogin.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://symposium-veyj.onrender.com/api';

const AdminLogin = () => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  
  const navigate = useNavigate();
  const { symposiumName } = useSymposiumDate();

  // Check if admin is already logged in
  useEffect(() => {
    const checkExistingSession = () => {
      const adminToken = localStorage.getItem('adminToken');
      const adminLoggedIn = localStorage.getItem('adminLoggedIn');
      const adminData = localStorage.getItem('adminData');
      
      console.log('🔍 Checking existing admin session...');
      console.log('adminToken:', adminToken ? 'Present' : 'Not present');
      console.log('adminLoggedIn:', adminLoggedIn);
      console.log('adminData:', adminData ? 'Present' : 'Not present');
      
      if (adminToken && adminLoggedIn === 'true' && adminData) {
        console.log('✅ Existing admin session found, auto-logging in...');
        navigate('/admin/dashboard', { replace: true });
      } else {
        console.log('❌ No existing admin session');
      }
      
      setCheckingSession(false);
    };

    checkExistingSession();
  }, [navigate]);

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
        localStorage.setItem('adminToken', response.data.data.token);
        localStorage.setItem('adminData', JSON.stringify({
          adminId: response.data.data.adminId,
          name: response.data.data.name || 'Administrator',
          role: response.data.data.role
        }));
        
        localStorage.setItem('adminLoggedIn', 'true');
        
        console.log('✅ Admin login successful, session stored');
        
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (checkingSession) {
    return (
      <div className="admin-login-page">
        <div className="admin-login-container">
          <div className="admin-login-card">
            <div className="admin-login-header">
              <h1>Admin Login</h1>
              <p className="admin-subtitle">Checking existing session...</p>
            </div>
            <div className="loading-spinner" style={{ textAlign: 'center', padding: '40px' }}>
              <div className="spinner" style={{ 
                width: '40px', 
                height: '40px', 
                border: '4px solid rgba(255,215,0,0.3)',
                borderTopColor: '#ffd700',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <h1>Admin Login</h1>
            <p className="admin-subtitle">{symposiumName} Symposium</p>
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

      {/* Add keyframe animation for spinner */}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;