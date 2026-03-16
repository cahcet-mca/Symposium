// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const {
  adminLogin,
  getPendingRegistrations,
  getAllRegistrations,
  updateRegistrationStatus,
  getAdminStats,
  verifySession
} = require('../controllers/adminController');

const {
  getSettings,
  toggleRegistrations
} = require('../controllers/systemSettingsController');

const { adminAuth } = require('../middleware/adminMiddleware');

// ============================================
// PUBLIC ROUTES (No Auth Required)
// ============================================

/**
 * @route   POST /api/admin/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/login', adminLogin);

// ============================================
// PROTECTED ROUTES (Admin Auth Required)
// ============================================

/**
 * @route   GET /api/admin/verify-session
 * @desc    Verify admin session
 * @access  Private/Admin
 */
router.get('/verify-session', adminAuth, verifySession);

/**
 * @route   GET /api/admin/settings
 * @desc    Get system settings
 * @access  Private/Admin
 */
router.get('/settings', adminAuth, getSettings);

/**
 * @route   PUT /api/admin/settings/toggle-registrations
 * @desc    Toggle registrations open/closed
 * @access  Private/Admin
 */
router.put('/settings/toggle-registrations', adminAuth, toggleRegistrations);

/**
 * @route   GET /api/admin/pending-registrations
 * @desc    Get all pending registrations
 * @access  Private/Admin
 */
router.get('/pending-registrations', adminAuth, getPendingRegistrations);

/**
 * @route   GET /api/admin/registrations
 * @desc    Get all registrations (filtered by status)
 * @access  Private/Admin
 */
router.get('/registrations', adminAuth, getAllRegistrations);

/**
 * @route   PUT /api/admin/registrations/:id/status
 * @desc    Update registration status (accept/reject)
 * @access  Private/Admin
 */
router.put('/registrations/:id/status', adminAuth, updateRegistrationStatus);

/**
 * @route   GET /api/admin/stats
 * @desc    Get admin statistics
 * @access  Private/Admin
 */
router.get('/stats', adminAuth, getAdminStats);

module.exports = router;