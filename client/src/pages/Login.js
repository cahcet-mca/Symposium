import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const from = location.state?.from || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Invalid email or password');
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Welcome Back</h1>
            <p className="auth-subtitle">Sign in to your TECNO RENDEZVOUS account</p>
          </div>

          {error && (
            <div className="auth-error">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon">📧</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mirror-input with-icon"
                  placeholder="Enter your email"
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
                  className="mirror-input with-icon"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <div className="form-options">
              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkmark"></span>
                <span className="remember-text">Remember me</span>
              </label>
              
              <Link to="/forgot-password" className="forgot-link">
                Forgot Password?
              </Link>
            </div>

            <button 
              type="submit" 
              className="btn-auth-glow"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                <>
                  <span className="btn-text">Sign In</span>
                  <span className="btn-icon">→</span>
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>Don't have an account?</p>
            <Link to="/register" className="register-link">
              Create Account
              <span className="link-icon">✨</span>
            </Link>
          </div>
        </div>

        <div className="auth-info">
          <div className="info-badge">
            <span className="badge-icon">🎯</span>
            <span>TECNO RENDEZVOUS</span>
          </div>
          <h2>Think Big • Act Smart • Win Togther</h2>
          <p>Join hundreds of talented students, researchers, and innovators in this premier symposium.</p>
          
          <div className="info-features">
            <div className="feature-item">
              <span className="feature-icon">⚡</span>
              <span>9+ Competitions</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🏆</span>
              <span>Exciting Prizes</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🎓</span>
              <span>E-Certificates</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;