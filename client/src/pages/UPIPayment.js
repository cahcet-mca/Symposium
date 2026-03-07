// frontend/src/pages/UPIPayment.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvents } from '../context/EventContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import axios from 'axios';
import './UPIPayment.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://symposium-veyj.onrender.com/api';

const UPIPayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getEvent } = useEvents();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [checkingConflict, setCheckingConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeConflict, setTimeConflict] = useState(null);
  const [fetchError, setFetchError] = useState('');
  const [registrationsOpen, setRegistrationsOpen] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [transactionIdError, setTransactionIdError] = useState('');
  
  // Use ref to store event data to ensure it's available at submission
  const eventRef = useRef(null);
  
  const [formData, setFormData] = useState({
    teamSize: 1,
    teamName: '',
    participants: [],
    transactionId: '',
    screenshot: null,
    screenshotPreview: null
  });
  
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [error, setError] = useState('');

  // Validate UPI Transaction ID (only 12-digit numbers)
  const validateTransactionId = (value) => {
    // Remove any non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    
    if (digitsOnly.length === 0) {
      setTransactionIdError('Transaction ID is required');
      return false;
    }
    
    if (digitsOnly.length !== 12) {
      setTransactionIdError('Transaction ID must be exactly 12 digits');
      return false;
    }
    
    if (!/^\d+$/.test(digitsOnly)) {
      setTransactionIdError('Transaction ID must contain only numbers');
      return false;
    }
    
    setTransactionIdError('');
    return true;
  };

  // Handle transaction ID change with auto-formatting
  const handleTransactionIdChange = (e) => {
    const rawValue = e.target.value;
    // Remove any non-digit characters
    const digitsOnly = rawValue.replace(/\D/g, '');
    
    // Limit to 12 digits
    const limitedDigits = digitsOnly.slice(0, 12);
    
    setFormData(prev => ({
      ...prev,
      transactionId: limitedDigits
    }));
    
    // Validate
    validateTransactionId(limitedDigits);
  };

  // Check if registrations are open
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        setCheckingStatus(true);
        const response = await axios.get(`${API_URL}/admin/settings`);
        if (response.data.success) {
          setRegistrationsOpen(response.data.data.registrationsOpen);
          
          if (!response.data.data.registrationsOpen) {
            alert('Online registration is finished. Only on-time registration is available at the venue.');
            navigate('/events');
          }
        }
      } catch (error) {
        console.error('Error checking registration status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkRegistrationStatus();
  }, [navigate]);

  // Wrap checkTimeConflict in useCallback
  const checkTimeConflict = useCallback(async (eventData) => {
    try {
      setCheckingConflict(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.log('No token found, redirecting to login');
        navigate('/login');
        return;
      }
      
      const response = await api.post(
        '/registrations/check-conflict',
        { eventId: eventData._id }
      );
      
      if (response.data.success === false && response.data.conflict) {
        setTimeConflict(response.data.message);
      } else {
        setTimeConflict(null);
      }
    } catch (error) {
      console.error('Conflict check error:', error);
      setTimeConflict(null);
    } finally {
      setCheckingConflict(false);
    }
  }, [navigate]);

  // Wrap fetchEvent in useCallback
  const fetchEvent = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError('');
      
      console.log('Fetching event with ID:', id);
      const eventData = await getEvent(id);
      
      console.log('Event data received:', eventData);
      
      if (!eventData) {
        setFetchError('Event not found');
        setLoading(false);
        return;
      }
      
      // Store event in ref
      eventRef.current = eventData;
      
      // Check for time conflict
      if (eventData._id && eventData._id.length === 24) {
        await checkTimeConflict(eventData);
      }
      
      // Initialize participants based on user data
      const initialParticipants = Array(eventData.minTeamSize || 1).fill().map((_, index) => ({
        name: index === 0 && user ? user.name || '' : '',
        email: index === 0 && user ? user.email || '' : '',
        phone: index === 0 && user ? user.phone || '' : '',
      }));
      
      setFormData(prev => ({
        ...prev,
        teamSize: eventData.minTeamSize || 1,
        participants: initialParticipants
      }));
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching event:', error);
      setFetchError('Failed to load event details: ' + (error.message || 'Unknown error'));
      setLoading(false);
    }
  }, [id, getEvent, user, checkTimeConflict]);

  useEffect(() => {
    console.log('Event ID from URL:', id);
    if (id && registrationsOpen && !checkingStatus) {
      fetchEvent();
    } else if (!registrationsOpen && !checkingStatus) {
      navigate('/events');
    }
  }, [id, fetchEvent, registrationsOpen, checkingStatus, navigate]);

  const handleTeamSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    setFormData(prev => {
      const newParticipants = [...prev.participants];
      if (newSize > prev.participants.length) {
        for (let i = prev.participants.length; i < newSize; i++) {
          newParticipants.push({ name: '', email: '', phone: '' });
        }
      } else {
        newParticipants.length = newSize;
      }
      return { ...prev, teamSize: newSize, participants: newParticipants };
    });
  };

  const handleParticipantChange = (index, field, value) => {
    setFormData(prev => {
      const updatedParticipants = [...prev.participants];
      updatedParticipants[index] = {
        ...updatedParticipants[index],
        [field]: value
      };
      return { ...prev, participants: updatedParticipants };
    });
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size too large. Please upload image less than 5MB.');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          screenshot: reader.result,
          screenshotPreview: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    // Use ref to check if event exists
    const currentEvent = eventRef.current;
    
    if (!currentEvent) {
      setError('Event data not loaded. Please refresh the page.');
      return false;
    }

    if (currentEvent.type === 'Team' && !formData.teamName.trim()) {
      setError('Please enter a team name');
      return false;
    }

    for (let i = 0; i < formData.participants.length; i++) {
      const p = formData.participants[i];
      if (!p.name?.trim()) {
        setError(`Please enter name for participant ${i + 1}`);
        return false;
      }
      if (!p.email?.trim() || !p.email.includes('@')) {
        setError(`Please enter valid email for participant ${i + 1}`);
        return false;
      }
      if (!p.phone?.trim() || p.phone.length !== 10 || !/^\d+$/.test(p.phone)) {
        setError(`Please enter valid 10-digit phone number for participant ${i + 1}`);
        return false;
      }
    }

    // Validate transaction ID (12-digit number)
    if (!formData.transactionId.trim()) {
      setError('Please enter UPI transaction ID');
      return false;
    }

    const digitsOnly = formData.transactionId.replace(/\D/g, '');
    if (digitsOnly.length !== 12) {
      setError('Transaction ID must be exactly 12 digits');
      return false;
    }

    if (!/^\d+$/.test(digitsOnly)) {
      setError('Transaction ID must contain only numbers');
      return false;
    }

    if (!formData.screenshot) {
      setError('Please upload payment screenshot');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Double-check registrations are open
    if (!registrationsOpen) {
      setError('Online registration is closed. Only on-time registration is available at the venue.');
      return;
    }
    
    // Use the ref to get current event data
    const currentEvent = eventRef.current;
    
    console.log('Current event from ref at submission:', currentEvent);
    
    if (!currentEvent) {
      setError('Event information is missing. Please refresh the page and try again.');
      console.error('Event ref is null at submission time');
      return;
    }

    if (!validateForm()) {
      return;
    }

    if (timeConflict) {
      setError('Cannot register due to time conflict with another event');
      return;
    }

    setSubmitting(true);
    setVerificationStatus('verifying');

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Please login to continue');
        navigate('/login');
        return;
      }
      
      const totalAmount = currentEvent.fee * formData.teamSize;

      console.log('Submitting payment verification for event:', currentEvent._id);
      console.log('Event object from ref:', currentEvent);

      // Prepare participants data with proper formatting
      const participantsData = formData.participants.map(p => ({
        name: p.name.trim(),
        email: p.email.trim(),
        phone: p.phone.trim()
      }));

      // Make sure we have all required data
      const requestData = {
        transactionId: formData.transactionId, // Already digits only
        screenshot: formData.screenshot,
        eventId: currentEvent._id,
        eventName: currentEvent.name,
        eventTime: {
          startTime: currentEvent.startTime || 'TBA',
          endTime: currentEvent.endTime || 'TBA'
        },
        teamSize: formData.teamSize,
        teamName: formData.teamName.trim() || 'Individual',
        participants: participantsData,
        totalAmount: totalAmount,
        // User details
        user: {
          name: user?.name || '',
          email: user?.email || '',
          phone: user?.phone || '',
          college: user?.college || '',
          year: user?.year || 1
        }
      };

      console.log('Sending request data:', requestData);

      const response = await api.post(
        '/payments/verify',
        requestData
      );

      console.log('Verification response:', response.data);

      // After successful payment
      if (response.data.success) {
        setVerificationStatus('success');
        setError('');
        
        // Clear form
        setFormData({
          teamSize: 1,
          teamName: '',
          participants: [],
          transactionId: '',
          screenshot: null,
          screenshotPreview: null
        });
        
        // Show success message and redirect
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }

    } catch (error) {
      console.error('Verification error:', error);
      setVerificationStatus('failed');
      
      if (error.response) {
        // Check if registrations are closed (403 status)
        if (error.response.status === 403 && error.response.data.registrationsClosed) {
          setError(error.response.data.message || 'Online registration is finished. Only on-time registration is available at the venue.');
          setRegistrationsOpen(false);
        } else {
          setError(error.response.data?.message || 'Transaction verification failed. Please try again.');
        }
        console.log('Error response data:', error.response.data);
      } else if (error.request) {
        setError('No response from server. Please check your connection.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate total amount safely using ref
  const currentEvent = eventRef.current;
  const totalAmount = currentEvent && currentEvent.fee ? currentEvent.fee * formData.teamSize : 0;
  const merchantUPI = '8098932041@ptsbi';

  // Loading state
  if (loading || checkingStatus) {
    return (
      <div className="payment-page">
        <div className="loader-container">
          <div className="spinner"></div>
          <p>Loading event details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="payment-page">
        <div className="error-container" style={{ textAlign: 'center', padding: '50px' }}>
          <h2 style={{ color: '#ff4757' }}>Error</h2>
          <p style={{ color: '#b0b0b0', margin: '20px 0' }}>{fetchError}</p>
          <button 
            onClick={() => navigate('/events')} 
            className="btn-browse"
            style={{ 
              padding: '12px 30px', 
              background: 'linear-gradient(135deg, #b8860b, #ffd700)', 
              color: '#000', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  // Registrations closed state
  if (!registrationsOpen) {
    return (
      <div className="payment-page">
        <div className="registrations-closed-container" style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          background: 'linear-gradient(145deg, #1a1a1a, #0d0d0d)',
          borderRadius: '20px',
          maxWidth: '500px',
          margin: '100px auto',
          border: '2px solid #ff4757'
        }}>
          <span style={{ fontSize: '4rem', display: 'block', marginBottom: '20px' }}>🔒</span>
          <h2 style={{ color: '#ff4757', marginBottom: '15px' }}>Online Registration Closed</h2>
          <p style={{ color: '#b0b0b0', marginBottom: '30px', lineHeight: '1.6' }}>
            Online registration is finished.<br/>
            Only on-time registration is available at the venue.
          </p>
          <button 
            onClick={() => navigate('/events')} 
            className="btn-browse"
            style={{ 
              padding: '12px 30px', 
              background: 'linear-gradient(135deg, #b8860b, #ffd700)', 
              color: '#000', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Browse Events
          </button>
        </div>
      </div>
    );
  }

  // No event state
  if (!currentEvent) {
    return (
      <div className="payment-page">
        <div className="error-container" style={{ textAlign: 'center', padding: '50px' }}>
          <h2 style={{ color: '#ff4757' }}>Event Not Found</h2>
          <p style={{ color: '#b0b0b0', margin: '20px 0' }}>The event you're looking for doesn't exist or has been removed.</p>
          <button 
            onClick={() => navigate('/events')} 
            className="btn-browse"
            style={{ 
              padding: '12px 30px', 
              background: 'linear-gradient(135deg, #b8860b, #ffd700)', 
              color: '#000', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Browse Events
          </button>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="payment-page">
      <div className="payment-container">
        <div className="payment-header">
          <h1>Complete Registration</h1>
          <div className="event-summary">
            <h2>{currentEvent.name}</h2>
            <span className={`category-badge ${currentEvent.category?.toLowerCase()}`}>
              {currentEvent.category}
            </span>
            <div className="event-time-info">
              <span className="time-icon">⏰</span>
              <span>{currentEvent.startTime} - {currentEvent.endTime}</span>
            </div>
            <div className="event-venue-info" style={{ marginTop: '10px', color: '#b0b0b0' }}>
              <span className="venue-icon">📍</span>
              <span>{currentEvent.venue || 'Venue TBA'}</span>
            </div>
          </div>
        </div>

        {checkingConflict && (
          <div className="conflict-checking">
            <div className="spinner-small"></div>
            <p>Checking for time conflicts...</p>
          </div>
        )}

        {timeConflict && (
          <div className="time-conflict-error">
            <span className="error-icon">⚠️</span>
            <h3>Time Conflict Detected</h3>
            <p>{timeConflict}</p>
            <button onClick={() => navigate('/events')} className="btn-browse">
              Browse Other Events
            </button>
          </div>
        )}

        {!timeConflict && registrationsOpen && (
          <form onSubmit={handleSubmit} className="payment-form">
            {/* Hidden field to store event ID */}
            <input type="hidden" name="eventId" value={currentEvent._id} />
            
            {/* Registration Details Section */}
            <div className="form-section">
              <h3>Registration Details</h3>
              
              <div className="form-group">
                <label>Team Size</label>
                <select 
                  value={formData.teamSize} 
                  onChange={handleTeamSizeChange}
                  disabled={currentEvent.type === 'Individual'}
                  className="form-select"
                >
                  {Array.from(
                    { length: (currentEvent.maxTeamSize || 1) - (currentEvent.minTeamSize || 1) + 1 },
                    (_, i) => i + (currentEvent.minTeamSize || 1)
                  ).map(size => (
                    <option key={size} value={size}>
                      {size} {size === 1 ? 'Member' : 'Members'}
                    </option>
                  ))}
                </select>
              </div>

              {currentEvent.type === 'Team' && (
                <div className="form-group">
                  <label>Team Name</label>
                  <input
                    type="text"
                    value={formData.teamName}
                    onChange={(e) => setFormData(prev => ({ ...prev, teamName: e.target.value }))}
                    placeholder="Enter your team name"
                    className="form-input"
                  />
                </div>
              )}

              <h4>Participant Details</h4>
              {formData.participants.map((participant, index) => (
                <div key={index} className="participant-card">
                  <h5>Participant {index + 1} {index === 0 && '(Team Lead)'}</h5>
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={participant.name}
                      onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                      className="form-input"
                      required
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={participant.email}
                      onChange={(e) => handleParticipantChange(index, 'email', e.target.value)}
                      className="form-input"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={participant.phone}
                      onChange={(e) => handleParticipantChange(index, 'phone', e.target.value)}
                      className="form-input"
                      maxLength="10"
                      pattern="[0-9]*"
                      required
                    />
                  </div>
                </div>
              ))}

              <div className="amount-box">
                <div className="amount-row">
                  <span>Registration Fee:</span>
                  <span>₹{currentEvent.fee} × {formData.teamSize}</span>
                </div>
                <div className="amount-row total">
                  <span>Total Amount:</span>
                  <span className="total-amount">₹{totalAmount}</span>
                </div>
              </div>
            </div>

            {/* Payment Section */}
            <div className="form-section payment-section">
              <h3>UPI Payment</h3>
              
              <div className="merchant-details">
                <p>Pay to this UPI ID:</p>
                <div className="upi-id-box">
                  <span className="upi-id">{merchantUPI}</span>
                  <button 
                    type="button"
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(merchantUPI);
                      alert('UPI ID copied!');
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="qr-container">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=${merchantUPI}&pn=TECNO_RENDEZVOUS2026&am=${totalAmount}&cu=INR`}
                  alt="UPI QR Code"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TECNO_RENDEZVOUS2026';
                  }}
                />
                <p className="qr-note">Scan this QR code with any UPI app</p>
                <p className="qr-amount">Amount: ₹{totalAmount}</p>
              </div>

              <div className="payment-steps">
                <h4>Steps to complete payment:</h4>
                <ol>
                  <li>Scan QR code or copy UPI ID</li>
                  <li>Pay ₹{totalAmount} from your UPI app</li>
                  <li>Copy the 12-digit transaction ID from your app</li>
                  <li>Enter the 12-digit transaction ID below and upload screenshot</li>
                </ol>
              </div>

              <div className="form-group">
                <label>UPI Transaction ID <span className="required">*</span></label>
                <input
                  type="text"
                  value={formData.transactionId}
                  onChange={handleTransactionIdChange}
                  placeholder="Enter 12-digit transaction ID"
                  className={`form-input ${transactionIdError ? 'error' : ''}`}
                  maxLength="12"
                  inputMode="numeric"
                  pattern="\d*"
                  required
                />
                {transactionIdError && (
                  <small className="error-text">{transactionIdError}</small>
                )}
                <small className="field-note">
                  Enter the 12-digit transaction ID from your UPI app (numbers only)
                </small>
              </div>

              <div className="form-group">
                <label>Payment Screenshot <span className="required">*</span></label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="file-input"
                  required
                />
                {formData.screenshotPreview && (
                  <div className="screenshot-preview">
                    <img src={formData.screenshotPreview} alt="Payment screenshot" />
                  </div>
                )}
                <small className="field-note">Upload screenshot showing successful payment (max 5MB)</small>
              </div>

              {error && (
                <div className="error-message">
                  <span className="error-icon">❌</span>
                  <span>{error}</span>
                </div>
              )}

              {verificationStatus === 'success' && (
                <div className="success-message">
                  <span className="success-icon">✅</span>
                  <div>
                    <h4>Payment Verified Successfully!</h4>
                    <p>Your registration is pending admin approval. Redirecting to dashboard...</p>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="btn-submit"
                disabled={submitting || timeConflict || !registrationsOpen || !!transactionIdError}
              >
                {submitting ? (
                  <>
                    <span className="spinner"></span>
                    Verifying Transaction...
                  </>
                ) : (
                  'Verify & Complete Registration'
                )}
              </button>
            </div>
          </form>
        )}

        <button onClick={() => navigate('/events')} className="btn-back">
          ← Back to Events
        </button>
      </div>
    </div>
  );
};

export default UPIPayment;