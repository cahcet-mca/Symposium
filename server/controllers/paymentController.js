const Transaction = require('../models/Transaction');
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const EventRegister = require('../models/EventRegister');

// ============================================
// MAIN PAYMENT VERIFICATION FUNCTION
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
      console.log('❌ No event ID provided');
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
    console.log('🔍 Looking for event with ID:', eventId);

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
      console.log('❌ Event not found in database with ID:', eventId);

      // Try to find by name as fallback
      if (eventName) {
        console.log('🔍 Trying to find event by name:', eventName);
        event = await Event.findOne({ name: eventName });
      }

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found in database'
        });
      }

      console.log('✅ Event found by name:', event.name);
    } else {
      console.log('✅ Event found:', event.name);
    }

    // Store original count for logging
    const originalCount = event.registeredCount;
    console.log(`📊 Current registered count: ${originalCount}/${event.maxParticipants}`);

    // STEP 3: Check if event has capacity
    if (event.registeredCount >= event.maxParticipants) {
      return res.status(400).json({
        success: false,
        message: 'Event has reached maximum capacity'
      });
    }

    // STEP 4: Check if user is already registered (including pending)
    const existingRegistration = await Registration.findOne({
      user: req.user._id,
      event: event._id
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'You have already registered for this event'
      });
    }

    // STEP 5: Check if transaction ID already exists in MongoDB
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

    // STEP 7: Create registration in MongoDB (set as pending)
    console.log('💾 Saving registration to MongoDB with PENDING status...');
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
      paymentStatus: 'pending',
      registrationStatus: 'pending'
    });
    console.log('✅ Registration saved with PENDING status:', registration._id);

    // STEP 8: Create Event Register entry in MongoDB (set as pending)
    console.log('💾 Saving event register to MongoDB with PENDING status...');
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
      registrationStatus: 'pending',
      registrationId: registration._id,
      userId: req.user._id,
      eventId: event._id
    });
    console.log('✅ Event register saved with PENDING status:', eventRegister._id);

    console.log('✅ VERIFICATION COMPLETED - Registration is PENDING admin approval ====================');

    res.json({
      success: true,
      message: 'Payment verified successfully! Your registration is pending admin approval.',
      registration: {
        id: registration._id,
        eventName: registration.eventName,
        transactionId: registration.transactionId,
        totalAmount: registration.totalAmount,
        status: 'pending'
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

// @desc    Get user's registrations (all statuses)
// @route   GET /api/payments/my-registrations
// @access  Private
const getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({
      user: req.user._id
    }).populate('event').sort('-createdAt');

    // Log status counts for debugging
    const pending = registrations.filter(r => r.paymentStatus === 'pending').length;
    const verified = registrations.filter(r => r.paymentStatus === 'verified').length;
    const rejected = registrations.filter(r => r.paymentStatus === 'rejected').length;

    console.log(`📊 User ${req.user.email} registrations: Pending:${pending}, Accepted:${verified}, Rejected:${rejected}`);

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

    // Check if user is authorized to view this transaction
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