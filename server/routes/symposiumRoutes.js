// routes/symposiumRoutes.js
const express = require('express');
const router = express.Router();
const {
  getSymposiumSettings,
  updateSymposiumDate,
  updateSymposiumVenue
} = require('../controllers/symposiumController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { adminAuth } = require('../middleware/adminMiddleware');

// Public route
router.get('/settings', getSymposiumSettings);

// Admin only routes
router.put('/date', protect, authorize('admin'), updateSymposiumDate);
router.put('/venue', protect, authorize('admin'), updateSymposiumVenue);

// Alternative admin auth
router.put('/admin/date', adminAuth, updateSymposiumDate);
router.put('/admin/venue', adminAuth, updateSymposiumVenue);

module.exports = router;