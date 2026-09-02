// src/pages/AdminDashboard.jsx - Complete with Scroll Animations

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useSymposiumDate } from '../context/DateContext';
import './AdminDashboard.css';

const API_URL = import.meta.env.VITE_API_URL;

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [registrations, setRegistrations] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showScreenshotModal, setShowScreenshotModal] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [registrationsOpen, setRegistrationsOpen] = useState(true);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });
  
  // Mobile sidebar state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // Refs for scroll animations
  const statsRef = useRef(null);
  const contentRef = useRef(null);
  const sidebarRef = useRef(null);

  // Scroll Progress state
  const [scrollProgress, setScrollProgress] = useState(0);
  
  // Symposium Name update states
  const [newSymposiumName, setNewSymposiumName] = useState('');
  const [updatingName, setUpdatingName] = useState(false);
  
  // Date update states
  const [newDate, setNewDate] = useState('');
  const [updatingDate, setUpdatingDate] = useState(false);
  
  // Venue update states
  const [newVenue, setNewVenue] = useState('');
  const [newVenueDetails, setNewVenueDetails] = useState('');
  const [updatingVenue, setUpdatingVenue] = useState(false);
  
  // UPI ID update states
  const [newUpiId, setNewUpiId] = useState('');
  const [updatingUpi, setUpdatingUpi] = useState(false);

  // Add Event states
  const [newEvent, setNewEvent] = useState({
    name: '',
    subEventName: '',
    coordinatorName: '',
    coordinatorPhone: '',
    category: 'Technical',
    type: 'Individual',
    description: '',
    fee: 50,
    minTeamSize: 1,
    maxTeamSize: 1,
    startTime: '10:00 AM',
    endTime: '12:30 PM',
    venue: '',
    requirements: [],
    rules: [],
    prizes: {
      first: '',
      second: '',
      third: ''
    },
    maxParticipants: 30,
    status: 'Upcoming',
    image: 'default-event.jpg'
  });
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [tempRequirement, setTempRequirement] = useState('');
  const [tempRule, setTempRule] = useState('');

  const addRequirement = () => {
    if (tempRequirement.trim()) {
      setNewEvent(prev => ({
        ...prev,
        requirements: [...(prev.requirements || []), tempRequirement.trim()]
      }));
      setTempRequirement('');
    }
  };

  const removeRequirement = (index) => {
    setNewEvent(prev => ({
      ...prev,
      requirements: (prev.requirements || []).filter((_, i) => i !== index)
    }));
  };

  const addRule = () => {
    if (tempRule.trim()) {
      setNewEvent(prev => ({
        ...prev,
        rules: [...(prev.rules || []), tempRule.trim()]
      }));
      setTempRule('');
    }
  };

  const removeRule = (index) => {
    setNewEvent(prev => ({
      ...prev,
      rules: (prev.rules || []).filter((_, i) => i !== index)
    }));
  };
  
  // Event Management states
  const [events, setEvents] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  
  // Message state for settings updates
  const [settingsMessage, setSettingsMessage] = useState({ type: '', text: '' });
  
  const [stats, setStats] = useState({
    pending: 0,
    accepted: 0,
    rejected: 0,
    participants: 0,
    totalRevenue: 0
  });
  
  const navigate = useNavigate();
  const adminData = JSON.parse(localStorage.getItem('adminData') || '{}');
  const { 
    symposiumDate, 
    symposiumName, 
    venue, 
    venueDetails, 
    upiId, 
    refreshSettings 
  } = useSymposiumDate();

  // ============================================
  // SCROLL ANIMATIONS - Intersection Observer
  // ============================================
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -30px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('section-visible');
        }
      });
    }, observerOptions);

    const sections = [statsRef.current, contentRef.current, sidebarRef.current].filter(Boolean);
    sections.forEach(section => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [loading]);

  // Get today's date in YYYY-MM-DD format for min attribute
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Close mobile sidebar when window resizes above mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile sidebar when tab changes
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [activeTab]);

  // Clear action message after 3 seconds
  useEffect(() => {
    if (actionMessage.text) {
      const timer = setTimeout(() => {
        setActionMessage({ type: '', text: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [actionMessage]);

  // Clear settings message after 3 seconds
  useEffect(() => {
    if (settingsMessage.text) {
      const timer = setTimeout(() => {
        setSettingsMessage({ type: '', text: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [settingsMessage]);

  // ============================================
  // CHECK ADMIN AUTHENTICATION
  // ============================================
  useEffect(() => {
    const checkAdminAuth = () => {
      const adminToken = localStorage.getItem('adminToken');
      const adminLoggedIn = localStorage.getItem('adminLoggedIn');
      const adminData = localStorage.getItem('adminData');
      
      console.log('🔍 AdminDashboard - Checking authentication:');
      console.log('   adminToken:', adminToken ? '✅ Present' : '❌ Missing');
      console.log('   adminLoggedIn:', adminLoggedIn);
      console.log('   adminData:', adminData ? '✅ Present' : '❌ Missing');
      
      if (!adminToken || adminLoggedIn !== 'true' || !adminData) {
        console.log('❌ Admin session incomplete, redirecting to login');
        navigate('/admin/login');
        return false;
      }
      
      console.log('✅ Admin session valid, staying on dashboard');
      return true;
    };

    checkAdminAuth();
  }, [navigate]);

  // ============================================
  // FETCH SETTINGS
  // ============================================
  const fetchSettings = useCallback(async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await axios.get(`${API_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      
      if (response.data.success) {
        setRegistrationsOpen(response.data.data.registrationsOpen);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  }, []);

  // ============================================
  // TOGGLE REGISTRATIONS FUNCTION
  // ============================================
  const toggleRegistrations = async () => {
    try {
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await axios.put(
        `${API_URL}/admin/settings/toggle-registrations`,
        {},
        { 
          headers: { 
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      if (response.data.success) {
        const newState = response.data.data.registrationsOpen;
        setRegistrationsOpen(newState);
        setActionMessage({
          type: 'success',
          text: `✅ Registrations are now ${newState ? 'OPEN' : 'CLOSED'}`
        });
      }
    } catch (error) {
      console.error('Error toggling registrations:', error);
      setActionMessage({
        type: 'error',
        text: '❌ Failed to toggle registration status'
      });
      
      if (error.response?.status === 401) {
        setTimeout(() => handleLogout(), 2000);
      }
    }
  };

  // ============================================
  // UPDATE SYMPOSIUM NAME
  // ============================================
  const handleUpdateSymposiumName = async (e) => {
    e.preventDefault();
    setUpdatingName(true);
    setSettingsMessage({ type: '', text: '' });

    try {
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await axios.put(
        `${API_URL}/symposium/admin/name`,
        { name: newSymposiumName },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.data.success) {
        setSettingsMessage({ type: 'success', text: '✅ Symposium name updated successfully!' });
        refreshSettings();
        setNewSymposiumName('');
      }
    } catch (error) {
      setSettingsMessage({ 
        type: 'error', 
        text: error.response?.data?.message || '❌ Failed to update symposium name' 
      });
      
      if (error.response?.status === 401) {
        setSettingsMessage({ type: 'error', text: 'Session expired. Please login again.' });
        setTimeout(() => handleLogout(), 2000);
      }
    } finally {
      setUpdatingName(false);
    }
  };

  // ============================================
  // UPDATE SYMPOSIUM DATE
  // ============================================
  const handleUpdateDate = async (e) => {
    e.preventDefault();
    setUpdatingDate(true);
    setSettingsMessage({ type: '', text: '' });

    try {
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await axios.put(
        `${API_URL}/symposium/admin/date`,
        { date: newDate },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.data.success) {
        setSettingsMessage({ type: 'success', text: '✅ Symposium date updated successfully!' });
        refreshSettings();
        setNewDate('');
      }
    } catch (error) {
      setSettingsMessage({ 
        type: 'error', 
        text: error.response?.data?.message || '❌ Failed to update date' 
      });
      
      if (error.response?.status === 401) {
        setSettingsMessage({ type: 'error', text: 'Session expired. Please login again.' });
        setTimeout(() => handleLogout(), 2000);
      }
    } finally {
      setUpdatingDate(false);
    }
  };

  // ============================================
  // UPDATE SYMPOSIUM VENUE
  // ============================================
  const handleUpdateVenue = async (e) => {
    e.preventDefault();
    setUpdatingVenue(true);
    setSettingsMessage({ type: '', text: '' });

    try {
      const adminToken = localStorage.getItem('adminToken');
      
      const response = await axios.put(
        `${API_URL}/symposium/admin/venue`,
        { venue: newVenue, venueDetails: newVenueDetails },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.data.success) {
        setSettingsMessage({ type: 'success', text: '✅ Symposium venue updated successfully!' });
        refreshSettings();
        setNewVenue('');
        setNewVenueDetails('');
      }
    } catch (error) {
      setSettingsMessage({ 
        type: 'error', 
        text: error.response?.data?.message || '❌ Failed to update venue' 
      });
      
      if (error.response?.status === 401) {
        setSettingsMessage({ type: 'error', text: 'Session expired. Please login again.' });
        setTimeout(() => handleLogout(), 2000);
      }
    } finally {
      setUpdatingVenue(false);
    }
  };

  // ============================================
  // UPDATE UPI ID
  // ============================================
  const handleUpdateUpiId = async (e) => {
    e.preventDefault();
    setUpdatingUpi(true);
    setSettingsMessage({ type: '', text: '' });

    try {
      const adminToken = localStorage.getItem('adminToken');
      
      const upiRegex = /^[\w.-]+@[\w.-]+$/;
      if (!upiRegex.test(newUpiId)) {
        setSettingsMessage({ 
          type: 'error', 
          text: '❌ Please enter a valid UPI ID (e.g., 8098932041@ptsbi)' 
        });
        setUpdatingUpi(false);
        return;
      }

      const response = await axios.put(
        `${API_URL}/symposium/admin/upi-id`,
        { upiId: newUpiId },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );

      if (response.data.success) {
        setSettingsMessage({ type: 'success', text: '✅ UPI ID updated successfully!' });
        refreshSettings();
        setNewUpiId('');
      }
    } catch (error) {
      setSettingsMessage({ 
        type: 'error', 
        text: error.response?.data?.message || '❌ Failed to update UPI ID' 
      });
      
      if (error.response?.status === 401) {
        setSettingsMessage({ type: 'error', text: 'Session expired. Please login again.' });
        setTimeout(() => handleLogout(), 2000);
      }
    } finally {
      setUpdatingUpi(false);
    }
  };


  const fetchEvents = useCallback(async () => {
    try {
      setLoadingEvents(true);
      const response = await axios.get(`${API_URL}/events`);
      if (response.data.success) {
        setEvents(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  const openCreateEventModal = () => {
    setEditingEvent(null);
    setNewEvent({
      name: '',
      subEventName: '',
      coordinatorName: '',
      coordinatorPhone: '',
      category: 'Technical',
      type: 'Individual',
      description: '',
      fee: 50,
      minTeamSize: 1,
      maxTeamSize: 1,
      startTime: '10:00 AM',
      endTime: '12:30 PM',
      venue: '',
      requirements: [],
      rules: [],
      prizes: {
        first: '',
        second: '',
        third: ''
      },
      maxParticipants: 30,
      status: 'Upcoming',
      image: 'default-event.jpg'
    });
    setTempRequirement('');
    setTempRule('');
    setShowEventModal(true);
  };

  const openEditEventModal = (event) => {
    setEditingEvent(event);
    setNewEvent({
      name: event.name || '',
      subEventName: event.subEventName || '',
      coordinatorName: event.coordinatorName || '',
      coordinatorPhone: event.coordinatorPhone || '',
      category: event.category || 'Technical',
      type: event.type || 'Individual',
      description: event.description || '',
      fee: event.fee || 0,
      minTeamSize: event.minTeamSize || 1,
      maxTeamSize: event.maxTeamSize || 1,
      startTime: event.startTime || '10:00 AM',
      endTime: event.endTime || '12:30 PM',
      venue: event.venue || '',
      requirements: event.requirements || [],
      rules: event.rules || [],
      prizes: {
        first: event.prizes?.first || '',
        second: event.prizes?.second || '',
        third: event.prizes?.third || ''
      },
      maxParticipants: event.maxParticipants || 30,
      status: event.status || 'Upcoming',
      image: event.image || 'default-event.jpg'
    });
    setTempRequirement('');
    setTempRule('');
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }
    
    try {
      const adminToken = localStorage.getItem('adminToken');
      const response = await axios.delete(`${API_URL}/events/${eventId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      if (response.data.success) {
        setSettingsMessage({ type: 'success', text: '✅ Event deleted successfully!' });
        fetchEvents();
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      setSettingsMessage({ type: 'error', text: '❌ Failed to delete event' });
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    setCreatingEvent(true);
    setSettingsMessage({ type: '', text: '' });

    try {
      const adminToken = localStorage.getItem('adminToken');
      let response;
      
      if (editingEvent) {
        response = await axios.put(
          `${API_URL}/events/${editingEvent._id}`,
          newEvent,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
      } else {
        response = await axios.post(
          `${API_URL}/events`,
          newEvent,
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
      }

      if (response.data.success) {
        setSettingsMessage({
          type: 'success',
          text: `✅ Event "${newEvent.name}" ${editingEvent ? 'updated' : 'created'} successfully!`
        });
        setShowEventModal(false);
        setEditingEvent(null);
        fetchEvents();
      }
    } catch (error) {
      console.error('Error saving event:', error);
      setSettingsMessage({ 
        type: 'error', 
        text: error.response?.data?.message || '❌ Failed to save event' 
      });
      
      if (error.response?.status === 401) {
        setSettingsMessage({ type: 'error', text: 'Session expired. Please login again.' });
        setTimeout(() => handleLogout(), 2000);
      }
    } finally {
      setCreatingEvent(false);
    }
  };

  // ============================================
  // FETCH REGISTRATIONS
  // ============================================
  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        console.error('No admin token found');
        return;
      }

      let url = `${API_URL}/admin/registrations`;
      
      const statusMap = {
        'pending': 'pending',
        'verified': 'verified',
        'accepted': 'verified',
        'rejected': 'rejected',
        'all': 'all'
      };
      
      const statusParam = statusMap[activeTab] || 'all';
      url = `${API_URL}/admin/registrations?status=${statusParam}`;

      console.log(`📡 Fetching registrations from: ${url}`);

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      if (response.data.success) {
        const allRegs = response.data.data || [];
        setRegistrations(allRegs);
        
        const allRegsResponse = await axios.get(`${API_URL}/admin/registrations?status=all`, {
          headers: { Authorization: `Bearer ${adminToken}` }
        });
        
        if (allRegsResponse.data.success) {
          const allData = allRegsResponse.data.data || [];
          const totalPending = allData.filter(r => r.paymentStatus === 'pending').length;
          const totalAccepted = allData.filter(r => r.paymentStatus === 'verified').length;
          const totalRejected = allData.filter(r => r.paymentStatus === 'rejected').length;
          const totalRevenue = allData
            .filter(r => r.paymentStatus === 'verified')
            .reduce((sum, r) => sum + (r.totalAmount || 0), 0);
          
          const totalParticipants = allData
            .filter(r => r.paymentStatus === 'verified')
            .reduce((sum, r) => sum + (r.teamSize || 1), 0);
          
          setStats({
            pending: totalPending,
            accepted: totalAccepted,
            rejected: totalRejected,
            participants: totalParticipants,
            totalRevenue: totalRevenue
          });
        }
        
        if (activeTab === 'participants') {
          const allParticipants = [];
          const verifiedRegs = allRegs.filter(r => r.paymentStatus === 'verified');
          
          verifiedRegs.forEach(reg => {
            if (reg.participants && reg.participants.length > 0) {
              reg.participants.forEach((p, index) => {
                allParticipants.push({
                  name: p.name || 'N/A',
                  mobile: p.phone || 'N/A',
                  eventName: reg.event?.name || reg.eventName || 'N/A',
                  eventSubName: reg.event?.subEventName || '',
                  college: reg.user?.college || 'N/A',
                  year: reg.user?.year,
                  isTeamLead: index === 0
                });
              });
            } else {
              allParticipants.push({
                name: reg.user?.name || 'N/A',
                mobile: reg.user?.phone || 'N/A',
                eventName: reg.event?.name || reg.eventName || 'N/A',
                eventSubName: reg.event?.subEventName || '',
                college: reg.user?.college || 'N/A',
                year: reg.user?.year,
                isTeamLead: true
              });
            }
          });
          setParticipants(allParticipants);
        }
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setActionMessage({
        type: 'error',
        text: '❌ Failed to fetch registrations'
      });
      
      if (error.response?.status === 401) {
        setActionMessage({
          type: 'error',
          text: 'Session expired. Please login again.'
        });
        setTimeout(() => handleLogout(), 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // ============================================
  // INITIAL DATA FETCH
  // ============================================
  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const adminLoggedIn = localStorage.getItem('adminLoggedIn');
    
    if (adminToken && adminLoggedIn === 'true') {
      fetchRegistrations();
      fetchSettings();
      fetchEvents();
    }
  }, [fetchRegistrations, fetchSettings, fetchEvents]);

  // ============================================
  // SCROLL PROGRESS LISTENER
  // ============================================
  useEffect(() => {
    const mainEl = contentRef.current;
    
    const handleScroll = () => {
      if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) {
        const total = mainEl.scrollHeight - mainEl.clientHeight;
        if (total > 0) {
          setScrollProgress((mainEl.scrollTop / total) * 100);
          return;
        }
      }
      
      const totalWindow = document.documentElement.scrollHeight - window.innerHeight;
      if (totalWindow > 0) {
        setScrollProgress((window.scrollY / totalWindow) * 100);
      }
    };

    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeTab, loading, registrations, participants, events]);

  // ============================================
  // HANDLE STATUS UPDATE (ACCEPT/REJECT)
  // ============================================
  const handleStatusUpdate = async (registrationId, status) => {
    try {
      setProcessingId(registrationId);
      const adminToken = localStorage.getItem('adminToken');
      
      if (!adminToken) {
        setActionMessage({
          type: 'error',
          text: '❌ No admin token found. Please login again.'
        });
        setTimeout(() => handleLogout(), 2000);
        return;
      }

      const backendStatus = status === 'accepted' ? 'verified' : 'rejected';
      
      console.log(`🔄 Updating registration ${registrationId} to ${backendStatus}`);
      
      const response = await axios.put(
        `${API_URL}/admin/registrations/${registrationId}/status`,
        { status: backendStatus },
        { 
          headers: { 
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      if (response.data.success) {
        setActionMessage({
          type: 'success',
          text: `✅ Registration ${status} successfully!`
        });
        
        await fetchRegistrations();
        await fetchSettings();
      }
    } catch (error) {
      console.error('❌ Error updating status:', error);
      
      let errorMessage = '❌ Failed to update registration status';
      
      if (error.response) {
        console.error('Error response:', error.response.data);
        errorMessage = error.response.data?.message || errorMessage;
        
        if (error.response.status === 401) {
          errorMessage = 'Session expired. Please login again.';
          setTimeout(() => handleLogout(), 2000);
        } else if (error.response.status === 403) {
          errorMessage = 'You do not have permission to perform this action';
        } else if (error.response.status === 404) {
          errorMessage = 'Registration not found';
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      setActionMessage({
        type: 'error',
        text: errorMessage
      });
    } finally {
      setProcessingId(null);
    }
  };

  // ============================================
  // VIEW PARTICIPANTS MODAL
  // ============================================
  const viewParticipants = (registration) => {
    setSelectedRegistration(registration);
    setShowParticipantsModal(true);
  };

  const closeModal = () => {
    setShowParticipantsModal(false);
    setSelectedRegistration(null);
  };

  const viewScreenshot = (registration) => {
    setSelectedScreenshot(registration.paymentScreenshot || '');
    setShowScreenshotModal(true);
  };

  const closeScreenshotModal = () => {
    setShowScreenshotModal(false);
    setSelectedScreenshot('');
  };

  // ============================================
  // DOWNLOAD PARTICIPANTS AS EXCEL
  // ============================================
  const downloadParticipantsSheet = () => {
    if (participants.length === 0) {
      setActionMessage({
        type: 'error',
        text: '❌ No participants data to download'
      });
      return;
    }

    try {
      const excelData = participants.map((p, index) => ({
        'S.No': index + 1,
        'Participant Name': p.name || 'N/A',
        'Event Name': `${p.eventName} ${p.eventSubName ? `- ${p.eventSubName}` : ''}`,
        'Mobile Number': p.mobile || 'N/A',
        'College Name': p.college || 'N/A',
        'Year': formatYear(p.year),
        'Role': p.isTeamLead ? 'Team Lead' : 'Member'
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      
      const colWidths = [
        { wch: 5 },   // S.No
        { wch: 25 },  // Participant Name
        { wch: 35 },  // Event Name
        { wch: 15 },  // Mobile Number
        { wch: 30 },  // College Name
        { wch: 12 },  // Year
        { wch: 12 }   // Role
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Participants');

      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const fileName = `participants_list_${dateStr}.xlsx`;

      XLSX.writeFile(wb, fileName);
      
      setActionMessage({
        type: 'success',
        text: `✅ Downloaded ${participants.length} participants`
      });
    } catch (error) {
      console.error('Error downloading Excel:', error);
      setActionMessage({
        type: 'error',
        text: '❌ Failed to download participants list'
      });
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 'pending': return 'status-pending';
      case 'verified': return 'status-accepted';
      case 'rejected': return 'status-rejected';
      default: return '';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'pending': return 'Pending';
      case 'verified': return 'Accepted';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const formatYear = (year) => {
    if (!year && year !== 0) return 'N/A';
    const yearNum = parseInt(year);
    if (isNaN(yearNum)) return 'N/A';
    const suffix = yearNum === 1 ? 'st' : yearNum === 2 ? 'nd' : yearNum === 3 ? 'rd' : 'th';
    return `${yearNum}${suffix} Year`;
  };

  // ============================================
  // HANDLE LOGOUT
  // ============================================
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    localStorage.removeItem('adminLoggedIn');
    sessionStorage.clear();
    
    console.log('👋 Admin logged out, session cleared');
    navigate('/admin/login');
  };

  // ============================================
  // TOGGLE MOBILE SIDEBAR
  // ============================================
  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  // ============================================
  // GET TABLE HEADERS BASED ON ACTIVE TAB
  // ============================================
  const getTableHeaders = () => {
    if (activeTab === 'participants') {
      return ['S.No', 'Participant Name', 'Mobile', 'Event', 'College', 'Year'];
    }
    const baseHeaders = ['Date', 'Transaction ID', 'User', 'Event', 'Team Size', 'Amount', 'Status'];
    return activeTab === 'pending' ? [...baseHeaders, 'Actions'] : baseHeaders;
  };

  // ============================================
  // RENDER MOBILE CARD FOR REGISTRATION
  // ============================================
  const renderMobileRegistrationCard = (reg) => {
    const isPending = activeTab === 'pending';
    
    const safeReg = {
      _id: reg?._id || `temp-${Math.random()}`,
      paymentStatus: reg?.paymentStatus || 'pending',
      registrationStatus: reg?.registrationStatus || 'pending',
      createdAt: reg?.createdAt || new Date().toISOString(),
      transactionId: reg?.transactionId || 'N/A',
      totalAmount: reg?.totalAmount || 0,
      teamSize: reg?.teamSize || 1,
      event: reg?.event || {
        name: reg?.eventName || 'Unknown Event',
        subEventName: '',
        category: 'Event',
        startTime: 'TBA'
      },
      user: reg?.user || {
        name: 'Unknown User',
        email: '',
        phone: '',
        college: ''
      },
      participants: reg?.participants || []
    };
    
    return (
      <div key={safeReg._id} className="registration-mobile-card">
        <div className="mobile-card-header">
          <span className="mobile-event-name">{safeReg.event?.name || safeReg.eventName}</span>
          <span className={`mobile-status-badge ${safeReg.paymentStatus}`}>
            {getStatusText(safeReg.paymentStatus)}
          </span>
        </div>
        
        <div className="mobile-card-body">
          <div className="mobile-info-row">
            <span className="mobile-info-label">Date:</span>
            <span className="mobile-info-value">{new Date(safeReg.createdAt).toLocaleDateString()}</span>
          </div>
          
          <div className="mobile-info-row">
            <span className="mobile-info-label">Transaction:</span>
            <span className="mobile-info-value transaction-id">{safeReg.transactionId}</span>
          </div>
          
          <div className="mobile-info-row">
            <span className="mobile-info-label">User:</span>
            <div className="mobile-info-value">
              <strong>{safeReg.user?.name}</strong>
              <div className="mobile-user-details">
                <div>{safeReg.user?.email}</div>
                <div>{safeReg.user?.phone}</div>
                <div>{safeReg.user?.college}</div>
              </div>
            </div>
          </div>
          
          <div className="mobile-info-row">
            <span className="mobile-info-label">Event:</span>
            <div className="mobile-info-value">
              <strong>{safeReg.event?.name || safeReg.eventName}</strong>
              {safeReg.event?.subEventName && (
                <div className="mobile-event-details">
                  📌 {safeReg.event.subEventName}
                </div>
              )}
              <div className="mobile-event-details">
                {safeReg.event?.category} • {safeReg.event?.startTime}
              </div>
            </div>
          </div>
          
          <div className="mobile-info-row">
            <span className="mobile-info-label">Type:</span>
            <div className="mobile-info-value">
              {safeReg.teamSize > 1 ? `${safeReg.teamSize} members` : 'Individual'}
            </div>
          </div>
          
          <div className="mobile-info-row">
            <span className="mobile-info-label">Amount:</span>
            <span className="mobile-info-value" style={{ color: '#ffd700' }}>₹{safeReg.totalAmount}</span>
          </div>
          
          {safeReg.participants && safeReg.participants.length > 0 && (
            <div className="mobile-info-row">
              <span className="mobile-info-label">Participants:</span>
              <div className="mobile-info-value">
                <div className="mobile-participants">
                  {safeReg.participants.map((p, idx) => (
                    <div key={idx} className="mobile-participant">
                      <span className="mobile-participant-name">{p.name}</span>
                      <span className="mobile-participant-detail">{p.phone} • {p.email}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {isPending && (
            <div className="mobile-card-actions">
              <button 
                onClick={() => handleStatusUpdate(safeReg._id, 'accepted')}
                className="mobile-action-btn accept"
                disabled={processingId === safeReg._id}
              >
                {processingId === safeReg._id ? '⏳' : '✓'} Accept
              </button>
              <button 
                onClick={() => handleStatusUpdate(safeReg._id, 'rejected')}
                className="mobile-action-btn reject"
                disabled={processingId === safeReg._id}
              >
                {processingId === safeReg._id ? '⏳' : '✗'} Reject
              </button>
              <button 
                onClick={() => viewParticipants(reg)} 
                className="mobile-action-btn view"
              >
                👥 View Team
              </button>
              <button 
                onClick={() => viewScreenshot(reg)} 
                className="mobile-action-btn view"
                style={{ marginTop: '5px' }}
              >
                👁️ View Screenshot
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER MOBILE PARTICIPANT CARD
  // ============================================
  const renderMobileParticipantCard = (participant, index) => {
    return (
      <div key={index} className="registration-mobile-card">
        <div className="mobile-card-header">
          <span className="mobile-event-name">{participant.name}</span>
          <span className={`mobile-status-badge ${participant.isTeamLead ? 'verified' : 'pending'}`}>
            {participant.isTeamLead ? 'Team Lead' : 'Member'}
          </span>
        </div>
        
        <div className="mobile-card-body">
          <div className="mobile-info-row">
            <span className="mobile-info-label">Mobile:</span>
            <span className="mobile-info-value">{participant.mobile}</span>
          </div>
          
          <div className="mobile-info-row">
            <span className="mobile-info-label">Event:</span>
            <div className="mobile-info-value">
              <strong>{participant.eventName}</strong>
              {participant.eventSubName && (
                <div className="mobile-event-details">📌 {participant.eventSubName}</div>
              )}
            </div>
          </div>
          
          <div className="mobile-info-row">
            <span className="mobile-info-label">College:</span>
            <span className="mobile-info-value">{participant.college}</span>
          </div>
          
          <div className="mobile-info-row">
            <span className="mobile-info-label">Year:</span>
            <span className="mobile-info-value">{formatYear(participant.year)}</span>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER COMPONENT
  // ============================================
  return (
    <div className="admin-dashboard">
      {/* Scroll Progress Bar */}
      <div 
        className="scroll-progress-bar" 
        style={{ width: `${scrollProgress}%` }} 
      />

      {/* Mobile Sidebar Toggle Button */}
      <button 
        className="mobile-sidebar-toggle" 
        onClick={toggleMobileSidebar}
        aria-label="Toggle menu"
      >
        {mobileSidebarOpen ? '✕' : '☰'}
      </button>

      {/* Sidebar Overlay for mobile */}
      <div 
        className={`sidebar-overlay ${mobileSidebarOpen ? 'active' : ''}`}
        onClick={toggleMobileSidebar}
      ></div>

      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={`admin-sidebar section-animate ${mobileSidebarOpen ? 'mobile-open' : ''}`}
      >
        <div className="sidebar-header">
          <h2>Admin Dashboard</h2>
          <p>{symposiumName}</p>
          <p style={{ fontSize: '0.8rem', color: '#ffd700' }}>{symposiumDate}</p>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'pending' ? 'active' : ''}`} 
            onClick={() => setActiveTab('pending')}
          >
            <span className="nav-icon">⏳</span> 
            Pending 
            {stats.pending > 0 && <span className="badge">{stats.pending}</span>}
          </button>
          <button 
            className={`nav-item ${activeTab === 'verified' || activeTab === 'accepted' ? 'active' : ''}`} 
            onClick={() => setActiveTab('verified')}
          >
            <span className="nav-icon">✅</span> 
            Accepted 
            {stats.accepted > 0 && <span className="badge success">{stats.accepted}</span>}
          </button>
          <button 
            className={`nav-item ${activeTab === 'rejected' ? 'active' : ''}`} 
            onClick={() => setActiveTab('rejected')}
          >
            <span className="nav-icon">❌</span> 
            Rejected 
            {stats.rejected > 0 && <span className="badge danger">{stats.rejected}</span>}
          </button>
          <button 
            className={`nav-item ${activeTab === 'participants' ? 'active' : ''}`} 
            onClick={() => setActiveTab('participants')}
          >
            <span className="nav-icon">👥</span> 
            Participants 
            {stats.participants > 0 && <span className="badge info">{stats.participants}</span>}
          </button>
          <button 
            className={`nav-item ${activeTab === 'all' ? 'active' : ''}`} 
            onClick={() => setActiveTab('all')}
          >
            <span className="nav-icon">📋</span> 
            All Registrations
          </button>
          <button 
            className={`nav-item ${activeTab === 'events' ? 'active' : ''}`} 
            onClick={() => setActiveTab('events')}
          >
            <span className="nav-icon">🎪</span> 
            Manage Events
          </button>
          <button 
            className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} 
            onClick={() => setActiveTab('settings')}
          >
            <span className="nav-icon">⚙️</span> 
            Symposium Settings
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="toggle-container">
            <button 
              onClick={toggleRegistrations}
              className={`toggle-btn ${registrationsOpen ? 'on' : 'off'}`}
            >
              <span className="toggle-icon">{registrationsOpen ? '🔓' : '🔒'}</span>
              <span className="toggle-text">
                {registrationsOpen ? 'Registrations ON' : 'Registrations OFF'}
              </span>
            </button>
          </div>
          
          <button onClick={handleLogout} className="logout-btn">
            <span className="nav-icon">🚪</span> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div 
        ref={contentRef}
        className="admin-main section-animate"
      >
        <div className="admin-content">
          {/* Action Message */}
          {actionMessage.text && (
            <div className={`action-message ${actionMessage.type}`} style={{
              padding: '15px 20px',
              borderRadius: '10px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: actionMessage.type === 'success' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(255, 71, 87, 0.1)',
              border: `1px solid ${actionMessage.type === 'success' ? '#2ecc71' : '#ff4757'}`,
              color: actionMessage.type === 'success' ? '#2ecc71' : '#ff4757'
            }}>
              <span>{actionMessage.text}</span>
            </div>
          )}

          {/* Stats Cards */}
          <div 
            ref={statsRef}
            className="stats-grid section-animate"
          >
            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-info">
                <h3>{stats.pending}</h3>
                <p>Pending</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-info">
                <h3>{stats.accepted}</h3>
                <p>Accepted</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">❌</div>
              <div className="stat-info">
                <h3>{stats.rejected}</h3>
                <p>Rejected</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-info">
                <h3>{stats.participants}</h3>
                <p>Participants</p>
              </div>
            </div>
            <div className="stat-card revenue-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <h3>₹{stats.totalRevenue}</h3>
                <p>Revenue</p>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="registrations-section">
            <div className="section-header">
              <h2>
                {activeTab === 'pending' && 'Pending Registrations'}
                {activeTab === 'verified' && 'Accepted Registrations'}
                {activeTab === 'rejected' && 'Rejected Registrations'}
                {activeTab === 'participants' && 'All Participants'}
                {activeTab === 'all' && 'All Registrations'}
                {activeTab === 'settings' && 'Symposium Settings'}
              </h2>
              <div className="header-actions">
                <div className="live-status-indicator">
                  <span className="live-dot"></span> Live Updates
                </div>
                
                {activeTab === 'participants' && (
                  <button 
                    onClick={downloadParticipantsSheet} 
                    className="btn-download-excel"
                    disabled={participants.length === 0}
                  >
                    <span className="btn-icon">📥</span>
                    Download Excel {participants.length > 0 ? `(${participants.length})` : ''}
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="loading-spinner">Loading...</div>
            ) : (
              <>
                {activeTab === 'events' ? (
                  <div className="events-management">
                    <div className="section-header" style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h2>🎪 Manage Events</h2>
                      <button onClick={openCreateEventModal} className="btn-download-excel" style={{ background: 'linear-gradient(135deg, #b8860b, #ffd700)', color: '#000000', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                        ➕ Add New Event
                      </button>
                    </div>

                    <div className="table-container">
                      <table className="registrations-table">
                        <thead>
                          <tr>
                            <th>Event Name</th>
                            <th>Sub Event</th>
                            <th>Category</th>
                            <th>Type</th>
                            <th>Fee</th>
                            <th>Coordinator</th>
                            <th>Capacity</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingEvents ? (
                            <tr>
                              <td colSpan="8" className="no-data">Loading events...</td>
                            </tr>
                          ) : events.length > 0 ? (
                            events.map(event => (
                              <tr key={event._id}>
                                <td><strong>{event.name}</strong></td>
                                <td>{event.subEventName}</td>
                                <td>
                                  <span className={`status-badge ${event.category === 'Technical' ? 'status-accepted' : 'status-pending'}`}>
                                    {event.category}
                                  </span>
                                </td>
                                <td>{event.type}</td>
                                <td>₹{event.fee}</td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>{event.coordinatorName}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#2ecc71' }}>{event.coordinatorPhone}</span>
                                  </div>
                                </td>
                                <td>{(event.confirmedCount || 0) + (event.pendingCount || 0)} / {event.maxParticipants}</td>
                                <td>
                                  <div className="action-buttons">
                                    <button 
                                      onClick={() => openEditEventModal(event)} 
                                      className="btn-view" 
                                      title="Edit Event"
                                      style={{ marginRight: '10px' }}
                                    >
                                      📝
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteEvent(event._id)} 
                                      className="btn-reject" 
                                      title="Delete Event"
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="8" className="no-data">No events found</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : activeTab === 'settings' ? (
                  <div className="settings-container">
                    {/* Settings Message */}
                    {settingsMessage.text && (
                      <div className={`settings-message ${settingsMessage.type}`} style={{
                        padding: '15px 20px',
                        borderRadius: '10px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        backgroundColor: settingsMessage.type === 'success' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(255, 71, 87, 0.1)',
                        border: `1px solid ${settingsMessage.type === 'success' ? '#2ecc71' : '#ff4757'}`,
                        color: settingsMessage.type === 'success' ? '#2ecc71' : '#ff4757'
                      }}>
                        <span>{settingsMessage.text}</span>
                      </div>
                    )}

                    {/* Update Symposium Name Section */}
                    <div className="settings-card">
                      <h3>📝 Update Symposium Name</h3>
                      <p className="current-setting">
                        Current Name: <strong>{symposiumName}</strong>
                      </p>
                      
                      <form onSubmit={handleUpdateSymposiumName}>
                        <div className="form-group">
                          <label htmlFor="newSymposiumName">New Symposium Name</label>
                          <input
                            type="text"
                            id="newSymposiumName"
                            value={newSymposiumName}
                            onChange={(e) => setNewSymposiumName(e.target.value)}
                            placeholder="Enter new symposium name"
                            className="settings-input"
                            required
                          />
                        </div>
                        
                        <button 
                          type="submit" 
                          disabled={updatingName || !newSymposiumName}
                          className="btn-save-settings"
                        >
                          {updatingName ? 'Updating...' : 'Update Symposium Name'}
                        </button>
                      </form>
                    </div>

                    {/* Update Date Section */}
                    <div className="settings-card">
                      <h3>📅 Update Symposium Date</h3>
                      <p className="current-setting">
                        Current Date: <strong>{symposiumDate}</strong>
                      </p>
                      
                      <form onSubmit={handleUpdateDate}>
                        <div className="form-group">
                          <label htmlFor="newDate">Select New Date</label>
                          <input
                            type="date"
                            id="newDate"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            required
                            min={getTodayDate()}
                            max="9999-12-31"
                            className="settings-input"
                          />
                          <small style={{ color: '#b0b0b0', display: 'block', marginTop: '5px' }}>
                            Min: Today • Max: 31st December 9999
                          </small>
                        </div>
                        
                        <button 
                          type="submit" 
                          disabled={updatingDate || !newDate}
                          className="btn-save-settings"
                        >
                          {updatingDate ? 'Updating...' : 'Update Symposium Date'}
                        </button>
                      </form>
                    </div>

                    {/* Update Venue Section */}
                    <div className="settings-card">
                      <h3>📍 Update Venue Details</h3>
                      <p className="current-setting">
                        Current Venue: <strong>{venue}</strong><br />
                        Current Details: <strong>{venueDetails}</strong>
                      </p>
                      
                      <form onSubmit={handleUpdateVenue}>
                        <div className="form-group">
                          <label htmlFor="newVenue">Venue Name</label>
                          <input
                            type="text"
                            id="newVenue"
                            value={newVenue}
                            onChange={(e) => setNewVenue(e.target.value)}
                            placeholder="Enter venue name"
                            className="settings-input"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label htmlFor="newVenueDetails">Venue Details</label>
                          <input
                            type="text"
                            id="newVenueDetails"
                            value={newVenueDetails}
                            onChange={(e) => setNewVenueDetails(e.target.value)}
                            placeholder="Enter venue details"
                            className="settings-input"
                          />
                        </div>
                        
                        <button 
                          type="submit" 
                          disabled={updatingVenue || (!newVenue && !newVenueDetails)}
                          className="btn-save-settings"
                        >
                          {updatingVenue ? 'Updating...' : 'Update Venue Details'}
                        </button>
                      </form>
                    </div>

                    {/* Update UPI ID Section */}
                    <div className="settings-card">
                      <h3>💰 Update UPI ID</h3>
                      <p className="current-setting">
                        Current UPI ID: <strong>{upiId}</strong>
                      </p>
                      
                      <form onSubmit={handleUpdateUpiId}>
                        <div className="form-group">
                          <label htmlFor="newUpiId">New UPI ID</label>
                          <input
                            type="text"
                            id="newUpiId"
                            value={newUpiId}
                            onChange={(e) => setNewUpiId(e.target.value)}
                            placeholder="Enter new UPI ID (e.g., 8098932041@ptsbi)"
                            className="settings-input"
                            required
                          />
                          <small style={{ color: '#b0b0b0', display: 'block', marginTop: '5px' }}>
                            Format: mobile number or username followed by @bank or @provider
                          </small>
                        </div>
                        
                        <button 
                          type="submit" 
                          disabled={updatingUpi || !newUpiId}
                          className="btn-save-settings"
                        >
                          {updatingUpi ? 'Updating...' : 'Update UPI ID'}
                        </button>
                      </form>
                    </div>

                    {/* Current Settings Summary */}
                    <div className="settings-summary">
                      <h3>Current Symposium Settings</h3>
                      <div className="summary-grid">
                        <div className="summary-item">
                          <span className="summary-label">Symposium Name:</span>
                          <span className="summary-value">{symposiumName}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Date:</span>
                          <span className="summary-value">{symposiumDate}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Venue:</span>
                          <span className="summary-value">{venue}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Venue Details:</span>
                          <span className="summary-value">{venueDetails}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">UPI ID:</span>
                          <span className="summary-value" style={{ fontSize: '0.9rem' }}>{upiId}</span>
                        </div>
                        <div className="summary-item">
                          <span className="summary-label">Registrations:</span>
                          <span className={`summary-value ${registrationsOpen ? 'open' : 'closed'}`}>
                            {registrationsOpen ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="table-container">
                      <table className="registrations-table">
                        <thead>
                          <tr>
                            {getTableHeaders().map(header => (
                              <th key={header}>{header}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {activeTab === 'participants' ? (
                            participants.length > 0 ? (
                              participants.map((p, i) => (
                                <tr key={i}>
                                  <td>{i + 1}</td>
                                  <td className="participant-name-cell">
                                    {p.name}
                                    {p.isTeamLead ? (
                                      <span className="lead-indicator">(Lead)</span>
                                    ) : (
                                      <span className="member-indicator">(Member)</span>
                                    )}
                                  </td>
                                  <td className="participant-mobile-cell">{p.mobile}</td>
                                  <td className="participant-event-cell">
                                    <span className="event-main">{p.eventName}</span>
                                    {p.eventSubName && (
                                      <span className="event-sub">📌 {p.eventSubName}</span>
                                    )}
                                  </td>
                                  <td className="participant-college-cell">{p.college}</td>
                                  <td className="participant-year-cell">{formatYear(p.year)}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="6" className="no-data">No participants found</td>
                              </tr>
                            )
                          ) : (
                            registrations.length > 0 ? (
                              registrations.map(reg => {
                                const safeReg = {
                                  _id: reg?._id,
                                  createdAt: reg?.createdAt,
                                  transactionId: reg?.transactionId || 'N/A',
                                  user: reg?.user || { name: 'N/A', email: '', phone: '', college: '' },
                                  event: reg?.event || { name: reg?.eventName || 'N/A', subEventName: '', category: '' },
                                  teamSize: reg?.teamSize || 1,
                                  totalAmount: reg?.totalAmount || 0,
                                  paymentStatus: reg?.paymentStatus || 'pending'
                                };

                                return (
                                  <tr key={safeReg._id}>
                                    <td>{safeReg.createdAt ? new Date(safeReg.createdAt).toLocaleDateString() : 'N/A'}</td>
                                    <td>
                                      <span className="transaction-id-full">{safeReg.transactionId}</span>
                                    </td>
                                    <td>
                                      <div className="user-info">
                                        <strong>{safeReg.user?.name || 'N/A'}</strong>
                                        <span className="user-email">{safeReg.user?.email || ''}</span>
                                        <span className="user-phone">{safeReg.user?.phone || ''}</span>
                                        <span className="user-college">{safeReg.user?.college || ''}</span>
                                      </div>
                                    </td>
                                    <td>
                                      <div className="event-info">
                                        <strong>{safeReg.event?.name || safeReg.eventName}</strong>
                                        {safeReg.event?.subEventName && (
                                          <span className="event-subname">📌 {safeReg.event.subEventName}</span>
                                        )}
                                        <span className="event-category">{safeReg.event?.category || ''}</span>
                                      </div>
                                    </td>
                                    <td>
                                      {safeReg.teamSize > 1 ? (
                                        <span className="team-size">{safeReg.teamSize} members</span>
                                      ) : (
                                        <span className="individual-tag">Individual</span>
                                      )}
                                    </td>
                                    <td className="amount">₹{safeReg.totalAmount}</td>
                                    <td>
                                      <span className={`status-badge ${getStatusBadgeClass(safeReg.paymentStatus)}`}>
                                        {getStatusText(safeReg.paymentStatus)}
                                      </span>
                                    </td>
                                    
                                    {activeTab === 'pending' && (
                                      <td>
                                        <div className="action-buttons">
                                          <button 
                                            onClick={() => handleStatusUpdate(safeReg._id, 'accepted')} 
                                            className="btn-accept" 
                                            disabled={processingId === safeReg._id}
                                            title="Accept"
                                          >
                                            {processingId === safeReg._id ? '⏳' : '✓'}
                                          </button>
                                          <button 
                                            onClick={() => handleStatusUpdate(safeReg._id, 'rejected')} 
                                            className="btn-reject" 
                                            disabled={processingId === safeReg._id}
                                            title="Reject"
                                          >
                                            {processingId === safeReg._id ? '⏳' : '✗'}
                                          </button>
                                          <button 
                                            onClick={() => viewParticipants(reg)} 
                                            className="btn-view" 
                                            title="View Team"
                                          >
                                            👥
                                          </button>
                                          <button 
                                            onClick={() => viewScreenshot(reg)} 
                                            className="btn-view" 
                                            title="View Screenshot"
                                            style={{ marginLeft: '5px' }}
                                          >
                                            👁️
                                          </button>
                                        </div>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={activeTab === 'pending' ? 8 : 7} className="no-data">
                                  No {activeTab} registrations found
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards View */}
                    <div className="mobile-cards-view">
                      {activeTab === 'participants' ? (
                        participants.length > 0 ? (
                          participants.map((p, i) => renderMobileParticipantCard(p, i))
                        ) : (
                          <div className="no-data">No participants found</div>
                        )
                      ) : (
                        registrations.length > 0 ? (
                          registrations.map(reg => renderMobileRegistrationCard(reg))
                        ) : (
                          <div className="no-data">No {activeTab} registrations found</div>
                        )
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Participants Modal */}
      {showParticipantsModal && selectedRegistration && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Team Members</h3>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="event-name-section">
                <span className="event-label">Event:</span>
                <span className="event-name">
                  {selectedRegistration.event?.name || selectedRegistration.eventName}
                </span>
                {selectedRegistration.event?.subEventName && (
                  <span className="event-subname">📌 {selectedRegistration.event.subEventName}</span>
                )}
              </div>
              <div className="college-year-section">
                <div className="info-row">
                  <span className="label">College:</span>
                  <span className="value">{selectedRegistration.user?.college || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span className="label">Year:</span>
                  <span className="value">{formatYear(selectedRegistration.user?.year)}</span>
                </div>
              </div>
              <div className="participants-list">
                {selectedRegistration.participants?.length > 0 ? 
                  selectedRegistration.participants.map((p, i) => (
                    <div key={i} className="participant-item">
                      <div className="participant-info">
                        <span className="participant-name">
                          {p.name}
                          {i === 0 && selectedRegistration.teamSize > 1 && (
                            <span className="participant-role"> (Lead)</span>
                          )}
                          {i > 0 && <span className="participant-role"> (Member)</span>}
                        </span>
                      </div>
                      <span className="participant-mobile">{p.phone}</span>
                    </div>
                  )) : 
                  <div className="participant-item">
                    <div className="participant-info">
                      <span className="participant-name">
                        {selectedRegistration.user?.name || 'N/A'}
                        <span className="participant-role"> (Lead)</span>
                      </span>
                    </div>
                    <span className="participant-mobile">{selectedRegistration.user?.phone || 'N/A'}</span>
                  </div>
                }
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={closeModal} className="btn-close">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Modal */}
      {showScreenshotModal && selectedScreenshot && (
        <div className="modal-overlay" onClick={closeScreenshotModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header">
              <h3>Payment Screenshot</h3>
              <button className="modal-close" onClick={closeScreenshotModal}>×</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
              <img 
                src={selectedScreenshot} 
                alt="Payment Screenshot" 
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px', border: '1px solid rgba(255, 215, 0, 0.2)' }} 
              />
            </div>
            <div className="modal-footer">
              <button onClick={closeScreenshotModal} className="btn-close">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Event Add/Edit Modal */}
      {showEventModal && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3>{editingEvent ? '📝 Edit Event' : '➕ Add New Event'}</h3>
              <button className="modal-close" onClick={() => setShowEventModal(false)}>×</button>
            </div>
            <form onSubmit={handleSaveEvent} className="add-event-form">
              <div className="modal-body" style={{ maxHeight: 'calc(90vh - 150px)', overflowY: 'auto' }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="eventName">Event Name *</label>
                    <input
                      type="text"
                      id="eventName"
                      value={newEvent.name}
                      onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                      placeholder="e.g. Presento"
                      className="settings-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="subEventName">Sub Event / Subtitle *</label>
                    <input
                      type="text"
                      id="subEventName"
                      value={newEvent.subEventName}
                      onChange={(e) => setNewEvent({ ...newEvent, subEventName: e.target.value })}
                      placeholder="e.g. Paper Presentation"
                      className="settings-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="coordinatorName">Coordinator Name</label>
                    <input
                      type="text"
                      id="coordinatorName"
                      value={newEvent.coordinatorName}
                      onChange={(e) => setNewEvent({ ...newEvent, coordinatorName: e.target.value })}
                      placeholder="e.g. Mr. Abul Kalam"
                      className="settings-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="coordinatorPhone">Coordinator Phone</label>
                    <input
                      type="text"
                      id="coordinatorPhone"
                      value={newEvent.coordinatorPhone}
                      onChange={(e) => setNewEvent({ ...newEvent, coordinatorPhone: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="settings-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="eventCategory">Category *</label>
                    <select
                      id="eventCategory"
                      value={newEvent.category}
                      onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                      className="settings-input"
                      required
                    >
                      <option value="Technical">Technical</option>
                      <option value="Non-Technical">Non-Technical</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="eventType">Type *</label>
                    <select
                      id="eventType"
                      value={newEvent.type}
                      onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                      className="settings-input"
                      required
                    >
                      <option value="Individual">Individual</option>
                      <option value="Team">Team</option>
                      <option value="Individual & Team">Individual & Team</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="minTeamSize">Min Team Size *</label>
                    <input
                      type="number"
                      id="minTeamSize"
                      value={newEvent.minTeamSize}
                      onChange={(e) => setNewEvent({ ...newEvent, minTeamSize: Number(e.target.value) })}
                      min="1"
                      className="settings-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="maxTeamSize">Max Team Size *</label>
                    <input
                      type="number"
                      id="maxTeamSize"
                      value={newEvent.maxTeamSize}
                      onChange={(e) => setNewEvent({ ...newEvent, maxTeamSize: Number(e.target.value) })}
                      min="1"
                      className="settings-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="eventFee">Registration Fee (₹) *</label>
                    <input
                      type="number"
                      id="eventFee"
                      value={newEvent.fee}
                      onChange={(e) => setNewEvent({ ...newEvent, fee: Number(e.target.value) })}
                      min="0"
                      className="settings-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="maxParticipants">Max Capacity / Seats *</label>
                    <input
                      type="number"
                      id="maxParticipants"
                      value={newEvent.maxParticipants}
                      onChange={(e) => setNewEvent({ ...newEvent, maxParticipants: Number(e.target.value) })}
                      min="1"
                      className="settings-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="startTime">Start Time</label>
                    <input
                      type="text"
                      id="startTime"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      placeholder="e.g. 10:00 AM"
                      className="settings-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="endTime">End Time</label>
                    <input
                      type="text"
                      id="endTime"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      placeholder="e.g. 12:30 PM"
                      className="settings-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="eventVenue">Venue</label>
                    <input
                      type="text"
                      id="eventVenue"
                      value={newEvent.venue}
                      onChange={(e) => setNewEvent({ ...newEvent, venue: e.target.value })}
                      placeholder="e.g. Seminar Hall - Main Block"
                      className="settings-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="eventStatus">Status *</label>
                    <select
                      id="eventStatus"
                      value={newEvent.status}
                      onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value })}
                      className="settings-input"
                      required
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Ongoing">Ongoing</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="eventImage">Image Filename *</label>
                    <input
                      type="text"
                      id="eventImage"
                      value={newEvent.image}
                      onChange={(e) => setNewEvent({ ...newEvent, image: e.target.value })}
                      placeholder="e.g. paper-presentation.jpg"
                      className="settings-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="prizeFirst">First Prize</label>
                    <input
                      type="text"
                      id="prizeFirst"
                      value={newEvent.prizes.first}
                      onChange={(e) => setNewEvent({ 
                        ...newEvent, 
                        prizes: { ...newEvent.prizes, first: e.target.value } 
                      })}
                      placeholder="e.g. ₹3,000 + Certificate"
                      className="settings-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="prizeSecond">Second Prize</label>
                    <input
                      type="text"
                      id="prizeSecond"
                      value={newEvent.prizes.second}
                      onChange={(e) => setNewEvent({ 
                        ...newEvent, 
                        prizes: { ...newEvent.prizes, second: e.target.value } 
                      })}
                      placeholder="e.g. ₹2,000 + Certificate"
                      className="settings-input"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="prizeThird">Third Prize</label>
                    <input
                      type="text"
                      id="prizeThird"
                      value={newEvent.prizes.third}
                      onChange={(e) => setNewEvent({ 
                        ...newEvent, 
                        prizes: { ...newEvent.prizes, third: e.target.value } 
                      })}
                      placeholder="e.g. ₹1,000 + Certificate"
                      className="settings-input"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label>Requirements</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <input
                        type="text"
                        value={tempRequirement}
                        onChange={(e) => setTempRequirement(e.target.value)}
                        placeholder="Add requirement (e.g. Research Paper (4-6 pages))"
                        className="settings-input"
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="button" 
                        onClick={addRequirement}
                        className="btn-close"
                        style={{ padding: '0 20px', whiteSpace: 'nowrap' }}
                      >
                        Add
                      </button>
                    </div>
                    {newEvent.requirements && newEvent.requirements.length > 0 && (
                      <div className="mobile-participants" style={{ background: 'rgba(255, 215, 0, 0.05)', padding: '10px', borderRadius: '8px' }}>
                        {newEvent.requirements.map((req, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,215,0,0.1)' }}>
                            <span style={{ color: '#ffffff', fontSize: '0.85rem' }}>• {req}</span>
                            <button 
                              type="button" 
                              onClick={() => removeRequirement(idx)}
                              style={{ background: 'transparent', border: 'none', color: '#ff4757', cursor: 'pointer', fontSize: '1rem', marginLeft: 'auto' }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group full-width">
                    <label>Rules & Guidelines</label>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                      <input
                        type="text"
                        value={tempRule}
                        onChange={(e) => setTempRule(e.target.value)}
                        placeholder="Add rule (e.g. Maximum 10 minutes presentation time)"
                        className="settings-input"
                        style={{ flex: 1 }}
                      />
                      <button 
                        type="button" 
                        onClick={addRule}
                        className="btn-close"
                        style={{ padding: '0 20px', whiteSpace: 'nowrap' }}
                      >
                        Add
                      </button>
                    </div>
                    {newEvent.rules && newEvent.rules.length > 0 && (
                      <div className="mobile-participants" style={{ background: 'rgba(255, 215, 0, 0.05)', padding: '10px', borderRadius: '8px' }}>
                        {newEvent.rules.map((rule, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,215,0,0.1)' }}>
                            <span style={{ color: '#ffffff', fontSize: '0.85rem' }}>• {rule}</span>
                            <button 
                              type="button" 
                              onClick={() => removeRule(idx)}
                              style={{ background: 'transparent', border: 'none', color: '#ff4757', cursor: 'pointer', fontSize: '1rem', marginLeft: 'auto' }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="eventDescription">Description *</label>
                    <textarea
                      id="eventDescription"
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      placeholder="Enter event details, rules, and guidelines"
                      className="settings-input"
                      rows="3"
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowEventModal(false)} className="btn-close" style={{ marginRight: '10px', border: '1px solid #ff4757', color: '#ff4757' }}>Cancel</button>
                <button type="submit" disabled={creatingEvent} className="btn-close">
                  {creatingEvent ? 'Saving...' : 'Save Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;