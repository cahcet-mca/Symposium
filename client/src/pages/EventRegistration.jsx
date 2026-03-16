import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvents } from '../context/EventContext';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';
import './EventRegistration.css';

const EventRegistration = () => {
  // ... rest of the code remains the same
  const { id } = useParams();
  const navigate = useNavigate();
  const { getEvent, registerForEvent } = useEvents();
  const { user, isAuthenticated } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teamSize, setTeamSize] = useState(1);
  const [teamName, setTeamName] = useState('');
  const [participants, setParticipants] = useState([]);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/register/${id}` } });
    }
  }, [isAuthenticated, navigate, id]);

  // Fetch event data
  useEffect(() => {
    const fetchEventData = async () => {
      try {
        setLoading(true);
        const eventData = await getEvent(id);
        
        if (!eventData) {
          setError('Event not found');
          return;
        }
        
        setEvent(eventData);
        
        // Set initial team size
        const initialSize = eventData.minTeamSize || 1;
        setTeamSize(initialSize);
        
        // Initialize participants array
        const initialParticipants = Array(initialSize).fill().map((_, index) => ({
          name: index === 0 && user ? user.name || '' : '',
          email: index === 0 && user ? user.email || '' : '',
          phone: index === 0 && user ? user.phone || '' : '',
        }));
        setParticipants(initialParticipants);
        
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEventData();
    }
  }, [id, getEvent, user]);

  const handleTeamSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    setTeamSize(newSize);
    
    const newParticipants = [...participants];
    if (newSize > participants.length) {
      // Add new empty participants
      for (let i = participants.length; i < newSize; i++) {
        newParticipants.push({ name: '', email: '', phone: '' });
      }
    } else {
      // Remove excess participants
      newParticipants.length = newSize;
    }
    setParticipants(newParticipants);
  };

  const handleParticipantChange = (index, field, value) => {
    const updatedParticipants = [...participants];
    updatedParticipants[index] = {
      ...updatedParticipants[index],
      [field]: value
    };
    setParticipants(updatedParticipants);
  };

  const validateForm = () => {
    // Check team name for team events
    if (event?.type === 'Team' && !teamName.trim()) {
      alert('Please enter a team name');
      return false;
    }

    // Check all participants
    for (let i = 0; i < participants.length; i++) {
      const p = participants[i];
      if (!p.name?.trim()) {
        alert(`Please enter name for participant ${i + 1}`);
        return false;
      }
      if (!p.email?.trim() || !p.email.includes('@')) {
        alert(`Please enter valid email for participant ${i + 1}`);
        return false;
      }
      if (!p.phone?.trim() || p.phone.length < 10) {
        alert(`Please enter valid 10-digit phone number for participant ${i + 1}`);
        return false;
      }
    }

    if (!agreed) {
      alert('Please agree to the terms and conditions');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const registrationData = {
        eventId: event._id,
        eventName: event.name,
        teamSize,
        teamName: event.type === 'Team' ? teamName : undefined,
        participants,
        totalAmount: event.fee * teamSize,
        registeredBy: user?._id,
        registrationDate: new Date().toISOString()
      };

      await registerForEvent(registrationData);
      
      alert('✅ Registration successful! Check your email for confirmation.');
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      setError('Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (error || !event) {
    return (
      <div className="register-page">
        <div className="error-container">
          <span className="error-icon">❌</span>
          <h2>{error || 'Event not found'}</h2>
          <button onClick={() => navigate('/events')} className="btn-back">
            Browse Events
          </button>
        </div>
      </div>
    );
  }

  const totalAmount = event.fee * teamSize;

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h1>Register for Event</h1>
          <div className="event-summary-card">
            <h2>{event.name}</h2>
            <span className={`category-badge ${event.category?.toLowerCase()}`}>
              {event.category}
            </span>
            <div className="fee-summary">
              <span className="fee-label">Registration Fee:</span>
              <span className="fee-amount">₹{event.fee} per person</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="register-form">
          <h3>Registration Details</h3>

          {/* Team Size Selection */}
          <div className="form-group">
            <label>Team Size</label>
            <div className="team-size-selector">
              <select 
                value={teamSize} 
                onChange={handleTeamSizeChange}
                disabled={event.type === 'Individual'}
                className="mirror-select"
              >
                {Array.from(
                  { length: (event.maxTeamSize || 1) - (event.minTeamSize || 1) + 1 },
                  (_, i) => i + (event.minTeamSize || 1)
                ).map(size => (
                  <option key={size} value={size}>
                    {size} {size === 1 ? 'Member' : 'Members'}
                  </option>
                ))}
              </select>
              {event.type === 'Individual' && (
                <span className="fixed-size-indicator">Individual Event</span>
              )}
            </div>
          </div>

          {/* Team Name for Team Events */}
          {event.type === 'Team' && (
            <div className="form-group">
              <label>Team Name</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter your team name"
                className="mirror-input"
                required
              />
            </div>
          )}

          {/* Participants Section */}
          <div className="participants-section">
            <h4>Participant Details</h4>
            
            {participants.map((participant, index) => (
              <div key={index} className="participant-card">
                <div className="participant-header">
                  <span className="participant-number">Participant {index + 1}</span>
                  {index === 0 && <span className="team-lead-badge">Team Lead</span>}
                </div>
                
                <div className="participant-form-grid">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={participant.name}
                      onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                      placeholder="Enter full name"
                      className="mirror-input"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={participant.email}
                      onChange={(e) => handleParticipantChange(index, 'email', e.target.value)}
                      placeholder="Enter email"
                      className="mirror-input"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={participant.phone}
                      onChange={(e) => handleParticipantChange(index, 'phone', e.target.value)}
                      placeholder="Enter 10-digit phone number"
                      pattern="[0-9]{10}"
                      className="mirror-input"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Payment Summary */}
          <div className="payment-summary">
            <h4>Payment Summary</h4>
            <div className="summary-row">
              <span>Registration Fee:</span>
              <span>£{event.fee} × {teamSize} {teamSize === 1 ? 'person' : 'persons'}</span>
            </div>
            <div className="summary-row total">
              <span>Total Amount:</span>
              <span className="total-amount">₹{totalAmount}</span>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="terms-section">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span className="checkmark"></span>
              <span className="terms-text">
                I agree to the <a href="/terms" target="_blank">Terms and Conditions</a> and confirm that all information provided is correct
              </span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button 
              type="submit" 
              className="btn-submit-glow"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner-small"></span>
                  Processing...
                </>
              ) : (
                `Proceed to Payment (£${totalAmount})`
              )}
            </button>
            
            <button 
              type="button" 
              onClick={() => navigate(`/event/${id}`)}
              className="btn-cancel"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventRegistration;