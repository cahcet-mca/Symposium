// src/pages/Events.jsx - Complete Working Version with Scroll Animations

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useEvents } from '../context/EventContext';
import { useSymposiumDate } from '../context/DateContext';
import EventCard from '../components/events/EventCard';
import Loader from '../components/common/Loader';
import EventDetailsPopup from '../components/events/EventDetailsPopup';
import axios from 'axios';
import './Events.css';

const API_URL = import.meta.env.VITE_API_URL;

const Events = () => {
  const [category, setCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [eventType, setEventType] = useState('All');
  const [registrationsOpen, setRegistrationsOpen] = useState(true);
  const { events, loading, error } = useEvents();
  const { symposiumName } = useSymposiumDate();
  const location = useLocation();

  // Refs for scroll animations
  const headerRef = useRef(null);
  const searchRef = useRef(null);
  const filtersRef = useRef(null);
  const technicalSectionRef = useRef(null);
  const nonTechnicalSectionRef = useRef(null);

  // State for event details popup
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  // Scroll state & progress for motion effects
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Scroll listener for progress and scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      if (totalScroll > 0) {
        setScrollProgress((currentScroll / totalScroll) * 100);
      }
      setShowScrollTop(currentScroll > 300);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // ============================================
  // SCROLL ANIMATIONS - Intersection Observer
  // ============================================
  useEffect(() => {
    // Add visible class to all sections
    const makeSectionsVisible = () => {
      const sections = document.querySelectorAll('.section-animate');
      sections.forEach((section) => {
        section.classList.add('section-visible');
      });
    };

    const timer = setTimeout(makeSectionsVisible, 50);

    const observerOptions = {
      threshold: 0.05,
      rootMargin: '0px 0px -20px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-visible');
        }
      });
    }, observerOptions);

    const sections = document.querySelectorAll('.section-animate');
    sections.forEach(section => {
      observer.observe(section);
    });

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [events, category, eventType, searchTerm]);

  // Get category from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category');
    if (cat && (cat === 'All' || cat === 'Technical' || cat === 'Non-Technical')) {
      setCategory(cat);
    }
  }, [location]);

  // Check registration status
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

  // Function to handle view details click
  const handleViewDetails = async (event) => {
    try {
      console.log('🔍 Events page fetching fresh data for event:', event._id);

      const response = await axios.get(
        `${API_URL}/events/${event._id}/with-count`
      );

      if (response.data.success) {
        const freshEventData = response.data.data;
        setSelectedEvent(freshEventData);
        setShowPopup(true);
      } else {
        setSelectedEvent(event);
        setShowPopup(true);
      }
    } catch (error) {
      console.error('❌ Error fetching fresh event data:', error);
      setSelectedEvent(event);
      setShowPopup(true);
    }
  };

  // Function to close popup
  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedEvent(null);
  };

  // ============================================
  // FILTER EVENTS - FIXED
  // ============================================
  const filteredEvents = events.filter(event => {
    // Category filter
    const matchesCategory = category === 'All' || event.category === category;
    
    // Search filter
    const matchesSearch = searchTerm === '' || 
      event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.subEventName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Type filter - Fixed to handle "Individual & Team"
    let matchesType = true;
    if (eventType === 'All') {
      matchesType = true;
    } else if (eventType === 'Individual') {
      matchesType = event.type === 'Individual';
    } else if (eventType === 'Team') {
      matchesType = event.type === 'Team';
    } else if (eventType === 'Individual & Team') {
      matchesType = event.type === 'Individual & Team';
    }
    
    return matchesCategory && matchesSearch && matchesType;
  });

  // Separate events by category for display
  const technicalEvents = filteredEvents.filter(e => e.category === 'Technical');
  const nonTechnicalEvents = filteredEvents.filter(e => e.category === 'Non-Technical');

  // Show registration closed banner if needed
  const showRegistrationBanner = !registrationsOpen;

  // Handler for category filter
  const handleCategoryFilter = (cat) => {
    console.log('🔍 Filtering by category:', cat);
    setCategory(cat);
  };

  // Handler for type filter
  const handleTypeFilter = (type) => {
    console.log('🔍 Filtering by type:', type);
    setEventType(type);
  };

  // Reset all filters
  const clearFilters = () => {
    setSearchTerm('');
    setCategory('All');
    setEventType('All');
  };

  // Get event type counts for the current category
  const getTypeCounts = () => {
    const currentEvents = category === 'All' ? events : events.filter(e => e.category === category);
    const individual = currentEvents.filter(e => e.type === 'Individual').length;
    const team = currentEvents.filter(e => e.type === 'Team').length;
    const both = currentEvents.filter(e => e.type === 'Individual & Team').length;
    return { individual, team, both };
  };

  const typeCounts = getTypeCounts();

  // Get total events count for current category
  const getTotalCount = () => {
    return category === 'All' ? events.length : events.filter(e => e.category === category).length;
  };

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="events-page">
        <div className="error-container section-animate">
          <h2>Error Loading Events</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="events-page">
        <div className="no-events-container section-animate">
          <h2>No Events Found</h2>
          <p>There are currently no events available.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="events-page">
      {/* Scroll Progress Bar */}
      <div 
        className="scroll-progress-bar" 
        style={{ width: `${scrollProgress}%` }} 
      />

      {/* Registration Closed Banner */}
      {showRegistrationBanner && (
        <div className="registration-closed-banner">
          <span className="banner-icon">🔒</span>
          <span className="banner-text">
            Online registration is finished. Only on-time registration is available at the venue.
          </span>
        </div>
      )}

      {/* Event Details Popup */}
      {showPopup && selectedEvent && (
        <EventDetailsPopup
          event={selectedEvent}
          onClose={handleClosePopup}
          registrationsOpen={registrationsOpen}
        />
      )}

      <div 
        ref={headerRef}
        className="events-header section-animate"
      >
        <div className="header-glow-orb header-glow-orb-1" />
        <div className="header-glow-orb header-glow-orb-2" />

        <h1>{symposiumName} Events</h1>
        <p className="header-subtitle">Choose your arena and showcase your talent</p>

        <div 
          ref={searchRef}
          className="search-section section-animate"
        >
          <div className="search-wrapper">
            <span className="search-icon-anim">🔍</span>
            <input
              type="text"
              placeholder="Search events by name, sub-event, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                type="button"
                className="search-clear-btn" 
                onClick={() => setSearchTerm('')}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Buttons */}
        <div 
          ref={filtersRef}
          className="filter-tabs section-animate"
        >
          <button
            className={`filter-btn ${category === 'All' ? 'active' : ''}`}
            onClick={() => handleCategoryFilter('All')}
          >
            All Events ({events.length})
          </button>
          <button
            className={`filter-btn ${category === 'Technical' ? 'active' : ''}`}
            onClick={() => handleCategoryFilter('Technical')}
          >
            Technical ({events.filter(e => e.category === 'Technical').length})
          </button>
          <button
            className={`filter-btn ${category === 'Non-Technical' ? 'active' : ''}`}
            onClick={() => handleCategoryFilter('Non-Technical')}
          >
            Non-Technical ({events.filter(e => e.category === 'Non-Technical').length})
          </button>
        </div>

        {/* Type Filter - Individual & Team Events */}
        <div className="type-filter-container section-animate">
          <span className="type-filter-label">Event Type:</span>
          <div className="type-filter-buttons">
            <button
              className={`type-filter-btn ${eventType === 'All' ? 'active' : ''}`}
              onClick={() => handleTypeFilter('All')}
            >
              All Types
            </button>
            <button
              className={`type-filter-btn ${eventType === 'Individual' ? 'active' : ''}`}
              onClick={() => handleTypeFilter('Individual')}
            >
              Individual ({typeCounts.individual})
            </button>
            <button
              className={`type-filter-btn ${eventType === 'Team' ? 'active' : ''}`}
              onClick={() => handleTypeFilter('Team')}
            >
              Team ({typeCounts.team})
            </button>
            <button
              className={`type-filter-btn ${eventType === 'Individual & Team' ? 'active' : ''}`}
              onClick={() => handleTypeFilter('Individual & Team')}
            >
              Individual & Team ({typeCounts.both})
            </button>
          </div>
        </div>
      </div>

      <div className="events-container">
        {category === 'All' ? (
          <>
            {technicalEvents.length > 0 && (
              <section 
                ref={technicalSectionRef}
                className="category-section section-animate"
              >
                <div className="category-header">
                  <h2>⚡ Technical Events</h2>
                  <p className="category-fee">₹50 per head | Individual & Team events</p>
                </div>
                <div className="event-grid stagger-children">
                  {technicalEvents.map((event, index) => (
                    <EventCard
                      key={event._id}
                      event={event}
                      onViewDetails={handleViewDetails}
                      registrationsOpen={registrationsOpen}
                      style={{ animationDelay: `${Math.min(index * 0.06, 0.6)}s` }}
                    />
                  ))}
                </div>
              </section>
            )}

            {nonTechnicalEvents.length > 0 && (
              <section 
                ref={nonTechnicalSectionRef}
                className="category-section section-animate"
              >
                <div className="category-header">
                  <h2>🎨 Non-Technical Events</h2>
                  <p className="category-fee">₹50 per head | Individual & Team events</p>
                </div>
                <div className="event-grid stagger-children">
                  {nonTechnicalEvents.map((event, index) => (
                    <EventCard
                      key={event._id}
                      event={event}
                      onViewDetails={handleViewDetails}
                      registrationsOpen={registrationsOpen}
                      style={{ animationDelay: `${Math.min(index * 0.06, 0.6)}s` }}
                    />
                  ))}
                </div>
              </section>
            )}

            {technicalEvents.length === 0 && nonTechnicalEvents.length === 0 && (
              <div className="no-results section-animate">
                <h3>No events match your filters</h3>
                <p>Try adjusting your search or filter criteria</p>
                <button onClick={clearFilters} className="clear-filters">
                  Clear All Filters
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {filteredEvents.length > 0 ? (
              <section className="category-section section-animate section-visible">
                <div className="category-header">
                  <h2>
                    {category === 'Technical' ? '⚡ Technical Events' : '🎨 Non-Technical Events'}
                  </h2>
                  <p className="category-fee">₹50 per head | Individual & Team events</p>
                </div>
                <div className="event-grid stagger-children">
                  {filteredEvents.map((event, index) => (
                    <EventCard
                      key={event._id}
                      event={event}
                      onViewDetails={handleViewDetails}
                      registrationsOpen={registrationsOpen}
                      style={{ animationDelay: `${Math.min(index * 0.06, 0.6)}s` }}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <div className="no-results section-animate section-visible">
                <h3>No {category} events found</h3>
                <p>Try adjusting your search or filter criteria</p>
                <button onClick={clearFilters} className="clear-filters">
                  Clear All Filters
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Scroll-To-Top Button */}
      <button 
        className={`scroll-to-top-btn ${showScrollTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Scroll to top"
        title="Back to top"
      >
        <span className="scroll-arrow">↑</span>
      </button>
    </div>
  );
};

export default Events;