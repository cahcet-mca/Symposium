const express = require('express');
const router = express.Router();
const {
  adminLogin,
  getPendingRegistrations,
  getAllRegistrations,
  updateRegistrationStatus,
  getAdminStats
} = require('../controllers/adminController');
const { adminAuth } = require('../middleware/adminMiddleware');

// Public route
router.post('/login', adminLogin);

// Protected routes (require admin authentication)
router.get('/pending-registrations', adminAuth, getPendingRegistrations);
router.get('/registrations', adminAuth, getAllRegistrations);
router.put('/registrations/:id/status', adminAuth, updateRegistrationStatus);
router.get('/stats', adminAuth, getAdminStats);

module.exports = router;