const express = require('express');
const router = express.Router();
const {
  adminLogin,
  getAllRegistrations,
  updateRegistrationStatus,
  getAdminStats,
  verifySession,
  promoteFromWaitlist
} = require('../controllers/adminController');

const {
  getSettings,
  toggleRegistrations
} = require('../controllers/systemSettingsController');

const { adminAuth } = require('../middleware/adminMiddleware');

// ============================================
// PUBLIC ROUTES
// ============================================

router.post('/login', adminLogin);

// ============================================
// PROTECTED ROUTES
// ============================================

router.get('/verify-session', adminAuth, verifySession);
router.get('/settings', adminAuth, getSettings);
router.put('/settings/toggle-registrations', adminAuth, toggleRegistrations);
router.get('/registrations', adminAuth, getAllRegistrations);
router.put('/registrations/:id/status', adminAuth, updateRegistrationStatus);
router.get('/stats', adminAuth, getAdminStats);
router.post('/events/:eventId/promote-waitlist', adminAuth, promoteFromWaitlist);

module.exports = router;