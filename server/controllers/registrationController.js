const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');

/**
 * @desc    Get user's registrations
 * @route   GET /api/registrations/myregistrations
 * @access  Private
 */
const getMyRegistrations = async (req, res) => {
  try {
    console.log('📋 Fetching registrations for user:', req.user._id);
    
    // Find all registrations for the logged-in user with verified payment status
    const registrations = await Registration.find({ 
      user: req.user._id,
      paymentStatus: 'verified'
    })
      .populate('event') // Populate event details
      .sort('-createdAt'); // Most recent first

    console.log(`✅ Found ${registrations.length} verified registrations`);

    res.json({
      success: true,
      count: registrations.length,
      data: registrations
    });

  } catch (error) {
    console.error('❌ Error fetching registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registrations',
      error: error.message
    });
  }
};

/**
 * @desc    Check if user has time conflict with existing registrations
 * @route   POST /api/registrations/check-conflict
 * @access  Private
 */
const checkTimeConflict = async (req, res) => {
  try {
    const { eventId } = req.body;
    
    console.log('🔍 Checking time conflict for event:', eventId, 'User:', req.user._id);
    
    // Validate if eventId is a valid MongoDB ObjectId (24 characters)
    if (!eventId || eventId === '1' || eventId.length !== 24) {
      return res.json({
        success: true,
        conflict: false,
        message: 'No time conflicts found'
      });
    }
    
    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    console.log('Event details:', {
      name: event.name,
      startTime: event.startTime,
      endTime: event.endTime
    });

    // Get all user's verified registrations with populated event details
    const userRegistrations = await Registration.find({ 
      user: req.user._id,
      paymentStatus: 'verified'
    }).populate('event');

    console.log(`User has ${userRegistrations.length} verified registrations`);

    // Check for time conflicts
    const conflictingEvents = [];
    
    userRegistrations.forEach(reg => {
      const regEvent = reg.event;
      if (!regEvent) {
        console.log('Skipping registration with no event data:', reg._id);
        return; // Skip if event not found
      }
      
      console.log(`Comparing with ${regEvent.name}: ${regEvent.startTime} - ${regEvent.endTime}`);
      
      // Check if time ranges overlap
      const conflict = (
        (event.startTime >= regEvent.startTime && event.startTime < regEvent.endTime) ||
        (event.endTime > regEvent.startTime && event.endTime <= regEvent.endTime) ||
        (regEvent.startTime >= event.startTime && regEvent.startTime < event.endTime)
      );
      
      if (conflict) {
        console.log(`⚠️ Conflict detected with ${regEvent.name}`);
        conflictingEvents.push({
          name: regEvent.name,
          startTime: regEvent.startTime,
          endTime: regEvent.endTime
        });
      }
    });

    if (conflictingEvents.length > 0) {
      const conflictMessages = conflictingEvents.map(e => 
        `"${e.name}" (${e.startTime} - ${e.endTime})`
      ).join(', ');
      
      return res.json({
        success: false,
        conflict: true,
        message: `Time conflict with: ${conflictMessages}`,
        conflicts: conflictingEvents
      });
    }

    console.log('✅ No time conflicts found');
    res.json({
      success: true,
      conflict: false,
      message: 'No time conflicts found'
    });

  } catch (error) {
    console.error('❌ Error checking time conflict:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking time conflict',
      error: error.message
    });
  }
};

/**
 * @desc    Get single registration by ID
 * @route   GET /api/registrations/:id
 * @access  Private
 */
const getRegistrationById = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id)
      .populate('event')
      .populate('user', 'name email college department year phone');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Check if user is authorized to view this registration
    if (registration.user._id.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this registration'
      });
    }

    res.json({
      success: true,
      data: registration
    });

  } catch (error) {
    console.error('❌ Error fetching registration:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching registration',
      error: error.message
    });
  }
};

/**
 * @desc    Get all registrations for an event (admin only)
 * @route   GET /api/registrations/event/:eventId
 * @access  Private/Admin
 */
const getEventRegistrations = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const registrations = await Registration.find({ event: eventId })
      .populate('user', 'name email college phone')
      .sort('-createdAt');

    res.json({
      success: true,
      count: registrations.length,
      data: registrations
    });

  } catch (error) {
    console.error('❌ Error fetching event registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event registrations',
      error: error.message
    });
  }
};

/**
 * @desc    Cancel registration
 * @route   DELETE /api/registrations/:id
 * @access  Private
 */
const cancelRegistration = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Check if user is authorized to cancel
    if (registration.user.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this registration'
      });
    }

    // Check if cancellation is allowed (e.g., not within 24 hours of event)
    const event = await Event.findById(registration.event);
    
    // You can add your cancellation policy logic here
    // For example, prevent cancellation if event is within 24 hours
    
    // Update event registered count (decrease by 1)
    await Event.findByIdAndUpdate(registration.event, {
      $inc: { registeredCount: -1 }
    });

    // Remove event from user's registered events
    await User.findByIdAndUpdate(registration.user, {
      $pull: { registeredEvents: registration.event }
    });

    // Delete the registration
    await registration.deleteOne();

    res.json({
      success: true,
      message: 'Registration cancelled successfully'
    });

  } catch (error) {
    console.error('❌ Error cancelling registration:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling registration',
      error: error.message
    });
  }
};

