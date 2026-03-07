const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  registrationsOpen: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure only one settings document exists
systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({ registrationsOpen: true });
  }
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);