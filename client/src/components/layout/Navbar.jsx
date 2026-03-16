// src/components/layout/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getFirstName = (fullName) => {
    if (!fullName) return 'User';
    return fullName.split(' ')[0];
  };

  // Check if admin is logged in (for styling or conditional rendering if needed)
  const isAdminLoggedIn = () => {
    return localStorage.getItem('adminLoggedIn') === 'true' && 
           localStorage.getItem('adminToken') !== null;
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">
          <span className="nav-logo-text">TECNO RENDEZVOUS</span>
        </Link>
      </div>
      
      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/events">Events</Link>
        
        {/* Admin Link - Always goes to admin login, which will auto-redirect if already logged in */}
        <Link to="/admin/login" className="admin-nav-btn">
          <span className="admin-icon"></span>
          Admin
        </Link>
        
        {isAuthenticated ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <div className="user-profile">
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
            <Link to="/register" className="register-nav-btn">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;