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
      try {
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
          isFull: confirmedCount >= (event.maxParticipants || 0),
          waitlistCount: pendingCount
        };
      } catch (err) {
        console.error(`Error enriching event ${event.name}:`, err.message);
        return {
          ...event.toObject(),
          confirmedCount: event.registeredCount || 0,
          pendingCount: 0,
          totalRegistrations: event.registeredCount || 0,
          isFull: false,
          waitlistCount: 0
        };
      }
    }));
    
    res.json({
      success: true,
      count: enrichedEvents.length,
      data: enrichedEvents
    });
  } catch (error) {
    console.error('Error in getEvents:', error);
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
    console.error('Error in getEventById:', error);
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
    
    // Set default values for waitlist fields
    req.body.confirmedCount = 0;
    req.body.pendingCount = 0;
    req.body.rejectedCount = 0;
    req.body.maxWaitlist = req.body.maxWaitlist || 50;
    req.body.registeredCount = 0;
    
    const event = await Event.create(req.body);
    
    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Error in createEvent:', error);
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
    console.error('Error in updateEvent:', error);
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
    console.error('Error in deleteEvent:', error);
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
    const eventId = req.params.id;
    console.log('🔍 Getting event with real count for ID:', eventId);
    
    // Validate ObjectId format
    if (!eventId || eventId.length !== 24) {
      console.log('❌ Invalid event ID format:', eventId);
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }
    
    const event = await Event.findById(eventId);

    if (!event) {
      console.log('❌ Event not found with ID:', eventId);
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Safely get registration counts with error handling
    let confirmedCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    
    try {
      confirmedCount = await Registration.countDocuments({
        event: event._id,
        paymentStatus: 'verified'
      });
      
      pendingCount = await Registration.countDocuments({
        event: event._id,
        paymentStatus: 'pending'
      });
      
      rejectedCount = await Registration.countDocuments({
        event: event._id,
        paymentStatus: 'rejected'
      });
    } catch (countError) {
      console.error('Error counting registrations:', countError.message);
      // Use fallback values from event document
      confirmedCount = event.confirmedCount || 0;
      pendingCount = event.pendingCount || 0;
      rejectedCount = event.rejectedCount || 0;
    }

    console.log(`📊 Event: ${event.name}`);
    console.log(`   Confirmed: ${confirmedCount}`);
    console.log(`   Pending (Waitlist): ${pendingCount}`);
    console.log(`   Rejected: ${rejectedCount}`);

    // Safely update event counts if needed
    let needsSave = false;
    const currentConfirmed = event.confirmedCount || 0;
    const currentPending = event.pendingCount || 0;
    const currentRejected = event.rejectedCount || 0;
    
    if (currentConfirmed !== confirmedCount) {
      event.confirmedCount = confirmedCount;
      needsSave = true;
    }
    if (currentPending !== pendingCount) {
      event.pendingCount = pendingCount;
      needsSave = true;
    }
    if (currentRejected !== rejectedCount) {
      event.rejectedCount = rejectedCount;
      needsSave = true;
    }
    
    if (needsSave) {
      try {
        await event.save();
        console.log(`✅ Event counts updated for ${event.name}`);
      } catch (saveError) {
        console.error(`Error saving event ${event.name}:`, saveError.message);
        // Continue even if save fails
      }
    }

    // Safely get configuration values with fallbacks
    const maxParticipants = event.maxParticipants || 0;
    const maxWaitlist = event.maxWaitlist || 50;
    const isFull = (confirmedCount || 0) >= maxParticipants;
    const isWaitlistFull = (pendingCount || 0) >= maxWaitlist;
    const availableSpots = maxParticipants - (confirmedCount || 0);
    const waitlistAvailable = maxWaitlist - (pendingCount || 0);
    
    const statusInfo = {
      confirmed: confirmedCount,
      pending: pendingCount,
      total: confirmedCount + pendingCount,
      available: availableSpots,
      waitlistAvailable: waitlistAvailable,
      isFull: isFull,
      isWaitlistFull: isWaitlistFull
    };
    
    // Create response object with safe defaults
    const responseData = {
      ...event.toObject(),
      confirmedCount: confirmedCount,
      pendingCount: pendingCount,
      rejectedCount: rejectedCount,
      totalRegistrations: confirmedCount + pendingCount,
      availableSpots: availableSpots,
      waitlistAvailable: waitlistAvailable,
      isFull: isFull,
      isWaitlistFull: isWaitlistFull,
      statusInfo: statusInfo
    };
    
    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Error in getEventWithRealCount:', error);
    
    // Try to return basic event data as fallback
    try {
      const event = await Event.findById(req.params.id);
      if (event) {
        console.log('🔄 Returning fallback event data without counts');
        return res.json({
          success: true,
          data: {
            ...event.toObject(),
            confirmedCount: event.confirmedCount || 0,
            pendingCount: event.pendingCount || 0,
            rejectedCount: event.rejectedCount || 0,
            totalRegistrations: (event.confirmedCount || 0) + (event.pendingCount || 0),
            availableSpots: (event.maxParticipants || 0) - (event.confirmedCount || 0),
            waitlistAvailable: (event.maxWaitlist || 50) - (event.pendingCount || 0),
            isFull: (event.confirmedCount || 0) >= (event.maxParticipants || 0),
            isWaitlistFull: (event.pendingCount || 0) >= (event.maxWaitlist || 50)
          }
        });
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError.message);
    }
    
    res.status(500).json({
      success: false,
      message: 'Error fetching event data: ' + error.message
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
    
    let confirmedCount = 0;
    let pendingCount = 0;
    
    try {
      confirmedCount = await Registration.countDocuments({
        event: event._id,
        paymentStatus: 'verified'
      });
      
      pendingCount = await Registration.countDocuments({
        event: event._id,
        paymentStatus: 'pending'
      });
    } catch (err) {
      confirmedCount = event.confirmedCount || 0;
      pendingCount = event.pendingCount || 0;
    }
    
    const statusInfo = {
      eventId: event._id,
      eventName: event.name,
      maxParticipants: event.maxParticipants || 0,
      maxWaitlist: event.maxWaitlist || 50,
      confirmedCount: confirmedCount,
      pendingCount: pendingCount,
      totalRegistrations: confirmedCount + pendingCount,
      availableSpots: (event.maxParticipants || 0) - confirmedCount,
      waitlistAvailable: (event.maxWaitlist || 50) - pendingCount,
      isFull: confirmedCount >= (event.maxParticipants || 0),
      isWaitlistFull: pendingCount >= (event.maxWaitlist || 50),
      registrationStatus: confirmedCount >= (event.maxParticipants || 0) ? 'waitlist' : 'open'
    };
    
    res.json({
      success: true,
      data: statusInfo
    });
  } catch (error) {
    console.error('Error in getEventWaitlistStatus:', error);
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
    console.error('Error in updateEventImage:', error);
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
    console.error('Error in getEventsByCategory:', error);
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
    console.error('Error in getFeaturedEvents:', error);
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
    const events = await Event.find({}).select('name registeredCount maxParticipants image confirmedCount pendingCount');
    
    const result = [];
    
    for (const event of events) {
      try {
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
          storedCount: event.registeredCount || 0,
          storedConfirmed: event.confirmedCount || 0,
          storedPending: event.pendingCount || 0,
          actualConfirmed: confirmedCount,
          actualPending: pendingCount,
          maxParticipants: event.maxParticipants || 0,
          match: (event.confirmedCount || 0) === confirmedCount,
          confirmedPercentage: event.maxParticipants > 0 ? Math.round((confirmedCount / event.maxParticipants) * 100) + '%' : 'N/A'
        });
      } catch (err) {
        result.push({
          eventId: event._id,
          eventName: event.name,
          error: err.message
        });
      }
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

// @desc    Sync event counts with actual registrations
// @route   POST /api/events/admin/sync-counts
// @access  Private/Admin
const syncEventCounts = async (req, res) => {
  try {
    const events = await Event.find({});
    const summary = [];
    let updatedCount = 0;
    
    for (const event of events) {
      try {
        const confirmedCount = await Registration.countDocuments({
          event: event._id,
          paymentStatus: 'verified'
        });
        const pendingCount = await Registration.countDocuments({
          event: event._id,
          paymentStatus: 'pending'
        });
        
        let updated = false;
        if ((event.confirmedCount || 0) !== confirmedCount) {
          event.confirmedCount = confirmedCount;
          updated = true;
        }
        if ((event.pendingCount || 0) !== pendingCount) {
          event.pendingCount = pendingCount;
          updated = true;
        }
        
        if (updated) {
          await event.save();
          updatedCount++;
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
      } catch (err) {
        summary.push({
          eventName: event.name,
          error: err.message,
          updated: false
        });
      }
    }
    
    res.json({
      success: true,
      message: `Event counts synced successfully. Updated ${updatedCount} events.`,
      summary
    });
  } catch (error) {
    console.error('Error in syncEventCounts:', error);
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