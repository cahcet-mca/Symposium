// src/pages/Login.jsx - Updated with SVG Icons and Modern Layout

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSymposiumDate } from '../context/DateContext';
import { 
  MailIcon, 
  LockIcon, 
  TargetIcon, 
  TrophyIcon, 
  AwardIcon, 
  CertificateIcon, 
  AlertTriangleIcon,
  ArrowRightIcon,
  UserIcon,
  PaperPlaneIcon
} from '../components/common/Icons';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL;

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
      {/* Background Decorative Gradient Wave Shapes */}
      <div className="auth-bg-wave-left" />
      <div className="auth-bg-wave-right" />
      <div className="auth-bg-airplane"><PaperPlaneIcon size={36} /></div>

      <div className="auth-container">
        <div 
          ref={cardRef}
          className="auth-card section-animate"
        >
          <div className="auth-card-accent-bar" />
          <div className="auth-header">
            <h1>Welcome <span className="text-gradient">Back</span></h1>
            <p className="auth-subtitle">Sign in to your {symposiumName} account</p>
          </div>

          {error && (
            <div className="auth-error">
              <span className="error-icon"><AlertTriangleIcon size={18} /></span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon-box mail-box">
                  <MailIcon size={18} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mirror-input with-icon-box"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-wrapper">
                <span className="input-icon-box lock-box">
                  <LockIcon size={18} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mirror-input with-icon-box"
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
                  <span className="btn-arrow-icon"><ArrowRightIcon size={16} /></span>
                </>
              )}
            </button>
          </form>

          <div className="auth-footer-box">
            <p>Don't have an account?</p>
            <Link to="/register" className="register-link-btn">
              <UserIcon size={16} />
              <span>Create Account</span>
              <ArrowRightIcon size={14} />
            </Link>
          </div>
        </div>

        {/* Forgot Password Popup */}
        {showForgotPopup && (
          <div className="forgot-popup-overlay" onClick={() => setShowForgotPopup(false)}>
            <div className="forgot-popup" onClick={e => e.stopPropagation()}>
              <div className="forgot-popup-icon">
                <LockIcon size={28} />
              </div>
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
            <span className="badge-icon"><TargetIcon size={16} /></span>
            <span>{symposiumName}</span>
          </div>
          <h2>Think Big • Act Smart • <span className="text-gradient">Win Together</span></h2>
          <p>Join hundreds of talented students, researchers, and innovators in this premier symposium.</p>
          
          <div className="info-features stagger-children">
            <div className="feature-item feature-blue">
              <div className="feature-icon-wrapper blue-icon-bg">
                <TrophyIcon size={20} />
              </div>
              <span className="feature-text">9+ Competitions</span>
              <span className="feature-arrow"><ArrowRightIcon size={16} /></span>
            </div>
            <div className="feature-item feature-purple">
              <div className="feature-icon-wrapper purple-icon-bg">
                <AwardIcon size={20} />
              </div>
              <span className="feature-text">Exciting Prizes</span>
              <span className="feature-arrow"><ArrowRightIcon size={16} /></span>
            </div>
            <div className="feature-item feature-green">
              <div className="feature-icon-wrapper green-icon-bg">
                <CertificateIcon size={20} />
              </div>
              <span className="feature-text">E-Certificates</span>
              <span className="feature-arrow"><ArrowRightIcon size={16} /></span>
            </div>
          </div>

          {/* Decorative Campus & Students Illustration */}
          <div className="auth-illustration-container">
            <div className="campus-art-backdrop" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;