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
    required: [true, 'Please add a sub event name'],
    trim: true
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
  eventDate: {
    type: Date,
    required: [true, 'Please add event date'],
    default: new Date('2026-07-26')
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
    required: [true, 'Please add an image filename']
  },
  // WAITLIST FIELDS
  confirmedCount: {
    type: Number,
    default: 0
  },
  pendingCount: {
    type: Number,
    default: 0
  },
  rejectedCount: {
    type: Number,
    default: 0
  },
  waitlistEnabled: {
    type: Boolean,
    default: true
  },
  maxWaitlist: {
    type: Number,
    default: 50
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

// Pre-save middleware to format date string
eventSchema.pre('save', function(next) {
  if (this.eventDate) {
    const date = new Date(this.eventDate);
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    
    const suffix = day % 10 === 1 && day !== 11 ? 'st' :
                   day % 10 === 2 && day !== 12 ? 'nd' :
                   day % 10 === 3 && day !== 13 ? 'rd' : 'th';
    
    this.date = `${day}${suffix} ${month} ${year}`;
  }
  next();
});

// Method to get current status info
eventSchema.methods.getStatusInfo = function() {
  const totalRegistered = (this.confirmedCount || 0) + (this.pendingCount || 0);
  const availableSpots = (this.maxParticipants || 0) - (this.confirmedCount || 0);
  const waitlistSpots = (this.maxWaitlist || 50) - (this.pendingCount || 0);
  
  return {
    confirmed: this.confirmedCount || 0,
    pending: this.pendingCount || 0,
    total: totalRegistered,
    available: availableSpots,
    waitlistAvailable: waitlistSpots,
    isFull: (this.confirmedCount || 0) >= (this.maxParticipants || 0),
    isWaitlistFull: (this.pendingCount || 0) >= (this.maxWaitlist || 50)
  };
};

module.exports = mongoose.model('Event', eventSchema);