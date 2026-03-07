const SystemSettings = require('../models/SystemSettings');

// @desc    Get current system settings
// @route   GET /api/admin/settings
// @access  Private/Admin
const getSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Toggle registrations open/closed
// @route   PUT /api/admin/settings/toggle-registrations
// @access  Private/Admin
const toggleRegistrations = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();
    
    settings.registrationsOpen = !settings.registrationsOpen;
    settings.updatedBy = req.admin?.id || req.user?._id;
    settings.updatedAt = new Date();
    
    await settings.save();
    
    console.log(`🔄 Registrations toggled to: ${settings.registrationsOpen ? 'OPEN' : 'CLOSED'}`);
    
    res.json({
      success: true,
      message: `Registrations are now ${settings.registrationsOpen ? 'OPEN' : 'CLOSED'}`,
      data: settings
    });
  } catch (error) {
    console.error('Error toggling registrations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getSettings,
  toggleRegistrations
};