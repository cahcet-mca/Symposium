const SystemSettings = require('../models/SystemSettings');

// @desc    Get current system settings
// @route   GET /api/admin/settings
// @access  Public (for checking status) / Private (for admin)
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
    // Get admin ID from token (if available)
    const updatedBy = req.admin?.id || req.user?._id || null;
    
    // Toggle registrations
    const settings = await SystemSettings.toggleRegistrations(updatedBy);
    
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
      message: 'Failed to toggle registration status',
      error: error.message
    });
  }
};

// @desc    Force set registrations status (admin only)
// @route   PUT /api/admin/settings/set-registrations
// @access  Private/Admin
const setRegistrations = async (req, res) => {
  try {
    const { open } = req.body;
    
    if (typeof open !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a boolean value for "open"'
      });
    }
    
    const settings = await SystemSettings.getSettings();
    
    settings.registrationsOpen = open;
    settings.updatedBy = req.admin?.id || req.user?._id || null;
    settings.updatedAt = new Date();
    
    await settings.save();
    
    console.log(`🎯 Registrations manually set to: ${settings.registrationsOpen ? 'OPEN' : 'CLOSED'}`);
    
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
    console.error('❌ Error setting registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to set registration status',
      error: error.message
    });
  }
};

module.exports = {
  getSettings,
  toggleRegistrations,
  setRegistrations
};