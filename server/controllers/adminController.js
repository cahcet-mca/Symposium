const Registration = require('../models/Registration');
const User = require('../models/User');
const Event = require('../models/Event');
const Transaction = require('../models/Transaction');

// @desc    Admin login
// @route   POST /api/admin/login
// @access  Public
const adminLogin = async (req, res) => {
  try {
    const { adminId, password } = req.body;

    // Hardcoded admin credentials (as requested)
    if (adminId === 'mca' && password === 'mca@26') {
      // Generate a simple token for admin (you can use JWT here)
      const token = Buffer.from(`${adminId}:${Date.now()}`).toString('base64');
      
      res.json({
        success: true,
        message: 'Admin login successful',
        data: {
          adminId: 'mca',
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
      .populate('user', 'name email college phone')
      .populate('event', 'name category fee startTime')
      .sort('-createdAt');

    res.json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
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

    const registrations = await Registration.find(query)
      .populate('user', 'name email college phone')
      .populate('event', 'name category fee startTime endTime venue')
      .sort('-createdAt');

    res.json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
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
    const { status } = req.body; // 'accepted' or 'rejected'
    const registrationId = req.params.id;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "accepted" or "rejected"'
      });
    }

    const registration = await Registration.findById(registrationId)
      .populate('event');

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Update payment status based on admin action
    registration.paymentStatus = status === 'accepted' ? 'verified' : 'rejected';
    registration.registrationStatus = status === 'accepted' ? 'confirmed' : 'cancelled';
    
    await registration.save();

    // If accepted, increment event registered count
    if (status === 'accepted') {
      await Event.findByIdAndUpdate(registration.event._id, {
        $inc: { registeredCount: 1 }
      });

      // Add event to user's registered events
      await User.findByIdAndUpdate(registration.user, {
        $addToSet: { registeredEvents: registration.event._id }
      });
    }

    // Update transaction status if exists
    if (registration.transactionId) {
      await Transaction.findOneAndUpdate(
        { transactionId: registration.transactionId },
        { status: status === 'accepted' ? 'verified' : 'rejected' }
      );
    }

    res.json({
      success: true,
      message: `Registration ${status} successfully`,
      data: registration
    });

  } catch (error) {
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
  getAdminStats
};