const Event = require('../models/Event');

// @desc    Get all events
// @route   GET /api/events
// @access  Public
const getEvents = async (req, res) => {
  try {
    const { category, type, search } = req.query;
    let query = {};

    // Filter by category
    if (category && category !== 'All') {
      query.category = category;
    }

    // Filter by type
    if (type && type !== 'All') {
      query.type = type;
    }

    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const events = await Event.find(query).sort({ startTime: 1 });
    
    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
const getEventById = async (req, res) => {
  try {
    console.log('Getting event with ID:', req.params.id);
    
    const event = await Event.findById(req.params.id);

    if (!event) {
      console.log('Event not found with ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    console.log('Event found:', event.name);
    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create new event
// @route   POST /api/events
// @access  Private/Admin
const createEvent = async (req, res) => {
  try {
    const event = await Event.create(req.body);
    
    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private/Admin
const updateEvent = async (req, res) => {
  try {
    let event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private/Admin
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    await event.deleteOne();

    res.json({
      success: true,
      message: 'Event removed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get event with real registration count
// @route   GET /api/events/:id/with-count
// @access  Public
const getEventWithRealCount = async (req, res) => {
  try {
    console.log('Getting event with real count for ID:', req.params.id);
    
    const Event = require('../models/Event');
    const Registration = require('../models/Registration');
    
    const event = await Event.findById(req.params.id);

    if (!event) {
      console.log('Event not found with ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Get the actual count of verified registrations for this event
    const actualRegisteredCount = await Registration.countDocuments({
      event: event._id,
      paymentStatus: 'verified'
    });

    console.log(`Event: ${event.name}`);
    console.log(`Event.registeredCount field: ${event.registeredCount}`);
    console.log(`Actual verified registrations: ${actualRegisteredCount}`);

    // If they don't match, update the event
    if (event.registeredCount !== actualRegisteredCount) {
      console.log('⚠️ Count mismatch! Updating event...');
      event.registeredCount = actualRegisteredCount;
      await event.save();
      console.log(`✅ Event count updated to ${actualRegisteredCount}`);
    }

    res.json({
      success: true,
      data: {
        ...event.toObject(),
        registeredCount: actualRegisteredCount // Always return the real count
      }
    });

  } catch (error) {
    console.error('Error getting event with real count:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add this after getEventWithRealCount function (around line 176)
const debugEventCounts = async (req, res) => {
  try {
    const Event = require('../models/Event');
    const Registration = require('../models/Registration');
    
    const events = await Event.find({}).select('name registeredCount maxParticipants');
    
    const result = [];
    
    for (const event of events) {
      const actualCount = await Registration.countDocuments({
        event: event._id,
        paymentStatus: 'verified'
      });
      
      result.push({
        eventId: event._id,
        eventName: event.name,
        storedCount: event.registeredCount,
        actualCount: actualCount,
        maxParticipants: event.maxParticipants,
        match: event.registeredCount === actualCount,
        percentage: Math.round((actualCount / event.maxParticipants) * 100) + '%'
      });
    }
    
    res.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Error in debugEventCounts:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Make sure to export it
module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventWithRealCount
};