// src/pages/Home.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSymposiumDate } from '../context/DateContext';
import axios from 'axios';
import HomeEventCard from '../components/events/HomeEventCard';
import './Home.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://symposium-veyj.onrender.com/api';

const Home = () => {
  const [registrationsOpen, setRegistrationsOpen] = useState(true);
  const [technicalEvents, setTechnicalEvents] = useState([]);
  const [nonTechnicalEvents, setNonTechnicalEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Slider refs
  const technicalSliderRef = useRef(null);
  const nonTechnicalSliderRef = useRef(null);
  
  const { symposiumDate, symposiumName, venue, venueDetails } = useSymposiumDate();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch registration status
        const statusResponse = await axios.get(`${API_URL}/settings/registrations-status`);
        if (statusResponse.data.success) {
          setRegistrationsOpen(statusResponse.data.data.registrationsOpen);
        }
        
        // Fetch all events
        const eventsResponse = await axios.get(`${API_URL}/events`);
        if (eventsResponse.data.success) {
          const events = eventsResponse.data.data;
          
          // Filter events by category
          const technical = events.filter(event => event.category === 'Technical');
          const nonTechnical = events.filter(event => event.category === 'Non-Technical');
          
          setTechnicalEvents(technical);
          setNonTechnicalEvents(nonTechnical);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRegisterClick = (e) => {
    e.preventDefault();
    
    if (!registrationsOpen) {
      alert('Online registration is finished. Only on-time registration is available at the venue.');
      return;
    }
    
    navigate('/register');
  };

  const handleExploreEventsClick = (e) => {
    e.preventDefault();
    navigate('/events');
  };

  // Slider scroll functions
  const scrollTechnical = (direction) => {
    if (technicalSliderRef.current) {
      const scrollAmount = 320;
      const newScrollLeft = technicalSliderRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      technicalSliderRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const scrollNonTechnical = (direction) => {
    if (nonTechnicalSliderRef.current) {
      const scrollAmount = 320;
      const newScrollLeft = nonTechnicalSliderRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      nonTechnicalSliderRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">{symposiumName}</h1>
          <p className="hero-subtitle">Think Big • Act Smart • Win Together</p>
          <p className="hero-description">
            Be part of an exceptional fusion of technology, imagination, and innovation.
            {symposiumName} unites visionary thinkers and talented creators to present groundbreaking ideas, 
            Inventive artistry, and outstanding technical achievements.
          </p>
          <div className="hero-buttons">
            <button onClick={handleExploreEventsClick} className="btn btn-primary">
              Explore Events
            </button>
            <button onClick={handleRegisterClick} className="btn btn-secondary">
              Register Now
            </button>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <section className="info-section">
        <div className="container">
          <h2 className="section-title">Create • Compete • Claim your crown</h2>
          <div className="info-grid">
            <div className="info-card">
              <div className="info-number">1</div>
              <h3>Leadership</h3>
              <p>Develop the confidence to guide and inspire others</p>
            </div>
            <div className="info-card">
              <div className="info-number">2</div>
              <h3>Skill Building</h3>
              <p>Strengthen practical abilities for real-world success</p>
            </div>
            <div className="info-card">
              <div className="info-number">3</div>
              <h3>Collaboration</h3>
              <p>Work together to achieve shared goals effectively</p>
            </div>
            <div className="info-card">
              <div className="info-number">4</div>
              <h3>Achievement</h3>
              <p>Reach milestones and celebrate personal progress</p>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Events Slider */}
      <section className="slider-section">
        <div className="container">
          <div className="slider-header">
            <div className="header-left">
              <h2 className="section-title">⚡ Technical Events</h2>
              <span className="event-count">{technicalEvents.length} Events</span>
            </div>
            <div className="slider-controls">
              <button 
                className="slider-arrow left" 
                onClick={() => scrollTechnical('left')}
                disabled={technicalEvents.length <= 4}
              >
                ←
              </button>
              <button 
                className="slider-arrow right" 
                onClick={() => scrollTechnical('right')}
                disabled={technicalEvents.length <= 4}
              >
                →
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="loading-events">Loading events...</div>
          ) : technicalEvents.length > 0 ? (
            <div className="slider-container">
              <div className="slider-track" ref={technicalSliderRef}>
                {technicalEvents.map(event => (
                  <div key={event._id} className="slider-item">
                    <HomeEventCard event={event} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-events-message">No technical events available</div>
          )}
        </div>
      </section>

      {/* Non-Technical Events Slider */}
      <section className="slider-section">
        <div className="container">
          <div className="slider-header">
            <div className="header-left">
              <h2 className="section-title">🎨 Non-Technical Events</h2>
              <span className="event-count">{nonTechnicalEvents.length} Events</span>
            </div>
            <div className="slider-controls">
              <button 
                className="slider-arrow left" 
                onClick={() => scrollNonTechnical('left')}
                disabled={nonTechnicalEvents.length <= 4}
              >
                ←
              </button>
              <button 
                className="slider-arrow right" 
                onClick={() => scrollNonTechnical('right')}
                disabled={nonTechnicalEvents.length <= 4}
              >
                →
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="loading-events">Loading events...</div>
          ) : nonTechnicalEvents.length > 0 ? (
            <div className="slider-container">
              <div className="slider-track" ref={nonTechnicalSliderRef}>
                {nonTechnicalEvents.map(event => (
                  <div key={event._id} className="slider-item">
                    <HomeEventCard event={event} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-events-message">No non-technical events available</div>
          )}
        </div>
      </section>

      {/* Venue Section */}
      <section className="venue">
        <div className="container">
          <h2 className="section-title">Venue</h2>
          <div className="venue-content">
            <h3>{venue}</h3>
            <h3>{venueDetails}</h3>
            <p className="venue-date">{symposiumDate} • Auditorium</p>
            <div className="venue-features">
              <span>🎯 State-of-the-art facilities</span>
              <span>🎯 AC Auditorium</span>
              <span>🎯 Easy accessibility</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <h2>Ready to Showcase Your Talent?</h2>
          <p>Join {technicalEvents.length + nonTechnicalEvents.length}+ participants in this premier symposium</p>
          <button onClick={handleExploreEventsClick} className="btn btn-primary btn-large">
            Browse All Events
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;