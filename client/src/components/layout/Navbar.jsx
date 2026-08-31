// src/components/layout/Navbar.jsx - Updated with proper avatar icon

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSymposiumDate } from '../../context/DateContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { symposiumName } = useSymposiumDate();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getFirstName = (fullName) => {
    if (!fullName) return 'User';
    return fullName.split(' ')[0];
  };

  // Get user initials for avatar
  const getUserInitials = (fullName) => {
    if (!fullName) return 'U';
    const nameParts = fullName.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };

  // Get avatar color based on name
  const getAvatarColor = (name) => {
    if (!name) return '#b8860b';
    const colors = [
      '#b8860b', '#ffd700', '#2ecc71', '#3498db', '#e74c3c', 
      '#9b59b6', '#1abc9c', '#f39c12', '#e67e22', '#2ecc71'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">
          <span className="nav-logo-text">{symposiumName}</span>
        </Link>
      </div>
      
      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/events">Events</Link>        
        {isAuthenticated ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <div className="user-profile">
              <div className="user-avatar-wrapper">
                <div 
                  className="user-avatar"
                  style={{ 
                    backgroundColor: getAvatarColor(user?.name),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={user?.name || 'User'}
                >
                  {getUserInitials(user?.name)}
                </div>
              </div>
              <span className="user-greeting">Hi,</span>
              <span className="user-name" title={user?.name}>
                {getFirstName(user?.name)}
              </span>
            </div>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;