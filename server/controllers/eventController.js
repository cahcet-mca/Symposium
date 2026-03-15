// controllers/eventController.js
const Event = require('../models/Event');
const Registration = require('../models/Registration');

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
    // Handle image - just store the filename
    if (req.body.image) {
      // Ensure it's just a filename, not a path
      const filename = req.body.image.split('/').pop();
      req.body.image = filename;
    }
    
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

    // Handle image update - store just filename
    if (req.body.image) {
      const filename = req.body.image.split('/').pop();
      req.body.image = filename;
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

// @desc    Update event image only
// @route   PUT /api/events/:id/image
// @access  Private/Admin
const updateEventImage = async (req, res) => {
  try {
    const { image } = req.body;
    
    // Store just the filename
    const filename = image.split('/').pop();
    
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { image: filename },
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

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

    // Return the event with the real count
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

// @desc    Get events by category
// @route   GET /api/events/category/:category
// @access  Public
const getEventsByCategory = async (req, res) => {
  try {
    const events = await Event.find({ 
      category: req.params.category 
    }).sort({ startTime: 1 });
    
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

// @desc    Get featured events
// @route   GET /api/events/featured
// @access  Public
const getFeaturedEvents = async (req, res) => {
  try {
    // Get 4 random events
    const events = await Event.aggregate([
      { $sample: { size: 4 } }
    ]);
    
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

// @desc    Debug event counts
// @route   GET /api/events/debug/counts
// @access  Public
const debugEventCounts = async (req, res) => {
  try {
    const events = await Event.find({}).select('name registeredCount maxParticipants image');
    
    const result = [];
    
    for (const event of events) {
      const actualCount = await Registration.countDocuments({
        event: event._id,
        paymentStatus: 'verified'
      });
      
      result.push({
        eventId: event._id,
        eventName: event.name,
        image: event.image,
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
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Sync event counts with actual registrations
// @route   POST /api/events/admin/sync-counts
// @access  Private/Admin
const syncEventCounts = async (req, res) => {
  try {
    const events = await Event.find({});
    const summary = [];
    
    for (const event of events) {
      const actualCount = await Registration.countDocuments({
        event: event._id,
        paymentStatus: 'verified'
      });
      
      if (event.registeredCount !== actualCount) {
        event.registeredCount = actualCount;
        await event.save();
        summary.push({
          eventName: event.name,
          oldCount: event.registeredCount,
          newCount: actualCount,
          updated: true
        });
      } else {
        summary.push({
          eventName: event.name,
          count: actualCount,
          updated: false
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Event counts synced successfully',
      summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get events by date
// @route   GET /api/events/date/:date
// @access  Public
const getEventsByDate = async (req, res) => {
  try {
    const { date } = req.params;
    
    // Parse the date (format: YYYY-MM-DD)
    const queryDate = new Date(date);
    
    // Check if date is valid
    if (isNaN(queryDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD'
      });
    }
    
    // Get start and end of the day
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Find events on this date
    const events = await Event.find({
      eventDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).sort({ startTime: 1 });
    
    res.json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    console.error('Error fetching events by date:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventWithRealCount,
  updateEventImage,
  getEventsByCategory,
  getFeaturedEvents,
  debugEventCounts,
  syncEventCounts,
  getEventsByDate
};