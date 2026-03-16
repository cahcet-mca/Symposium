import React, { useState } from 'react';
import axios from 'axios';
import { useSymposiumDate } from '../../context/DateContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://symposium-veyj.onrender.com/api';

const UpdateSymposiumDate = () => {
  const [newDate, setNewDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const { symposiumDate, refreshSettings } = useSymposiumDate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        setMessage({ type: 'error', text: 'Admin not authenticated' });
        return;
      }

      const response = await axios.put(
        `${API_URL}/symposium/admin/date`,
        { date: newDate },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Symposium date updated successfully!' });
        refreshSettings();
        setNewDate('');
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update date' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="update-date-card">
      <h3>Update Symposium Date</h3>
      <p className="current-date">Current Date: <strong>{symposiumDate}</strong></p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="newDate">Select New Date</label>
          <input
            type="date"
            id="newDate"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
            min="2026-01-01"
            max="2026-12-31"
          />
        </div>
        
        {message.text && (
          <div className={`message ${message.type}`}>
            {message.type === 'success' ? '✅' : '❌'} {message.text}
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={loading || !newDate}
          className="btn-update"
        >
          {loading ? 'Updating...' : 'Update Symposium Date'}
        </button>
      </form>
    </div>
  );
};

export default UpdateSymposiumDate;