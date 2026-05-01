import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useEvents } from '../context/EventContext';
import { useSymposiumDate } from '../context/DateContext';
import EventCard from '../components/events/EventCard';
import Loader from '../components/common/Loader';
import EventDetailsPopup from '../components/events/EventDetailsPopup';
import axios from 'axios';
import './Events.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://symposium-veyj.onrender.com/api';

const Events = () => {
  const [category, setCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [eventType, setEventType] = useState('All');
  const [registrationsOpen, setRegistrationsOpen] = useState(true);
  const { events, loading, error } = useEvents();
  const { symposiumName } = useSymposiumDate();
  const location = useLocation();

  // State for event details popup
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category');
    if (cat) setCategory(cat);
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

  // Function to handle view details click - FETCHES FRESH DATA
  const handleViewDetails = async (event) => {
    try {
      console.log('🔍 Events page fetching fresh data for event:', event._id);

      // Fetch the latest event data with real counts
      const response = await axios.get(
        `${API_URL}/events/${event._id}/with-count`
      );

      if (response.data.success) {
        const freshEventData = response.data.data;
        console.log('✅ Fresh event data received:', {
          name: freshEventData.name,
          registeredCount: freshEventData.registeredCount,
          maxParticipants: freshEventData.maxParticipants
        });

        setSelectedEvent(freshEventData);
        setShowPopup(true);
      } else {
        // Fallback to the passed event if API fails
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

  const filteredEvents = events.filter(event => {
    const matchesCategory = category === 'All' || event.category === category;
    const matchesSearch = event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = eventType === 'All' || event.type === eventType;
    return matchesCategory && matchesSearch && matchesType;
  });

  const technicalEvents = filteredEvents.filter(e => e.category === 'Technical');
  const nonTechnicalEvents = filteredEvents.filter(e => e.category === 'Non-Technical');

  // Show registration closed banner if needed
  const showRegistrationBanner = !registrationsOpen;

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="events-page">
        <div className="error-container">
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
        <div className="no-events-container">
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

      <div className="events-header">
        <h1>{symposiumName} Events</h1>
        <p className="header-subtitle">Choose your arena and showcase your talent</p>

        <div className="search-section">
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="🔍 Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="filter-tabs">
          <button
            className={`filter-btn ${category === 'All' ? 'active' : ''}`}
            onClick={() => setCategory('All')}
          >
            All Events ({events.length})
          </button>
          <button
            className={`filter-btn ${category === 'Technical' ? 'active' : ''}`}
            onClick={() => setCategory('Technical')}
          >
            Technical ({events.filter(e => e.category === 'Technical').length})
          </button>
          <button
            className={`filter-btn ${category === 'Non-Technical' ? 'active' : ''}`}
            onClick={() => setCategory('Non-Technical')}
          >
            Non-Technical ({events.filter(e => e.category === 'Non-Technical').length})
          </button>
        </div>

        <div className="type-filter">
          <label>Event Type:</label>
          <select
            onChange={(e) => setEventType(e.target.value)}
            value={eventType}
            className="type-select"
          >
            <option value="All">All Types</option>
            <option value="Individual">Individual Events</option>
            <option value="Team">Team Events</option>
          </select>
        </div>
      </div>

      <div className="events-container">
        {category === 'All' ? (
          <>
            {technicalEvents.length > 0 && (
              <section className="category-section">
                <div className="category-header">
                  <h2>⚡ Technical Events</h2>
                  <p className="category-fee">₹50 per head | Individual & Team events</p>
                </div>
                <div className="event-grid">
                  {technicalEvents.map(event => (
                    <EventCard
                      key={event._id}
                      event={event}
                      onViewDetails={handleViewDetails}
                      registrationsOpen={registrationsOpen}
                    />
                  ))}
                </div>
              </section>
            )}

            {nonTechnicalEvents.length > 0 && (
              <section className="category-section">
                <div className="category-header">
                  <h2>🎨 Non-Technical Events</h2>
                  <p className="category-fee">₹50 per head | Individual & Team events</p>
                </div>
                <div className="event-grid">
                  {nonTechnicalEvents.map(event => (
                    <EventCard
                      key={event._id}
                      event={event}
                      onViewDetails={handleViewDetails}
                      registrationsOpen={registrationsOpen}
                    />
                  ))}
                </div>
              </section>
            )}

            {technicalEvents.length === 0 && nonTechnicalEvents.length === 0 && (
              <div className="no-results">
                <h3>No events match your filters</h3>
                <p>Try adjusting your search criteria</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCategory('All');
                    setEventType('All');
                  }}
                  className="clear-filters"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {filteredEvents.length > 0 ? (
              <div className="event-grid">
                {filteredEvents.map(event => (
                  <EventCard
                    key={event._id}
                    event={event}
                    onViewDetails={handleViewDetails}
                    registrationsOpen={registrationsOpen}
                  />
                ))}
              </div>
            ) : (
              <div className="no-results">
                <h3>No events found</h3>
                <p>Try adjusting your search or filter</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setCategory('All');
                    setEventType('All');
                  }}
                  className="clear-filters"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Events;