/**
 * @desc    Update registration status (admin only)
 * @route   PUT /api/registrations/:id/status
 * @access  Private/Admin
 */
const updateRegistrationStatus = async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    
    const registration = await Registration.findById(req.params.id);
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (status) registration.registrationStatus = status;
    if (paymentStatus) registration.paymentStatus = paymentStatus;
    
    await registration.save();

    res.json({
      success: true,
      message: 'Registration status updated',
      data: registration
    });

  } catch (error) {
    console.error('❌ Error updating registration:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating registration',
      error: error.message
    });
  }
};

/**
 * @desc    Get registration statistics (admin only)
 * @route   GET /api/registrations/stats
 * @access  Private/Admin
 */
const getRegistrationStats = async (req, res) => {
  try {
    const stats = await Registration.aggregate([
      {
        $group: {
          _id: null,
          totalRegistrations: { $sum: 1 },
          verifiedRegistrations: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'verified'] }, 1, 0] }
          },
          pendingRegistrations: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
          },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'verified'] }, '$totalAmount', 0] }
          }
        }
      }
    ]);

    // Get event-wise registrations
    const eventWiseStats = await Registration.aggregate([
      {
        $group: {
          _id: '$event',
          count: { $sum: 1 },
          verifiedCount: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'verified'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'events',
          localField: '_id',
          foreignField: '_id',
          as: 'event'
        }
      },
      {
        $unwind: '$event'
      },
      {
        $project: {
          eventName: '$event.name',
          category: '$event.category',
          count: 1,
          verifiedCount: 1
        }
      }
    ]);

    res.json({
      success: true,
      stats: stats[0] || {
        totalRegistrations: 0,
        verifiedRegistrations: 0,
        pendingRegistrations: 0,
        totalRevenue: 0
      },
      eventWiseStats
    });

  } catch (error) {
    console.error('❌ Error getting registration stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting registration statistics',
      error: error.message
    });
  }
};

// @desc    Check if user is registered for an event
// @route   POST /api/registrations/check-registered
// @access  Private
const checkIfRegistered = async (req, res) => {
  try {
    const { eventId } = req.body;
    
    const registration = await Registration.findOne({
      user: req.user._id,
      event: eventId,
      paymentStatus: 'verified'
    });

    res.json({
      success: true,
      isRegistered: !!registration,
      registration: registration || null
    });

  } catch (error) {
    console.error('❌ Error checking registration:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking registration status',
      error: error.message
    });
  }
};

/**
 * @desc    Get upcoming registrations for user
 * @route   GET /api/registrations/upcoming
 * @access  Private
 */
const getUpcomingRegistrations = async (req, res) => {
  try {
    const currentDate = new Date();
    const currentTime = currentDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });

    const registrations = await Registration.find({ 
      user: req.user._id,
      paymentStatus: 'verified'
    })
      .populate('event')
      .sort('event.startTime');

    // Filter for upcoming events (you can add date comparison logic here)
    const upcoming = registrations.filter(reg => 
      reg.event && reg.event.status === 'Upcoming'
    );

    res.json({
      success: true,
      count: upcoming.length,
      data: upcoming
    });

  } catch (error) {
    console.error('❌ Error fetching upcoming registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching upcoming registrations',
      error: error.message
    });
  }
};

/**
 * @desc    Get past registrations for user
 * @route   GET /api/registrations/past
 * @access  Private
 */
const getPastRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ 
      user: req.user._id,
      paymentStatus: 'verified'
    })
      .populate('event')
      .sort('-createdAt');

    // Filter for past events
    const past = registrations.filter(reg => 
      reg.event && reg.event.status === 'Completed'
    );

    res.json({
      success: true,
      count: past.length,
      data: past
    });

  } catch (error) {
    console.error('❌ Error fetching past registrations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching past registrations',
      error: error.message
    });
  }
};

// @desc    Get verified registration count for an event
// @route   GET /api/registrations/count/:eventId
// @access  Public
const getRegistrationCount = async (req, res) => {
  try {
    const { eventId } = req.params;
    
    const count = await Registration.countDocuments({
      event: eventId,
      paymentStatus: 'verified'
    });

    res.json({
      success: true,
      count,
      eventId
    });

  } catch (error) {
    console.error('❌ Error getting registration count:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ============================================
// EXPORT ALL CONTROLLERS
// ============================================

module.exports = {
  getMyRegistrations,
  checkTimeConflict,
  checkIfRegistered,
  getRegistrationCount
};