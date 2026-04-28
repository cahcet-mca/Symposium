const jwt = require('jsonwebtoken');
const Registration = require('../models/Registration');
const User = require('../models/User');
const Event = require('../models/Event');
const Transaction = require('../models/Transaction');
const EventRegister = require('../models/EventRegister');

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  try {
    const { adminId, password } = req.body;

    const validAdminId = process.env.ADMIN_ID || 'mca';
    const validPassword = process.env.ADMIN_PASSWORD || 'mca@26';

    if (adminId === validAdminId && password === validPassword) {
      const token = jwt.sign(
        { id: adminId, role: 'admin', isAdmin: true },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );
      
      res.json({
        success: true,
        message: 'Admin login successful',
        data: {
          adminId: adminId,
          name: 'Administrator',
          role: 'admin',
          token: token
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all registrations (filtered by status)
// @route   GET /api/admin/registrations
// @access  Private/Admin
const getAllRegistrations = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    
    if (status && status !== 'all') {
      query.paymentStatus = status;
    }

    console.log(`📡 Fetching registrations with query:`, query);

    const registrations = await Registration.find(query)
      .populate('user', 'name email college phone year')
      .populate('event', 'name category fee startTime endTime venue subEventName')
      .sort('-createdAt');

    console.log(`✅ Found ${registrations.length} registrations`);

    res.json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update registration status (Accept/Reject) with waitlist support
// @route   PUT /api/admin/registrations/:id/status
// @access  Private/Admin
const updateRegistrationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const registrationId = req.params.id;

    console.log(`🔄 Updating registration ${registrationId} to status: ${status}`);

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "verified" or "rejected"'
      });
    }

    const registration = await Registration.findById(registrationId)
      .populate('event')
      .populate('user');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (registration.paymentStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Registration already ${registration.paymentStatus}`
      });
    }

    const event = registration.event;
    const currentConfirmedCount = await Registration.countDocuments({
      event: event._id,
      paymentStatus: 'verified'
    });
    
    if (status === 'verified') {
      // Check capacity
      if (currentConfirmedCount >= event.maxParticipants) {
        if (registration.registrationStatus === 'waitlist') {
          return res.status(400).json({
            success: false,
            message: 'Event is full. This registration is in waitlist. Cannot accept now.'
          });
        } else {
          return res.status(400).json({
            success: false,
            message: 'Event has reached maximum capacity'
          });
        }
      }
      
      registration.paymentStatus = 'verified';
      registration.registrationStatus = 'confirmed';
      await registration.save();
      
      await Event.findByIdAndUpdate(event._id, {
        $inc: { confirmedCount: 1, pendingCount: -1 }
      });
      
      await User.findByIdAndUpdate(registration.user._id, {
        $addToSet: { registeredEvents: event._id }
      });
      
      await Transaction.findOneAndUpdate(
        { transactionId: registration.transactionId },
        { status: 'verified' }
      );
      
      console.log(`✅ Registration accepted and moved from ${registration.registrationStatus} to confirmed`);
      
      // Check for waitlist registrations to promote
      const nextWaitlist = await Registration.findOne({
        event: event._id,
        paymentStatus: 'pending',
        registrationStatus: 'waitlist'
      }).sort({ createdAt: 1 });
      
      if (nextWaitlist) {
        console.log(`📋 Waitlist registration found for ${event.name}. Admin can promote.`);
      }
      
    } else {
      registration.paymentStatus = 'rejected';
      registration.registrationStatus = 'cancelled';
      await registration.save();
      
      await Event.findByIdAndUpdate(event._id, {
        $inc: { pendingCount: -1, rejectedCount: 1 }
      });
      
      await Transaction.findOneAndUpdate(
        { transactionId: registration.transactionId },
        { status: 'rejected' }
      );
      
      console.log(`❌ Registration rejected`);
    }

    res.json({
      success: true,
      message: `Registration ${status === 'verified' ? 'accepted' : 'rejected'} successfully`,
      data: registration
    });

  } catch (error) {
    console.error('❌ Error updating registration status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update registration status: ' + error.message
    });
  }
};

// @desc    Promote users from waitlist to confirmed
// @route   POST /api/admin/events/:eventId/promote-waitlist
// @access  Private/Admin
const promoteFromWaitlist = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { count = 1 } = req.body;
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    const confirmedCount = await Registration.countDocuments({
      event: eventId,
      paymentStatus: 'verified'
    });
    
    if (confirmedCount >= event.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Event is already at full capacity'
      });
    }
    
    const availableSpots = Math.min(event.maxParticipants - confirmedCount, count);
    
    const waitlistRegistrations = await Registration.find({
      event: eventId,
      paymentStatus: 'pending',
      registrationStatus: 'waitlist'
    }).sort({ createdAt: 1 }).limit(availableSpots);
    
    const promoted = [];
    
    for (const reg of waitlistRegistrations) {
      reg.paymentStatus = 'verified';
      reg.registrationStatus = 'confirmed';
      await reg.save();
      
      await Event.findByIdAndUpdate(eventId, {
        $inc: { confirmedCount: 1, pendingCount: -1 }
      });
      
      await User.findByIdAndUpdate(reg.user, {
        $addToSet: { registeredEvents: eventId }
      });
      
      const user = await User.findById(reg.user);
      
      promoted.push({
        registrationId: reg._id,
        userName: user?.name || 'Unknown',
        email: user?.email || 'Unknown'
      });
      
      console.log(`✅ Promoted ${user?.name} from waitlist to confirmed for ${event.name}`);
    }
    
    res.json({
      success: true,
      message: `${promoted.length} registrations promoted from waitlist`,
      promotedCount: promoted.length,
      promoted: promoted
    });
    
  } catch (error) {
    console.error('Error promoting from waitlist:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get registration statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
  try {
    const stats = {
      pending: await Registration.countDocuments({ paymentStatus: 'pending' }),
      accepted: await Registration.countDocuments({ paymentStatus: 'verified' }),
      rejected: await Registration.countDocuments({ paymentStatus: 'rejected' }),
      waitlist: await Registration.countDocuments({ registrationStatus: 'waitlist' }),
      totalUsers: await User.countDocuments(),
      totalEvents: await Event.countDocuments(),
      totalRevenue: await Registration.aggregate([
        { $match: { paymentStatus: 'verified' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    };

    const eventStats = await Registration.aggregate([
      { $match: { paymentStatus: 'verified' } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
      { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
      { $unwind: '$event' },
      { $project: { eventName: '$event.name', count: 1 } }
    ]);

    res.json({
      success: true,
      stats: {
        ...stats,
        totalRevenue: stats.totalRevenue[0]?.total || 0,
        eventStats
      }
    });

  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify admin session
// @route   GET /api/admin/verify-session
// @access  Private/Admin
const verifySession = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Session valid',
      admin: req.admin
    });
  } catch (error) {
    console.error('Session verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  adminLogin,
  getAllRegistrations,
  updateRegistrationStatus,
  getAdminStats,
  verifySession,
  promoteFromWaitlist
};