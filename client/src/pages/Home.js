import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">TECNO RENDEZVOUS</h1>
          <p className="hero-subtitle">Think Big • Act Smart • Win Togther</p>
          <p className="hero-description">
            Be part of an exceptional fusion of technology, imagination, and innovation.
            TECNO RENDEZVOUS unites visionary thinkers and talented creators to present groundbreaking ideas, 
            Inventive artistry, and outstanding technical achievements.
          </p>
          <div className="hero-buttons">
            <Link to="/events" className="btn btn-primary">Explore Events</Link>
            <Link to="/register" className="btn btn-secondary">Register Now</Link>
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
              <p className="team-size">Team size: 1-2 members</p>
              <ul>
                <li>Paper Presentation</li>
                <li>Web Design</li>
                <li>Quiz</li>
              </ul>
              <Link to="/events?category=Technical" className="btn-outline">
                View Technical Events
              </Link>
            </div>
            <div className="category-card non-technical">
              <h3>Non-Technical Events</h3>
              <p className="price">₹50 per head</p>
              <p className="team-size">Individual & Team events</p>
              <ul>
                <li>Photography</li>
                <li>Cooking Without Fire</li>
                <li>Treasure Hunt</li>
                <li>Short Film</li>
                <li>Visual Design</li>
              </ul>
              <Link to="/events?category=Non-Technical" className="btn-outline">
                View Non-Technical Events
              </Link>
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
          <Link to="/events" className="btn btn-primary btn-large">
            Register for Events
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;