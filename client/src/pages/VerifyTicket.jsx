import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Loader from '../components/common/Loader';
import './VerifyTicket.css';

const API_URL = import.meta.env.VITE_API_URL;

const VerifyTicket = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTicketDetails = async () => {
      try {
        const response = await axios.get(`${API_URL}/registrations/ticket/${id}`);
        if (response.data.success) {
          setTicketData(response.data.data);
        } else {
          setError('Ticket not found or invalid');
        }
      } catch (err) {
        console.error('Error verifying ticket:', err);
        setError('Invalid ticket or network error');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTicketDetails();
    } else {
      setError('No ticket ID provided');
      setLoading(false);
    }
  }, [id]);

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="verify-page">
        <div className="verify-card error-card">
          <div className="icon">❌</div>
          <h2>Verification Failed</h2>
          <p>{error}</p>
          <button className="btn-home" onClick={() => navigate('/')}>Return Home</button>
        </div>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (ticketData.paymentStatus === 'verified') {
      return (
        <div className="status-badge success">
          <div className="status-icon-wrap success">
            <span className="status-check">✓</span>
          </div>
          <h3>VERIFIED TICKET</h3>
          <p>This ticket is valid and confirmed.</p>
        </div>
      );
    } else if (ticketData.paymentStatus === 'pending') {
      return (
        <div className="status-badge pending">
          <div className="status-icon-wrap pending">
            <span className="status-check">⏳</span>
          </div>
          <h3>PENDING APPROVAL</h3>
          <p>This ticket has not been approved yet.</p>
        </div>
      );
    } else {
      return (
        <div className="status-badge rejected">
          <div className="status-icon-wrap rejected">
            <span className="status-check">✕</span>
          </div>
          <h3>REJECTED</h3>
          <p>This ticket is invalid or cancelled.</p>
        </div>
      );
    }
  };

  return (
    <div className="verify-page">
      <div className="verify-card">
        <div className="verify-header">
          <h2>Ticket Verification</h2>
          <div className="ticket-id">ID: {ticketData._id}</div>
        </div>
        
        {getStatusBadge()}

        <div className="ticket-details">
          <div className="detail-group">
            <label>Event Name</label>
            <div className="value event-name">{ticketData.event?.name || 'Unknown Event'}</div>
            {ticketData.event?.startTime && (
              <div className="sub-value">
                {ticketData.event.startTime} - {ticketData.event.endTime} | {ticketData.event.venue}
              </div>
            )}
          </div>

          <div className="detail-group">
            <label>Primary Participant (Team Lead)</label>
            <div className="value">{ticketData.user?.name || 'N/A'}</div>
            <div className="sub-value">{ticketData.user?.college || 'Unknown College'}</div>
          </div>

          <div className="detail-group">
            <label>Registration Type</label>
            <div className="value">{ticketData.teamSize > 1 ? `Team (${ticketData.teamSize} members)` : 'Individual'}</div>
            {ticketData.teamName && ticketData.teamName !== 'Individual' && (
              <div className="sub-value">Team Name: {ticketData.teamName}</div>
            )}
          </div>

          {ticketData.participants && ticketData.participants.length > 0 && (
            <div className="detail-group">
              <label>Other Members</label>
              <ul className="members-list">
                {ticketData.participants.map((p, idx) => (
                  <li key={idx}>• {p.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="verify-footer">
          <button className="btn-home" onClick={() => navigate('/')}>Home</button>
        </div>
      </div>
    </div>
  );
};

export default VerifyTicket;
