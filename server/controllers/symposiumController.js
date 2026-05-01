const SymposiumSettings = require('../models/SymposiumSettings');

// @desc    Get symposium settings
// @route   GET /api/symposium/settings
// @access  Public
const getSymposiumSettings = async (req, res) => {
  try {
    const settings = await SymposiumSettings.getSettings();
    
    res.json({
      success: true,
      data: {
        symposiumDate: settings.symposiumDate,
        formattedDate: settings.getFormattedDate(),
        symposiumName: settings.symposiumName,
        venue: settings.venue,
        venueDetails: settings.venueDetails,
        upiId: settings.upiId,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    console.error('❌ Error getting symposium settings:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update symposium date (admin only)
// @route   PUT /api/symposium/date
// @access  Private/Admin
const updateSymposiumDate = async (req, res) => {
  try {
    const { date } = req.body;
    const updatedBy = req.admin?.id || req.user?._id || 'admin';
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a date'
      });
    }
    
    const settings = await SymposiumSettings.updateDate(date, updatedBy.toString());
    
    res.json({
      success: true,
      message: 'Symposium date updated successfully',
      data: {
        symposiumDate: settings.symposiumDate,
        formattedDate: settings.getFormattedDate()
      }
    });
  } catch (error) {
    console.error('❌ Error updating symposium date:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update symposium name (admin only)
// @route   PUT /api/symposium/name
// @access  Private/Admin
const updateSymposiumName = async (req, res) => {
  try {
    const { name } = req.body;
    const updatedBy = req.admin?.id || req.user?._id || 'admin';
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a symposium name'
      });
    }
    
    const settings = await SymposiumSettings.updateName(name.trim(), updatedBy.toString());
    
    res.json({
      success: true,
      message: 'Symposium name updated successfully',
      data: {
        symposiumName: settings.symposiumName
      }
    });
  } catch (error) {
    console.error('❌ Error updating symposium name:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update symposium venue (admin only)
// @route   PUT /api/symposium/venue
// @access  Private/Admin
const updateSymposiumVenue = async (req, res) => {
  try {
    const { venue, venueDetails } = req.body;
    const updatedBy = req.admin?.id || req.user?._id || 'admin';
    
    const settings = await SymposiumSettings.getSettings();
    
    if (venue) settings.venue = venue;
    if (venueDetails) settings.venueDetails = venueDetails;
    
    settings.updatedBy = updatedBy;
    settings.updatedAt = new Date();
    
    await settings.save();
    
    res.json({
      success: true,
      message: 'Symposium venue updated successfully',
      data: {
        venue: settings.venue,
        venueDetails: settings.venueDetails
      }
    });
  } catch (error) {
    console.error('❌ Error updating symposium venue:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update symposium UPI ID (admin only)
// @route   PUT /api/symposium/upi-id
// @access  Private/Admin
const updateSymposiumUpiId = async (req, res) => {
  try {
    const { upiId } = req.body;
    const updatedBy = req.admin?.id || req.user?._id || 'admin';
    
    if (!upiId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a UPI ID'
      });
    }

    // Basic UPI ID validation
    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    if (!upiRegex.test(upiId)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid UPI ID (e.g., 8098932041@ptsbi)'
      });
    }
    
    const settings = await SymposiumSettings.updateUpiId(upiId, updatedBy.toString());
    
    res.json({
      success: true,
      message: 'UPI ID updated successfully',
      data: {
        upiId: settings.upiId
      }
    });
  } catch (error) {
    console.error('❌ Error updating UPI ID:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getSymposiumSettings,
  updateSymposiumDate,
  updateSymposiumName,
  updateSymposiumVenue,
  updateSymposiumUpiId
};