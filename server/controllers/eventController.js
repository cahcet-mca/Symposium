const Event = require('../models/Event');
const Registration = require('../models/Registration');

// @desc    Get all events
// @route   GET /api/events
// @access  Public
const getEvents = async (req, res) => {
  try {
    const { category, type, search } = req.query;
    let query = {};

    if (category && category !== 'All') {
      query.category = category;
    }
    if (type && type !== 'All') {
      query.type = type;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const events = await Event.find(query).sort({ startTime: 1 });
    
    const enrichedEvents = await Promise.all(events.map(async (event) => {
      const confirmedCount = await Registration.countDocuments({
        event: event._id,
        paymentStatus: 'verified'
      });
      const pendingCount = await Registration.countDocuments({
        event: event._id,
        paymentStatus: 'pending'
      });
      
      return {
        ...event.toObject(),
        confirmedCount: confirmedCount,
        pendingCount: pendingCount,
        totalRegistrations: confirmedCount + pendingCount,
        isFull: confirmedCount >= event.maxParticipants,
        waitlistCount: pendingCount
      };
    }));
    
    res.json({
      success: true,
      count: enrichedEvents.length,
      data: enrichedEvents
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
    const event = await Event.findById(req.params.id);

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

// @desc    Create new event
// @route   POST /api/events
// @access  Private/Admin
const createEvent = async (req, res) => {
  try {
    if (req.body.image) {
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

// @desc    Get event with real registration count (with waitlist)
// @route   GET /api/events/:id/with-count
// @access  Public
const getEventWithRealCount = async (req, res) => {
  try {
    console.log('Getting event with real count for ID:', req.params.id);
    
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const confirmedCount = await Registration.countDocuments({
      event: event._id,
      paymentStatus: 'verified'
    });
    
    const pendingCount = await Registration.countDocuments({
      event: event._id,
      paymentStatus: 'pending'
    });
    
    const rejectedCount = await Registration.countDocuments({
      event: event._id,
      paymentStatus: 'rejected'
    });

    console.log(`Event: ${event.name}`);
    console.log(`  Confirmed: ${confirmedCount}`);
    console.log(`  Pending (Waitlist): ${pendingCount}`);
    console.log(`  Rejected: ${rejectedCount}`);

    let needsSave = false;
    if (event.confirmedCount !== confirmedCount) {
      event.confirmedCount = confirmedCount;
      needsSave = true;
    }
    if (event.pendingCount !== pendingCount) {
      event.pendingCount = pendingCount;
      needsSave = true;
    }
    if (event.rejectedCount !== rejectedCount) {
      event.rejectedCount = rejectedCount;
      needsSave = true;
    }
    
    if (needsSave) {
      await event.save();
      console.log(`✅ Event counts updated`);
    }

    const statusInfo = event.getStatusInfo();
    const isFull = confirmedCount >= event.maxParticipants;
    const isWaitlistFull = pendingCount >= (event.maxWaitlist || 50);
    
    res.json({
      success: true,
      data: {
        ...event.toObject(),
        confirmedCount: confirmedCount,
        pendingCount: pendingCount,
        rejectedCount: rejectedCount,
        totalRegistrations: confirmedCount + pendingCount,
        availableSpots: event.maxParticipants - confirmedCount,
        waitlistAvailable: (event.maxWaitlist || 50) - pendingCount,
        isFull: isFull,
        isWaitlistFull: isWaitlistFull,
        statusInfo: statusInfo
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

// @desc    Get event waitlist status
// @route   GET /api/events/:id/waitlist-status
// @access  Public
const getEventWaitlistStatus = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    const confirmedCount = await Registration.countDocuments({
      event: event._id,
      paymentStatus: 'verified'
    });
    
    const pendingCount = await Registration.countDocuments({
      event: event._id,
      paymentStatus: 'pending'
    });
    
    const statusInfo = {
      eventId: event._id,
      eventName: event.name,
      maxParticipants: event.maxParticipants,
      maxWaitlist: event.maxWaitlist || 50,
      confirmedCount: confirmedCount,
      pendingCount: pendingCount,
      totalRegistrations: confirmedCount + pendingCount,
      availableSpots: event.maxParticipants - confirmedCount,
      waitlistAvailable: (event.maxWaitlist || 50) - pendingCount,
      isFull: confirmedCount >= event.maxParticipants,
      isWaitlistFull: pendingCount >= (event.maxWaitlist || 50),
      registrationStatus: confirmedCount >= event.maxParticipants ? 'waitlist' : 'open'
    };
    
    res.json({
      success: true,
      data: statusInfo
    });
  } catch (error) {
    console.error('Error fetching waitlist status:', error);
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
      const confirmedCount = await Registration.countDocuments({
        event: event._id,
        paymentStatus: 'verified'
      });
      const pendingCount = await Registration.countDocuments({
        event: event._id,
        paymentStatus: 'pending'
      });
      
      result.push({
        eventId: event._id,
        eventName: event.name,
        image: event.image,
        storedCount: event.registeredCount,
        confirmedCount: confirmedCount,
        pendingCount: pendingCount,
        maxParticipants: event.maxParticipants,
        match: event.registeredCount === confirmedCount,
        percentage: Math.round((confirmedCount / event.maxParticipants) * 100) + '%'
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
      const confirmedCount = await Registration.countDocuments({
        event: event._id,
        paymentStatus: 'verified'
      });
      const pendingCount = await Registration.countDocuments({
        event: event._id,
        paymentStatus: 'pending'
      });
      
      let updated = false;
      if (event.confirmedCount !== confirmedCount) {
        event.confirmedCount = confirmedCount;
        updated = true;
      }
      if (event.pendingCount !== pendingCount) {
        event.pendingCount = pendingCount;
        updated = true;
      }
      
      if (updated) {
        await event.save();
        summary.push({
          eventName: event.name,
          confirmedCount: confirmedCount,
          pendingCount: pendingCount,
          updated: true
        });
      } else {
        summary.push({
          eventName: event.name,
          confirmedCount: confirmedCount,
          pendingCount: pendingCount,
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
  getEventWaitlistStatus
};