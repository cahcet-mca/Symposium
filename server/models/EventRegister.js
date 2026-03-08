const mongoose = require('mongoose');

const eventRegisterSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now
  },
  userName: {
    type: String,
    required: true
  },
  eventName: {
    type: String,
    required: true
  },
  collegeName: {
    type: String,
    required: true
  },
  participants: [{
    name: String,
    mobileNumber: String
  }],
  timeSize: {
    type: Number,
    required: true,
    default: 1
  },
  amount: {
    type: Number,
    required: true
  },
  teamName: {
    type: String,
    default: 'Individual'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'verified', 'failed'],
    default: 'verified'
  },
  registrationStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'confirmed'
  },
  // Reference to original registration (optional)
  registrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Registration'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  }
}, {
  timestamps: true
});

// Create indexes for faster queries
eventRegisterSchema.index({ userName: 1 });
eventRegisterSchema.index({ eventName: 1 });
eventRegisterSchema.index({ collegeName: 1 });
eventRegisterSchema.index({ createdAt: -1 });

module.exports = mongoose.model('EventRegister', eventRegisterSchema);