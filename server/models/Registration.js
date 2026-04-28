const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  eventName: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teamName: {
    type: String,
    default: 'Individual'
  },
  teamSize: {
    type: Number,
    default: 1
  },
  participants: [{
    name: String,
    email: String,
    phone: String
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  paymentScreenshot: {
    type: String,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  registrationStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'waitlist'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Registration', registrationSchema);