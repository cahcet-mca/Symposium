// src/pages/Login.jsx - Updated with Scroll Animations

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSymposiumDate } from '../context/DateContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPopup, setShowForgotPopup] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { symposiumName } = useSymposiumDate();

  // Refs for scroll animations
  const cardRef = useRef(null);
  const infoRef = useRef(null);

  const from = location.state?.from || '/dashboard';

  // ============================================
  // SCROLL ANIMATIONS - Intersection Observer
  // ============================================
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -30px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-visible');
        }
      });
    }, observerOptions);

    const sections = [cardRef.current, infoRef.current].filter(Boolean);
    sections.forEach(section => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

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
        <div 
          ref={cardRef}
          className="auth-card section-animate"
        >
          <div className="auth-header">
            <h1>Welcome Back</h1>
            <p className="auth-subtitle">Sign in to your {symposiumName} account</p>
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
              
              <button
                type="button"
                className="forgot-link"
                onClick={() => setShowForgotPopup(true)}
              >
                Forgot Password?
              </button>
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

        {/* Forgot Password Popup */}
        {showForgotPopup && (
          <div className="forgot-popup-overlay" onClick={() => setShowForgotPopup(false)}>
            <div className="forgot-popup" onClick={e => e.stopPropagation()}>
              <div className="forgot-popup-icon">🔐</div>
              <h3>Not Available</h3>
              <p>The Forgot Password feature will be available soon. Please contact support if you need immediate help.</p>
              <button
                className="forgot-popup-close"
                onClick={() => setShowForgotPopup(false)}
              >
                Got it
              </button>
            </div>
          </div>
        )}

        <div 
          ref={infoRef}
          className="auth-info section-animate"
        >
          <div className="info-badge">
            <span className="badge-icon">🎯</span>
            <span>{symposiumName}</span>
          </div>
          <h2>Think Big • Act Smart • Win Together</h2>
          <p>Join hundreds of talented students, researchers, and innovators in this premier symposium.</p>
          
          <div className="info-features stagger-children">
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