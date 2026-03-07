const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  registrationsOpen: {
    type: Boolean,
    default: true, // Default is OPEN (true)
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
systemSettingsSchema.statics.getSettings = async function() {
  try {
    let settings = await this.findOne();
    if (!settings) {
      // Create with default: registrationsOpen = true (OPEN)
      settings = await this.create({ 
        registrationsOpen: true,
        updatedAt: new Date()
      });
      console.log('✅ System settings created with default: OPEN');
    }
    return settings;
  } catch (error) {
    console.error('❌ Error getting system settings:', error);
    throw error;
  }
};

// Method to toggle registrations
systemSettingsSchema.statics.toggleRegistrations = async function(updatedBy = null) {
  try {
    let settings = await this.getSettings();
    
    // Toggle the value
    settings.registrationsOpen = !settings.registrationsOpen;
    settings.updatedBy = updatedBy;
    settings.updatedAt = new Date();
    
    await settings.save();
    
    console.log(`🔄 Registrations toggled to: ${settings.registrationsOpen ? 'OPEN' : 'CLOSED'}`);
    
    return settings;
  } catch (error) {
    console.error('❌ Error toggling registrations:', error);
    throw error;
  }const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  registrationsOpen: {
    type: Boolean,
    default: true,
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
systemSettingsSchema.statics.getSettings = async function() {
  try {
    let settings = await this.findOne();
    if (!settings) {
      // Create with default: registrationsOpen = true (OPEN)
      settings = await this.create({ 
        registrationsOpen: true,
        updatedAt: new Date()
      });
      console.log('✅ System settings created with default: OPEN');
    }
    return settings;
  } catch (error) {
    console.error('❌ Error getting system settings:', error);
    throw error;
  }
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);