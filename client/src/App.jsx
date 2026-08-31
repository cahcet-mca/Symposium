// src/App.jsx (Client Main)
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Import Contexts
import { AuthProvider } from './context/AuthContext';
import { DateProvider } from './context/DateContext';
import { EventProvider } from './context/EventContext';

// Import Pages
import Home from './pages/Home';
import Events from './pages/Events';
import Login from './pages/Login';
import UserRegister from './pages/UserRegister';
import Dashboard from './pages/Dashboard';
import UPIPayment from './pages/UPIPayment';
import EventDetailsPage from './pages/EventDetailsPage';
import VerifyTicket from './pages/VerifyTicket';

// Import Components
import Navbar from './components/layout/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <DateProvider>
        <EventProvider>
          <div className="app-container">
            <Navbar />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/events" element={<Events />} />
              <Route path="/event/:id" element={<EventDetailsPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<UserRegister />} />
              <Route path="/verify-ticket/:id" element={<VerifyTicket />} />
              
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/payment/:id" 
                element={
                  <ProtectedRoute>
                    <UPIPayment />
                  </ProtectedRoute>
                } 
              />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </EventProvider>
      </DateProvider>
    </AuthProvider>
  );
}

export default App;