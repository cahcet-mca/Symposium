const Transaction = require('../models/Transaction');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const EventRegister = require('../models/EventRegister');

// ============================================
// MAIN PAYMENT VERIFICATION FUNCTION (with Waitlist)
// ============================================

const verifyPayment = async (req, res) => {
  try {
    const {
      transactionId,
      screenshot,
      eventId,
      eventName,
      eventTime,
      teamName,
      teamSize,
      participants,
      totalAmount,
      user
    } = req.body;

    console.log('🔍 VERIFICATION STARTED ====================');
    console.log('Transaction ID:', transactionId);
    console.log('Event ID:', eventId);
    console.log('Event Name:', eventName);
    console.log('User ID:', req.user._id);
    console.log('User Email:', req.user.email);

    // STEP 1: Validate required fields
    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
      });
    }

    if (!transactionId || transactionId.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid transaction ID (minimum 10 characters)'
      });
    }

    if (!screenshot) {
      return res.status(400).json({
        success: false,
        message: 'Please upload payment screenshot'
      });
    }

    // STEP 2: Find the event in database
    let event;
    try {
      event = await Event.findById(eventId);
    } catch (err) {
      console.log('❌ Invalid event ID format:', err.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }

    if (!event) {
      if (eventName) {
        event = await Event.findOne({ name: eventName });
      }
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found in database'
        });
      }
    }

    console.log('✅ Event found:', event.name);

    // STEP 3: Get current counts and determine registration status
    const confirmedCount = await Registration.countDocuments({
      event: event._id,
      paymentStatus: 'verified'
    });
    
    const pendingCount = await Registration.countDocuments({
      event: event._id,
      paymentStatus: 'pending'
    });
    
    const isFull = confirmedCount >= event.maxParticipants;
    const isWaitlistFull = pendingCount >= (event.maxWaitlist || 50);
    
    let paymentStatus = 'pending';
    let registrationStatus = 'pending';
    let statusMessage = '';
    
    if (!isFull) {
      // Direct registration (confirmed spot once approved)
      paymentStatus = 'pending';
      registrationStatus = 'pending';
      statusMessage = 'Your registration is pending admin approval. You will be confirmed once approved.';
    } else if (isFull && !isWaitlistFull) {
      // Waitlist registration
      paymentStatus = 'pending';
      registrationStatus = 'waitlist';
      statusMessage = 'Event is full. You have been added to the waitlist. You will be notified if a spot opens up.';
    } else {
      // Both full - reject
      return res.status(400).json({
        success: false,
        message: 'Event is completely full. No waitlist spots available.'
      });
    }

    // STEP 4: Check if user has an existing registration
    const existingRegistration = await Registration.findOne({
      user: req.user._id,
      event: event._id
    });

    if (existingRegistration && existingRegistration.paymentStatus !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: `You already have a ${existingRegistration.paymentStatus} registration for this event.`
      });
    }

    // STEP 5: Check if transaction ID already exists
    const existsInMongo = await Transaction.findOne({ transactionId: transactionId.toUpperCase() });
    if (existsInMongo) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID already exists in our database'
      });
    }

    // STEP 6: Save transaction to MongoDB
    console.log('💾 Saving transaction to MongoDB...');
    const transaction = await Transaction.create({
      transactionId: transactionId.toUpperCase(),
      upiId: 'NOT_PROVIDED',
      amount: totalAmount,
      screenshot,
      user: req.user._id,
      event: event._id,
      status: 'pending'
    });
    console.log('✅ Transaction saved:', transaction._id);

    // STEP 7: Create registration with appropriate status
    console.log('💾 Saving registration to MongoDB...');
    const registration = await Registration.create({
      event: event._id,
      eventName: event.name,
      user: req.user._id,
      teamName: teamName || 'Individual',
      teamSize: teamSize || 1,
      participants: participants || [{
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone
      }],
      totalAmount,
      transactionId: transactionId.toUpperCase(),
      paymentScreenshot: screenshot,
      paymentStatus: paymentStatus,
      registrationStatus: registrationStatus
    });
    console.log('✅ Registration saved with status:', registrationStatus);

    // STEP 8: Update pending count in event
    await Event.findByIdAndUpdate(event._id, {
      $inc: { pendingCount: 1 }
    });

    // STEP 9: Create Event Register entry
    const eventRegister = await EventRegister.create({
      timestamp: new Date(),
      userName: req.user.name,
      eventName: event.name,
      collegeName: req.user.college,
      participants: participants.map(p => ({
        name: p.name,
        mobileNumber: p.phone
      })),
      timeSize: teamSize || 1,
      amount: totalAmount,
      teamName: teamName || 'Individual',
      paymentStatus: 'pending',
      registrationStatus: registrationStatus,
      registrationId: registration._id,
      userId: req.user._id,
      eventId: event._id
    });

    console.log('✅ Event register saved with status:', registrationStatus);
    console.log('✅ VERIFICATION COMPLETED ====================');

    res.json({
      success: true,
      message: statusMessage,
      registration: {
        id: registration._id,
        eventName: registration.eventName,
        transactionId: registration.transactionId,
        totalAmount: registration.totalAmount,
        status: registrationStatus,
        isWaitlisted: registrationStatus === 'waitlist'
      }
    });

  } catch (error) {
    console.error('❌ VERIFICATION ERROR:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Transaction ID already exists. Please use a different transaction ID.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error verifying payment: ' + error.message
    });
  }
};

