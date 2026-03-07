const express = require('express');
const router = express.Router();
const {
  adminLogin,
  getPendingRegistrations,
  getAllRegistrations,
  updateRegistrationStatus,
  getAdminStats
} = require('../controllers/adminController');

const {
  getSettings,
  toggleRegistrations
} = require('../controllers/systemSettingsController');

const { adminAuth } = require('../middleware/adminMiddleware');

// Public route
router.post('/login', adminLogin);

// Settings routes
router.get('/settings', adminAuth, getSettings);
router.put('/settings/toggle-registrations', adminAuth, toggleRegistrations);

// Protected routes (require admin authentication)
router.get('/pending-registrations', adminAuth, getPendingRegistrations);
router.get('/registrations', adminAuth, getAllRegistrations);
router.put('/registrations/:id/status', adminAuth, updateRegistrationStatus);
router.get('/stats', adminAuth, getAdminStats);

module.exports = router;