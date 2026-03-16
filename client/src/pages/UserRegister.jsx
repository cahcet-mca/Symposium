// src/pages/UserRegister.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSymposiumDate } from '../context/DateContext';
import axios from 'axios';
import './UserRegister.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://symposium-veyj.onrender.com/api';

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
      const { confirmPassword, ...userData } = formData;
      
      console.log('Sending registration data:', userData);
      
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      
      console.log('Registration response:', response.data);
      
      if (response.data.success) {
        setSuccess('Registration successful! Redirecting to dashboard...');
        
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data));
        
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err) {
      console.error('Registration error:', err);
      
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot connect to server. Please make sure the backend server is running.');
      } else if (err.response) {
        setError(err.response.data.message || 'Registration failed. Please try again.');
      } else if (err.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-register-page">
      <div className="user-register-container">
        <div className="user-register-card">
          <div className="register-header">
            <h1>Create Account</h1>
            <p className="register-subtitle">Join {symposiumName}</p>
          </div>

          {error && (
            <div className="register-error">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="register-success">
              <span className="success-icon">✅</span>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your full name"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Create a password (min. 6 characters)"
                  minLength="6"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Confirm your password"
                  minLength="6"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>College Name *</label>
              <input
                type="text"
                name="college"
                value={formData.college}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter your college name"
                required
                disabled={loading}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Department *</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your department"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Year of Study *</label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="form-select"
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

            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
                placeholder="Enter 10-digit phone number"
                pattern="[0-9]{10}"
                maxLength="10"
                required
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="btn-register-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="register-footer">
            <p>Already have an account?</p>
            <Link to="/login" className="login-link">
              Sign In →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRegister;