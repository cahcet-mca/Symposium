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

  // Check if admin is logged in (for styling or conditional rendering if needed)
  const isAdminLoggedIn = () => {
    return localStorage.getItem('adminLoggedIn') === 'true' && 
           localStorage.getItem('adminToken') !== null;
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
        <Link to="/admin/login">
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
            <Link to="/register">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;