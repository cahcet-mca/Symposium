// models/SymposiumSettings.js
const mongoose = require('mongoose');

const symposiumSettingsSchema = new mongoose.Schema({
  symposiumDate: {
    type: Date,
    required: true,
    default: new Date('2026-07-26')
  },
  symposiumName: {
    type: String,
    default: 'TECNO RENDEZVOUS'
  },
  venue: {
    type: String,
    default: 'C. Abdul Hakeem College of Engineering and Technology'
  },
  venueDetails: {
    type: String,
    default: 'Master of Computer Application'
  },
  updatedBy: {
    type: String,
    default: 'system'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
symposiumSettingsSchema.statics.getSettings = async function() {
  try {
    let settings = await this.findOne();
    if (!settings) {
      settings = await this.create({ 
        symposiumDate: new Date('2026-07-26'),
        updatedBy: 'system'
      });
      console.log('✅ Symposium settings created with default date: 26th July 2026');
    }
    return settings;
  } catch (error) {
    console.error('❌ Error getting symposium settings:', error);
    throw error;
  }
};

// Method to update symposium date
symposiumSettingsSchema.statics.updateDate = async function(newDate, updatedBy = 'admin') {
  try {
    let settings = await this.getSettings();
    
    settings.symposiumDate = new Date(newDate);
    settings.updatedBy = updatedBy;
    settings.updatedAt = new Date();
    
    await settings.save();
    
    const formattedDate = settings.symposiumDate.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    console.log(`📅 Symposium date updated to: ${formattedDate}`);
    
    return settings;
  } catch (error) {
    console.error('❌ Error updating symposium date:', error);
    throw error;
  }
};

// Format date helper
symposiumSettingsSchema.methods.getFormattedDate = function() {
  const date = new Date(this.symposiumDate);
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'long' });
  const year = date.getFullYear();
  
  // Add ordinal suffix
  const suffix = day % 10 === 1 && day !== 11 ? 'st' :
                 day % 10 === 2 && day !== 12 ? 'nd' :
                 day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  
  return `${day}${suffix} ${month} ${year}`;
};

module.exports = mongoose.model('SymposiumSettings', symposiumSettingsSchema);