// controllers/adminController.js
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

    // Use environment variables for admin credentials
    const validAdminId = process.env.ADMIN_ID || 'mca';
    const validPassword = process.env.ADMIN_PASSWORD || 'mca@26';

    if (adminId === validAdminId && password === validPassword) {
      // Generate proper JWT token for admin
      const token = jwt.sign(
        { 
          id: adminId, 
          role: 'admin',
          isAdmin: true 
        },
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

// @desc    Get all pending registrations
// @route   GET /api/admin/pending-registrations
// @access  Private/Admin
const getPendingRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ 
      paymentStatus: 'pending'
    })
      .populate('user', 'name email college phone year')
      .populate('event', 'name category fee startTime')
      .sort('-createdAt');

    res.json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    console.error('Error fetching pending registrations:', error);
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

// @desc    Update registration status (Accept/Reject)
// @route   PUT /api/admin/registrations/:id/status
// @access  Private/Admin
const updateRegistrationStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'verified' or 'rejected' from frontend
    const registrationId = req.params.id;

    console.log(`🔄 Updating registration ${registrationId} to status: ${status}`);

    // Validate status
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "verified" or "rejected"'
      });
    }

    // Find registration with populated event and user
    const registration = await Registration.findById(registrationId)
      .populate('event')
      .populate('user');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    console.log('📋 Registration details:', {
      id: registration._id,
      event: registration.event?.name,
      user: registration.user?.email,
      currentStatus: registration.paymentStatus
    });

    // Check if already processed
    if (registration.paymentStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Registration already ${registration.paymentStatus}`
      });
    }

    // Map status to payment status and registration status
    const paymentStatus = status;
    const registrationStatus = status === 'verified' ? 'confirmed' : 'cancelled';
    
    // Update registration
    registration.paymentStatus = paymentStatus;
    registration.registrationStatus = registrationStatus;
    
    await registration.save();
    console.log(`✅ Registration ${registrationId} updated to ${paymentStatus}`);

    // If accepted (verified), update event count and user's registered events
    if (status === 'verified') {
      // Check if event exists and has capacity
      if (registration.event) {
        // Check if event has reached capacity
        if (registration.event.registeredCount >= registration.event.maxParticipants) {
          console.warn(`⚠️ Event ${registration.event.name} has reached maximum capacity`);
        }
        
        // Increment event registered count
        const eventUpdate = await Event.findByIdAndUpdate(
          registration.event._id,
          { $inc: { registeredCount: 1 } },
          { new: true }
        );
        console.log(`✅ Event ${registration.event.name} count incremented to ${eventUpdate.registeredCount}`);

        // Add event to user's registered events
        if (registration.user) {
          await User.findByIdAndUpdate(registration.user._id, {
            $addToSet: { registeredEvents: registration.event._id }
          });
          console.log(`✅ Event added to user ${registration.user.email} profile`);
        }
      }

      // Update transaction status
      if (registration.transactionId) {
        await Transaction.findOneAndUpdate(
          { transactionId: registration.transactionId },
          { status: 'verified' }
        );
      }
    } else {
      // If rejected, just update transaction status
      if (registration.transactionId) {
        await Transaction.findOneAndUpdate(
          { transactionId: registration.transactionId },
          { status: 'rejected' }
        );
        console.log(`❌ Transaction ${registration.transactionId} marked as rejected`);
      }
    }

    // Also update EventRegister if it exists
    try {
      await EventRegister.findOneAndUpdate(
        { registrationId: registration._id },
        { 
          paymentStatus: paymentStatus,
          registrationStatus: registrationStatus
        }
      );
    } catch (eventRegisterError) {
      console.log('⚠️ Could not update EventRegister:', eventRegisterError.message);
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

// @desc    Get registration statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getAdminStats = async (req, res) => {
  try {
    const stats = {
      pending: await Registration.countDocuments({ paymentStatus: 'pending' }),
      accepted: await Registration.countDocuments({ paymentStatus: 'verified' }),
      rejected: await Registration.countDocuments({ paymentStatus: 'rejected' }),
      totalUsers: await User.countDocuments(),
      totalEvents: await Event.countDocuments(),
      totalRevenue: await Registration.aggregate([
        { $match: { paymentStatus: 'verified' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    };

    // Get event-wise registrations
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
  getPendingRegistrations,
  getAllRegistrations,
  updateRegistrationStatus,
  getAdminStats,
  verifySession
};