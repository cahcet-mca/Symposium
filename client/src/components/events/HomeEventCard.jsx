// src/components/events/HomeEventCard.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSymposiumDate } from '../../context/DateContext';
import './HomeEventCard.css';

const HomeEventCard = ({ event }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { formatEventDate } = useSymposiumDate();
  const navigate = useNavigate();

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  };

  // Handle image load success
  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  // Get image source
  const getImageSource = () => {
    if (!event.image || imageError) return null;
    
    try {
      const filename = event.image.split('/').pop();
      return new URL(`/src/assets/images/${filename}`, import.meta.url).href;
    } catch {
      return null;
    }
  };

  const imageSrc = getImageSource();

  return (
    <div className="home-event-card" onClick={() => navigate(`/event/${event._id}`)}>
      {/* Sunshine Effect */}
      <div className="sunshine-effect"></div>
      
      <div className="home-event-image-container">
        {imageSrc && !imageError ? (
          <img 
            src={imageSrc}
            alt={event.subEventName}
            className={`home-event-image ${imageLoaded ? 'loaded' : 'loading'}`}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading="lazy"
          />
        ) : (
          <div className="home-event-image-placeholder">
            <span>{event.subEventName?.charAt(0) || event.name.charAt(0)}</span>
          </div>
        )}
        <div className="home-event-category">{event.category}</div>
      </div>
      
      <div className="home-event-content">
        <h4 className="home-event-subname">{event.subEventName}</h4>
        <h3 className="home-event-name">{event.name}</h3>
        
        <div className="home-event-meta">
          <div className="home-event-time">
            <span>🕐</span> {event.startTime}
          </div>
          <div className="home-event-date">
            <span>📅</span> {formatEventDate(event.eventDate)}
          </div>
        </div>
        
        <div className="home-event-footer">
          <div className="home-event-fee">
            <span className="fee-label">Fee:</span>
            <span className="fee-amount">₹{event.fee}</span>
          </div>
          <button className="home-event-btn">
            View Details <span className="btn-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomeEventCard;