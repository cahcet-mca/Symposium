import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Home.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://symposium-veyj.onrender.com/api';

const Home = () => {
  const [registrationsOpen, setRegistrationsOpen] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await axios.get(`${API_URL}/settings/registrations-status`);
        if (response.data.success) {
          setRegistrationsOpen(response.data.data.registrationsOpen);
        }
      } catch (error) {
        console.error('Error checking registration status:', error);
      }
    };

    checkRegistrationStatus();
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

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">TECNO RENDEZVOUS</h1>
          <p className="hero-subtitle">Think Big • Act Smart • Win Together</p>
          <p className="hero-description">
            Be part of an exceptional fusion of technology, imagination, and innovation.
            TECNO RENDEZVOUS unites visionary thinkers and talented creators to present groundbreaking ideas, 
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

      {/* Event Categories */}
      <section className="categories">
        <div className="container">
          <h2 className="section-title">Event Categories</h2>
          <div className="category-container">
            <div className="category-card technical">
              <h3>Technical Events</h3>
              <p className="price">₹50 per head</p>
              <p className="team-size">Individual & Team</p>
              <ul>
                <li>Paper Presentation</li>
                <li>Coding & Debugging</li>
                <li>Technical Quiz</li>
                <li>AD-Making</li>
                <li>Web Designing</li>
                <li>Poster Presentation</li>
              </ul>
              <button onClick={() => navigate('/events?category=Technical')} className="btn-outline">
                View Technical Events
              </button>
            </div>
            <div className="category-card non-technical">
              <h3>Non-Technical Events</h3>
              <p className="price">₹50 per head</p>
              <p className="team-size">Individual & Team events</p>
              <ul>
                <li>Connections & Puzzle Solving</li>
                <li>Treasure Hunt</li>
                <li>Cooking Without Fire</li>
                <li>Free Fire Battle</li>
                <li>BGMI Battle</li>
                <li>Photography</li>
                <li>Short Film</li>
                <li>Chess Tournament</li>
                <li>Drawing</li>
              </ul>
              <button onClick={() => navigate('/events?category=Non-Technical')} className="btn-outline">
                View Non-Technical Events
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Venue Section */}
      <section className="venue">
        <div className="container">
          <h2 className="section-title">Venue</h2>
          <div className="venue-content">
            <h3>C. Abdul Hakeem College of Engineering and Technology</h3>
            <h3>Macter Of Computer Application</h3>
            <p className="venue-date">26th July 2026 • Auditorium</p>
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
          <p>Join hundreds of participants in this premier symposium</p>
          <button onClick={handleExploreEventsClick} className="btn btn-primary btn-large">
            Register for Events
          </button>
        </div>
      </section>
    </div>
  );
};

export default Home;