// @desc    Get user's registrations (all statuses including waitlist)
// @route   GET /api/payments/my-registrations
// @access  Private
const getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({
      user: req.user._id
    }).populate('event').sort('-createdAt');

    const pending = registrations.filter(r => r.paymentStatus === 'pending' && r.registrationStatus !== 'waitlist').length;
    const waitlist = registrations.filter(r => r.registrationStatus === 'waitlist').length;
    const verified = registrations.filter(r => r.paymentStatus === 'verified').length;
    const rejected = registrations.filter(r => r.paymentStatus === 'rejected').length;

    console.log(`📊 User ${req.user.email} registrations:`);
    console.log(`   Pending: ${pending}, Waitlist: ${waitlist}, Accepted: ${verified}, Rejected: ${rejected}`);

    res.json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    console.error('❌ Error fetching registrations:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get payment statistics (admin only)
// @route   GET /api/payments/stats
// @access  Private/Admin
const getPaymentStats = async (req, res) => {
  try {
    const transactionStats = await Transaction.aggregate([
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          pendingTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          verifiedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'verified'] }, 1, 0] }
          },
          rejectedTransactions: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]);

    const eventRegisterStats = await EventRegister.aggregate([
      {
        $group: {
          _id: '$eventName',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          pending: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] }
          },
          verified: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'verified'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'rejected'] }, 1, 0] }
          },
          waitlist: {
            $sum: { $cond: [{ $eq: ['$registrationStatus', 'waitlist'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      transactionStats: transactionStats[0] || {
        totalTransactions: 0,
        totalAmount: 0,
        pendingTransactions: 0,
        verifiedTransactions: 0,
        rejectedTransactions: 0
      },
      eventRegisterStats
    });

  } catch (error) {
    console.error('❌ Error getting payment stats:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get transaction by ID
// @route   GET /api/payments/transaction/:id
// @access  Private
const getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('user', 'name email')
      .populate('event', 'name category');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this transaction'
      });
    }

    res.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error('❌ Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all transactions (admin only)
// @route   GET /api/payments/transactions
// @access  Private/Admin
const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('user', 'name email')
      .populate('event', 'name')
      .sort('-createdAt');

    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });

  } catch (error) {
    console.error('❌ Error fetching all transactions:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  verifyPayment,
  getMyRegistrations,
  getPaymentStats,
  getTransactionById,
  getAllTransactions
};