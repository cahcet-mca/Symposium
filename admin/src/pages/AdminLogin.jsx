import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSymposiumDate } from '../context/DateContext';
import { useTheme } from '../context/ThemeContext';
import axios from 'axios';
import trLogo from '../assets/tr-logo.png';
import { 
  UserIcon, 
  LockIcon, 
  AlertIcon, 
  ListIcon, 
  CheckIcon, 
  ChartIcon, 
  BoltIcon 
} from '../components/Icons';
import './AdminLogin.css';

const API_URL = import.meta.env.VITE_API_URL;

const AdminLogin = () => {
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  
  const navigate = useNavigate();
  const { symposiumName } = useSymposiumDate();
  const { theme, toggleTheme } = useTheme();

  // Check if admin is already logged in
  useEffect(() => {
    const checkExistingSession = () => {
      const adminToken = localStorage.getItem('adminToken');
      const adminLoggedIn = localStorage.getItem('adminLoggedIn');
      const adminData = localStorage.getItem('adminData');
      
      if (adminToken && adminLoggedIn === 'true' && adminData) {
        navigate('/admin/dashboard', { replace: true });
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
                border: '4px solid rgba(37,99,235,0.3)',
                borderTopColor: '#2563eb',
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
      {/* Background Decorative Gradient Wave Shapes */}
      <div className="admin-bg-wave-left" />
      <div className="admin-bg-wave-right" />

      <div className="admin-theme-switch-wrapper">
        <button 
          onClick={toggleTheme} 
          className="admin-theme-toggle-btn"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
          )}
        </button>
      </div>

      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <img src={trLogo} alt="TR Logo" className="admin-login-logo" />
            <h1>Admin Portal</h1>
            <p className="admin-subtitle">{symposiumName} Control Center</p>
          </div>

          {error && (
            <div className="admin-error">
              <span className="error-icon"><AlertIcon size={18} /></span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="form-group">
              <label>Admin ID</label>
              <div className="input-wrapper">
                <span className="input-icon"><UserIcon size={18} /></span>
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
                <span className="input-icon"><LockIcon size={18} /></span>
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
                'Login to Admin Dashboard'
              )}
            </button>
          </form>

          <div className="admin-login-footer">
            <p>Back to <Link to="/">Home</Link> or <Link to="/login">User Login</Link></p>
          </div>
        </div>

        <div className="admin-info-card">
          <div className="admin-info-badge">
            <span className="badge-icon"><BoltIcon size={16} /></span>
            <span>Admin Access Only</span>
          </div>
          <h2>Manage Registrations</h2>
          <p>Review pending registrations and accept/reject participant requests seamlessly.</p>
          
          <div className="admin-info-features">
            <div className="feature-item">
              <span className="feature-icon"><ListIcon size={20} /></span>
              <span>Pending Approvals</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon"><CheckIcon size={20} /></span>
              <span>Accept & Reject Controls</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon"><ChartIcon size={20} /></span>
              <span>Live Statistics & Export</span>
            </div>
          </div>
        </div>
      </div>

      {/* Add keyframe animation for spinner - without jsx attribute */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminLogin;