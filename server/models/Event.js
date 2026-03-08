const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add an event name'],
    trim: true,
    maxlength: [100, 'Event name cannot exceed 100 characters']
  },
  subEventName: {
    type: String,
    default: ''
  },
  coordinatorName: {
    type: String,
    default: 'To be announced'
  },
  coordinatorPhone: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: [true, 'Please select a category'],
    enum: ['Technical', 'Non-Technical']
  },
  type: {
    type: String,
    required: [true, 'Please select event type'],
    enum: ['Individual', 'Team']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  fee: {
    type: Number,
    required: [true, 'Please add registration fee'],
    min: [0, 'Fee cannot be negative']
  },
  minTeamSize: {
    type: Number,
    default: 1,
    min: 1
  },
  maxTeamSize: {
    type: Number,
    default: 1,
    min: 1
  },
  startTime: {
    type: String,
    required: [true, 'Please add start time']
  },
  endTime: {
    type: String,
    required: [true, 'Please add end time']
  },
  venue: {
    type: String,
    default: 'Will be intimated on day of event'
  },
  date: {
    type: String,
    default: '26th July 2026'
  },
  requirements: [{
    type: String
  }],
  prizes: {
    first: { type: String, default: 'TBD' },
    second: { type: String, default: 'TBD' },
    third: { type: String, default: 'TBD' }
  },
  image: {
    type: String,
    default: 'default-event.jpg'
  },
  registeredCount: {
    type: Number,
    default: 0
  },
  maxParticipants: {
    type: Number,
    default: 50
  },
  status: {
    type: String,
    enum: ['Upcoming', 'Ongoing', 'Completed'],
    default: 'Upcoming'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);