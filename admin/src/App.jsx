import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { DateProvider } from './context/DateContext';
import { EventProvider } from './context/EventContext';

// Import pages
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

// Protected Route Component for Admin
const ProtectedAdminRoute = ({ children }) => {
  const adminToken = localStorage.getItem('adminToken');
  
  if (!adminToken) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return children;
};

function App() {
  // Check if API_URL is defined
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (!apiUrl) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0a0a0a',
        color: '#ff4757',
        flexDirection: 'column',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>⚠️ Configuration Error</h1>
        <p style={{ color: '#b0b0b0', maxWidth: '500px' }}>
          VITE_API_URL is not defined. Please create a <code style={{ background: '#1a1a1a', padding: '2px 8px', borderRadius: '4px' }}>.env</code> file with:
        </p>
        <code style={{ 
          background: '#1a1a1a', 
          padding: '10px 20px', 
          borderRadius: '8px',
          margin: '20px 0',
          color: '#ffd700',
          border: '1px solid #ffd700'
        }}>
          VITE_API_URL=http://localhost:5000/api
        </code>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Then restart the development server.
        </p>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <DateProvider>
          <EventProvider>
            <Routes>
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedAdminRoute>
                    <AdminDashboard />
                  </ProtectedAdminRoute>
                } 
              />
              <Route path="/" element={<Navigate to="/admin/login" replace />} />
              <Route path="*" element={<Navigate to="/admin/login" replace />} />
            </Routes>
          </EventProvider>
        </DateProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;