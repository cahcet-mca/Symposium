// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { EventProvider } from './context/EventContext';
import { AuthProvider } from './context/AuthContext';
import { DateProvider } from './context/DateContext';
import Navbar from './components/layout/Navbar';
import Home from './pages/Home';
import Events from './pages/Events';
import EventRegistration from './pages/EventRegistration';
import UserRegister from './pages/UserRegister';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UPIPayment from './pages/UPIPayment';
import EventDetailsPage from './pages/EventDetailsPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/common/ProtectedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <EventProvider>
        <DateProvider> {/* Add this wrapper */}
          <Router>
            <div className="App">
              <Navbar />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<Events />} />
                <Route path="/event/:id" element={<EventDetailsPage />} />
                <Route path="/event-register/:id" element={
                  <ProtectedRoute>
                    <EventRegistration />
                  </ProtectedRoute>
                } />
                <Route path="/payment/:id" element={
                  <ProtectedRoute>
                    <UPIPayment />
                  </ProtectedRoute>
                } />
                <Route path="/register" element={<UserRegister />} />
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                
                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
              </Routes>
            </div>
          </Router>
        </DateProvider>
      </EventProvider>
    </AuthProvider>
  );
}

export default App;