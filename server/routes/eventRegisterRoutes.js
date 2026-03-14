const express = require('express');
const router = express.Router();
const {
  getUserEventRegisters,
  getEventRegisterById,
  getAllEventRegisters
} = require('../controllers/eventRegisterController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protected routes
router.get('/my-registers', protect, getUserEventRegisters);
router.get('/:id', protect, getEventRegisterById);

// Admin only routes
router.get('/admin/all', protect, authorize('admin'), getAllEventRegisters);

module.exports = router;