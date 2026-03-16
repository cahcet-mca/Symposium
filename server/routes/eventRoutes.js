// routes/eventRoutes.js
const express = require('express');
const router = express.Router();
const {
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
  syncEventCounts
} = require('../controllers/eventController');
const { protect, authorize } = require('../middleware/authMiddleware');

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================

/**
 * @route   GET /api/events
 * @desc    Get all events with filters (category, type, search)
 * @access  Public
 */
router.route('/')
  .get(getEvents);

/**
 * @route   GET /api/events/featured
 * @desc    Get featured events (for homepage)
 * @access  Public
 */
router.get('/featured', getFeaturedEvents);

/**
 * @route   GET /api/events/category/:category
 * @desc    Get events by category (Technical/Non-Technical)
 * @access  Public
 */
router.get('/category/:category', getEventsByCategory);

/**
 * @route   GET /api/events/debug/counts
 * @desc    Debug endpoint to check event counts (public for debugging)
 * @access  Public
 */
router.get('/debug/counts', debugEventCounts);

/**
 * @route   GET /api/events/:id
 * @desc    Get single event by ID
 * @access  Public
 */
router.get('/:id', getEventById);

/**
 * @route   GET /api/events/:id/with-count
 * @desc    Get event with REAL registration count from database
 * @access  Public
 */
router.get('/:id/with-count', getEventWithRealCount);

// ============================================
// ADMIN ONLY ROUTES (Authentication Required)
// ============================================

/**
 * @route   POST /api/events
 * @desc    Create new event
 * @access  Private/Admin
 */
router.post('/', protect, authorize('admin'), createEvent);

/**
 * @route   PUT /api/events/:id
 * @desc    Update event details
 * @access  Private/Admin
 */
router.put('/:id', protect, authorize('admin'), updateEvent);

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete event
 * @access  Private/Admin
 */
router.delete('/:id', protect, authorize('admin'), deleteEvent);

/**
 * @route   PUT /api/events/:id/image
 * @desc    Update event image only
 * @access  Private/Admin
 */
router.put('/:id/image', protect, authorize('admin'), updateEventImage);

/**
 * @route   POST /api/events/admin/sync-counts
 * @desc    Sync all event counts with actual registrations
 * @access  Private/Admin
 */
router.post('/admin/sync-counts', protect, authorize('admin'), syncEventCounts);

// ============================================
// BULK OPERATIONS (Admin Only)
// ============================================

/**
 * @route   POST /api/events/bulk
 * @desc    Create multiple events at once
 * @access  Private/Admin
 */
router.post('/bulk', protect, authorize('admin'), async (req, res) => {
  try {
    const Event = require('../models/Event');
    const events = await Event.insertMany(req.body);
    res.status(201).json({
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
});

/**
 * @route   PUT /api/events/bulk/update
 * @desc    Update multiple events
 * @access  Private/Admin
 */
router.put('/bulk/update', protect, authorize('admin'), async (req, res) => {
  try {
    const Event = require('../models/Event');
    const { updates } = req.body; // Array of { id, data }
    
    const updatePromises = updates.map(update => 
      Event.findByIdAndUpdate(update.id, update.data, { new: true })
    );
    
    const updatedEvents = await Promise.all(updatePromises);
    
    res.json({
      success: true,
      count: updatedEvents.length,
      data: updatedEvents
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// EVENT STATISTICS (Admin Only)
// ============================================

/**
 * @route   GET /api/events/stats/overview
 * @desc    Get event statistics overview
 * @access  Private/Admin
 */
router.get('/stats/overview', protect, authorize('admin'), async (req, res) => {
  try {
    const Event = require('../models/Event');
    const Registration = require('../models/Registration');
    
    const events = await Event.find();
    
    const stats = {
      totalEvents: events.length,
      technicalEvents: events.filter(e => e.category === 'Technical').length,
      nonTechnicalEvents: events.filter(e => e.category === 'Non-Technical').length,
      individualEvents: events.filter(e => e.type === 'Individual').length,
      teamEvents: events.filter(e => e.type === 'Team').length,
      totalCapacity: events.reduce((sum, e) => sum + e.maxParticipants, 0),
      totalRegistered: events.reduce((sum, e) => sum + e.registeredCount, 0),
      upcomingEvents: events.filter(e => e.status === 'Upcoming').length,
      ongoingEvents: events.filter(e => e.status === 'Ongoing').length,
      completedEvents: events.filter(e => e.status === 'Completed').length
    };
    
    // Get registration counts per event
    const registrationStats = await Promise.all(
      events.map(async (event) => {
        const count = await Registration.countDocuments({
          event: event._id,
          paymentStatus: 'verified'
        });
        return {
          eventId: event._id,
          eventName: event.name,
          registeredCount: count,
          capacity: event.maxParticipants,
          percentage: Math.round((count / event.maxParticipants) * 100)
        };
      })
    );
    
    res.json({
      success: true,
      overview: stats,
      eventDetails: registrationStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// EVENT AVAILABILITY CHECK
// ============================================

/**
 * @route   GET /api/events/:id/availability
 * @desc    Check event availability (spots left)
 * @access  Public
 */
router.get('/:id/availability', async (req, res) => {
  try {
    const Event = require('../models/Event');
    const Registration = require('../models/Registration');
    
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    const registeredCount = await Registration.countDocuments({
      event: event._id,
      paymentStatus: 'verified'
    });
    
    const availableSpots = event.maxParticipants - registeredCount;
    
    res.json({
      success: true,
      data: {
        eventId: event._id,
        eventName: event.name,
        totalCapacity: event.maxParticipants,
        registered: registeredCount,
        available: availableSpots,
        isFull: availableSpots <= 0,
        percentage: Math.round((registeredCount / event.maxParticipants) * 100)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ============================================
// EVENT SEARCH AND FILTER
// ============================================

/**
 * @route   GET /api/events/search/:query
 * @desc    Search events by name or description
 * @access  Public
 */
router.get('/search/:query', async (req, res) => {
  try {
    const Event = require('../models/Event');
    const searchQuery = req.params.query;
    
    const events = await Event.find({
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { subEventName: { $regex: searchQuery, $options: 'i' } }
      ]
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
});

/**
 * @route   GET /api/events/filter
 * @desc    Filter events by multiple criteria
 * @access  Public
 */
router.get('/filter/advanced', async (req, res) => {
  try {
    const Event = require('../models/Event');
    const { category, type, minFee, maxFee, status } = req.query;
    
    let query = {};
    
    if (category) query.category = category;
    if (type) query.type = type;
    if (status) query.status = status;
    if (minFee || maxFee) {
      query.fee = {};
      if (minFee) query.fee.$gte = parseInt(minFee);
      if (maxFee) query.fee.$lte = parseInt(maxFee);
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
});

module.exports = router;