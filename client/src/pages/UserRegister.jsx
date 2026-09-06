// src/pages/UserRegister.jsx - Matching Registration Screenshot
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSymposiumDate } from '../context/DateContext';
import { 
  UserIcon, 
  MailIcon, 
  LockIcon, 
  CollegeIcon, 
  DepartmentIcon, 
  CalendarIcon, 
  PhoneIcon,
  BoltIcon,
  UsersIcon,
  TrophyIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  BulbIcon,
  CloudIcon,
  PaperPlaneIcon
} from '../components/common/Icons';
import axios from 'axios';
import './UserRegister.css';

const API_URL = import.meta.env.VITE_API_URL;

const UserRegister = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    college: '',
    department: '',
    year: '1',
    phone: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { symposiumName } = useSymposiumDate();
  const cardRef = useRef(null);

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

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    for (let key in formData) {
      if (!formData[key] && key !== 'confirmPassword') {
        setError(`Please fill in all fields`);
        return false;
      }
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Please enter a valid 10-digit phone number');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        college: formData.college,
        department: formData.department,
        year: parseInt(formData.year),
        phone: formData.phone
      });

      if (response.data.success) {
        setSuccess('Registration successful! Redirecting to dashboard...');
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data));
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please make sure the backend server is running.');
      } else if (err.response) {
        setError(err.response.data.message || 'Registration failed. Please try again.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-register-page">
      {/* Background Flowing Waves & Accents */}
      <div className="reg-bg-wave-left" />
      <div className="reg-bg-wave-right" />

      <div className="register-layout-grid">
        {/* Left Side: Promo Content & 3 Benefits */}
        <div className="register-promo-left">
          <div className="register-promo-accent-bar" />
          <h1 className="register-promo-title">
            Build Your <br />
            <span className="text-gradient">Future in Tech!</span>
          </h1>
          <p className="register-promo-desc">
            Join {symposiumName} and be part of the innovation, learning and creativity journey.
          </p>

          <div className="register-benefit-cards">
            <div className="benefit-card">
              <div className="benefit-icon-box blue-box">
                <BoltIcon size={20} />
              </div>
              <div className="benefit-text">
                <h3>Learn</h3>
                <p>Gain new skills</p>
              </div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-box purple-box">
                <UsersIcon size={20} />
              </div>
              <div className="benefit-text">
                <h3>Network</h3>
                <p>Meet like-minded people</p>
              </div>
            </div>

            <div className="benefit-card">
              <div className="benefit-icon-box indigo-box">
                <TrophyIcon size={20} />
              </div>
              <div className="benefit-text">
                <h3>Grow</h3>
                <p>Turn your ideas into reality</p>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Registration Card */}
        <div 
          ref={cardRef}
          className="user-register-card section-animate"
        >
          <div className="register-card-accent-bar" />
          <div className="register-header">
            <h2>Create <span className="text-gradient">Account</span></h2>
            <p className="register-subtitle">Join {symposiumName}</p>
          </div>

          {error && (
            <div className="register-error">
              <span className="error-icon"><AlertTriangleIcon size={18} /></span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="register-success">
              <span className="success-icon"><CheckCircleIcon size={18} /></span>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <div className="input-wrapper">
                  <span className="input-icon-box user-box"><UserIcon size={17} /></span>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="mirror-input with-icon-box"
                    placeholder="Enter your full name"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <div className="input-wrapper">
                  <span className="input-icon-box mail-box"><MailIcon size={17} /></span>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="mirror-input with-icon-box"
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Password *</label>
                <div className="input-wrapper">
                  <span className="input-icon-box lock-box"><LockIcon size={17} /></span>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="mirror-input with-icon-box"
                    placeholder="Create a password (min. 6 characters)"
                    minLength="6"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Confirm Password *</label>
                <div className="input-wrapper">
                  <span className="input-icon-box lock-box"><LockIcon size={17} /></span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="mirror-input with-icon-box"
                    placeholder="Confirm your password"
                    minLength="6"
                    required
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>College Name *</label>
              <div className="input-wrapper">
                <span className="input-icon-box college-box"><CollegeIcon size={17} /></span>
                <input
                  type="text"
                  name="college"
                  value={formData.college}
                  onChange={handleChange}
                  className="mirror-input with-icon-box"
                  placeholder="Enter your college name"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Department *</label>
                <div className="input-wrapper">
                  <span className="input-icon-box dept-box"><DepartmentIcon size={17} /></span>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="mirror-input with-icon-box"
                    placeholder="Enter your department"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Year of Study *</label>
                <div className="input-wrapper">
                  <span className="input-icon-box cal-box"><CalendarIcon size={17} /></span>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="mirror-input with-icon-box"
                    required
                    disabled={loading}
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <div className="input-wrapper">
                <span className="input-icon-box phone-box"><PhoneIcon size={17} /></span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="mirror-input with-icon-box"
                  placeholder="Enter 10-digit phone number"
                  maxLength="10"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-auth-glow"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating Account...
                </>
              ) : (
                <>
                  <UserIcon size={18} />
                  <span>Create Account</span>
                  <ArrowRightIcon size={16} />
                </>
              )}
            </button>
          </form>

          <div className="register-footer-box">
            <p>Already have an account? <Link to="/login" className="login-link">Sign In <ArrowRightIcon size={14} /></Link></p>
          </div>
        </div>

        {/* Right Side: Developer Coding Illustration */}
        <div className="register-art-right">
          <div className="flying-plane-art"><PaperPlaneIcon size={34} /></div>
          <div className="floating-bubble code-bubble">&lt;/&gt;</div>
          <div className="floating-bubble idea-bubble"><BulbIcon size={20} /></div>
          <div className="floating-bubble cloud-bubble"><CloudIcon size={20} /></div>
          <div className="developer-illustration-svg">
            <svg viewBox="0 0 320 280" fill="none" xmlns="http://www.w3.org/2000/svg" className="dev-svg">
              <circle cx="160" cy="140" r="120" fill="url(#circleGrad)" opacity="0.15" />
              {/* Laptop base */}
              <rect x="70" y="190" width="180" height="12" rx="4" className="dev-accent" />
              <path d="M90 120 L230 120 L220 190 L100 190 Z" fill="#1e293b" />
              <rect x="95" y="125" width="130" height="60" rx="3" fill="#0f172a" />
              <rect x="105" y="135" width="50" height="4" rx="2" className="dev-accent" />
              <rect x="105" y="145" width="80" height="4" rx="2" className="dev-code-2" />
              <rect x="105" y="155" width="65" height="4" rx="2" className="dev-code-3" />
              {/* Character head & body */}
              <circle cx="210" cy="90" r="24" className="dev-accent" />
              <path d="M185 114 C185 100, 235 100, 235 114 L240 180 L180 180 Z" className="dev-accent" />
              {/* Books */}
              <rect x="235" y="175" width="50" height="8" rx="2" className="dev-book-1" />
              <rect x="230" y="183" width="60" height="9" rx="2" className="dev-book-2" />
              <defs>
                <linearGradient id="circleGrad" x1="40" y1="20" x2="280" y2="260">
                  <stop offset="0%" className="dev-circle-grad-start" />
                  <stop offset="100%" className="dev-circle-grad-end" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRegister;