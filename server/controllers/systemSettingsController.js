const SystemSettings = require('../models/SystemSettings');

// @desc    Get current system settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    
    res.json({
      success: true,
      data: {
        registrationsOpen: settings.registrationsOpen,
        updatedAt: settings.updatedAt,
        updatedBy: settings.updatedBy
      }
    });
  } catch (error) {
    console.error('❌ Error getting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system settings',
      error: error.message
    });
  }
};

// @desc    Toggle registrations open/closed
// @route   PUT /api/admin/settings/toggle-registrations
// @access  Private/Admin
const toggleRegistrations = async (req, res) => {
  try {
    console.log('🔄 Toggle registrations called by admin');
    
    // Get admin identifier - use "admin" as string
    const updatedBy = req.admin?.id || req.user?._id || 'admin';
    
    // Get current settings and toggle
    const settings = await SystemSettings.toggleRegistrations(updatedBy.toString());
    
    res.json({
      success: true,
      message: `Registrations are now ${settings.registrationsOpen ? 'OPEN' : 'CLOSED'}`,
      data: {
        registrationsOpen: settings.registrationsOpen,
        updatedAt: settings.updatedAt,
        updatedBy: settings.updatedBy
      }
    });
  } catch (error) {
    console.error('❌ Error toggling registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle registration status: ' + error.message,
      error: error.message
    });
  }
};

// @desc    Public endpoint to check registration status (no auth required)
// @route   GET /api/settings/registrations-status
// @access  Public
const getPublicRegistrationStatus = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    
    res.json({
      success: true,
      data: {
        registrationsOpen: settings.registrationsOpen
      }
    });
  } catch (error) {
    console.error('❌ Error getting public settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get registration status',
      error: error.message
    });
  }
};

module.exports = {
  getSettings,
  toggleRegistrations,
  getPublicRegistrationStatus
};