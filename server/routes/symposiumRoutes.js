const express = require('express');
const router = express.Router();
const {
  getSymposiumSettings,
  updateSymposiumDate,
  updateSymposiumName,
  updateSymposiumVenue,
  updateSymposiumUpiId
} = require('../controllers/symposiumController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { adminAuth } = require('../middleware/adminMiddleware');

// Public route
router.get('/settings', getSymposiumSettings);

// Admin only routes
router.put('/date', protect, authorize('admin'), updateSymposiumDate);
router.put('/name', protect, authorize('admin'), updateSymposiumName);
router.put('/venue', protect, authorize('admin'), updateSymposiumVenue);
router.put('/upi-id', protect, authorize('admin'), updateSymposiumUpiId);

// Alternative admin auth
router.put('/admin/date', adminAuth, updateSymposiumDate);
router.put('/admin/name', adminAuth, updateSymposiumName);
router.put('/admin/venue', adminAuth, updateSymposiumVenue);
router.put('/admin/upi-id', adminAuth, updateSymposiumUpiId);

module.exports = router;