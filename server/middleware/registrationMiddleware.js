const SystemSettings = require('../models/SystemSettings');

const checkRegistrationsOpen = async (req, res, next) => {
  try {
    // Skip check for admin routes
    if (req.path.includes('/admin')) {
      return next();
    }

    // ✅ ALLOW GET REQUESTS - Users should still view their existing registrations
    if (req.method === 'GET') {
      return next();
    }

    const settings = await SystemSettings.findOne();
    
    // If settings don't exist, create with default (open)
    if (!settings) {
      await SystemSettings.create({ registrationsOpen: true });
      return next();
    }

    // Check if registrations are open only for POST/PUT/DELETE operations
    if (!settings.registrationsOpen) {
      return res.status(403).json({
        success: false,
        message: 'Online registration is finished. Only on-time registration is available at the venue.',
        registrationsClosed: true
      });
    }

    next();
  } catch (error) {
    console.error('Error checking registration status:', error);
    next();
  }
};

module.exports = { checkRegistrationsOpen };