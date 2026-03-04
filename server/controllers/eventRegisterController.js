const EventRegister = require('../models/EventRegister');

// Get all event registers for a user
const getUserEventRegisters = async (req, res) => {
  try {
    const eventRegisters = await EventRegister.find({ 
      userId: req.user._id 
    }).sort('-timestamp');

    res.json({
      success: true,
      count: eventRegisters.length,
      data: eventRegisters
    });
  } catch (error) {
    console.error('Error fetching event registers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get event register by ID
const getEventRegisterById = async (req, res) => {
  try {
    const eventRegister = await EventRegister.findById(req.params.id);

    if (!eventRegister) {
      return res.status(404).json({
        success: false,
        message: 'Event register not found'
      });
    }

    // Check if user is authorized
    if (eventRegister.userId.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this record'
      });
    }

    res.json({
      success: true,
      data: eventRegister
    });
  } catch (error) {
    console.error('Error fetching event register:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all event registers (admin only)
const getAllEventRegisters = async (req, res) => {
  try {
    const eventRegisters = await EventRegister.find()
      .populate('userId', 'name email')
      .populate('eventId', 'name category')
      .sort('-timestamp');

    res.json({
      success: true,
      count: eventRegisters.length,
      data: eventRegisters
    });
  } catch (error) {
    console.error('Error fetching all event registers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getUserEventRegisters,
  getEventRegisterById,
  getAllEventRegisters
};