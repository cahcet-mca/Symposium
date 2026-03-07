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

    // Hardcoded admin credentials
    if (adminId === 'mca' && password === 'mca@26') {
      // Generate a simple token for admin
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
      // Map frontend status to database status
      if (status === 'verified') {
        query.paymentStatus = 'verified';
      } else if (status === 'rejected') {
        query.paymentStatus = 'rejected';
      } else if (status === 'pending') {
        query.paymentStatus = 'pending';
      }
    }

    console.log('Fetching registrations with query:', query);

    const registrations = await Registration.find(query)
      .populate('user', 'name email college phone year')
      .populate('event', 'name category fee startTime endTime venue')
      .sort('-createdAt');

    console.log(`Found ${registrations.length} registrations`);

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
    const { status } = req.body; // 'accepted' or 'rejected'
    const registrationId = req.params.id;

    console.log(`Updating registration ${registrationId} to status: ${status}`);

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "accepted" or "rejected"'
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

    console.log('Found registration:', {
      id: registration._id,
      event: registration.event?.name,
      user: registration.user?.email,
      currentStatus: registration.paymentStatus
    });

    // Update payment status based on admin action
    const newPaymentStatus = status === 'accepted' ? 'verified' : 'rejected';
    const newRegistrationStatus = status === 'accepted' ? 'confirmed' : 'cancelled';
    
    registration.paymentStatus = newPaymentStatus;
    registration.registrationStatus = newRegistrationStatus;
    
    await registration.save();
    console.log(`✅ Registration ${registrationId} updated to ${newPaymentStatus}`);

    // If accepted, increment event registered count and add to user's events
    if (status === 'accepted') {
      // Increment event registered count
      const eventUpdate = await Event.findByIdAndUpdate(
        registration.event._id,
        { $inc: { registeredCount: 1 } },
        { new: true }
      );
      console.log(`✅ Event ${registration.event.name} count incremented to ${eventUpdate.registeredCount}`);

      // Add event to user's registered events
      await User.findByIdAndUpdate(registration.user._id, {
        $addToSet: { registeredEvents: registration.event._id }
      });
      console.log(`✅ Event added to user ${registration.user.email} profile`);

      // Update EventRegister status
      await Transaction.findOneAndUpdate(
        { transactionId: registration.transactionId },
        { status: 'verified' }
      );
    } else {
      // If rejected, just update transaction status
      await Transaction.findOneAndUpdate(
        { transactionId: registration.transactionId },
        { status: 'rejected' }
      );
      console.log(`❌ Transaction ${registration.transactionId} marked as rejected`);
    }

    res.json({
      success: true,
      message: `Registration ${status} successfully`,
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

module.exports = {
  adminLogin,
  getPendingRegistrations,
  getAllRegistrations,
  updateRegistrationStatus,
  getAdminStats
};