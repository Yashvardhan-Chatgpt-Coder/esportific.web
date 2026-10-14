const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String },
  phone: { type: String },
  dob: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'] },
  timezone: { type: String, default: 'Asia/Kolkata' },
  organization: {
    name: { type: String, default: '' },
    logo: { type: String, default: '' },
  },
  appearanceMode: { type: String, enum: ['system', 'light', 'dark'], default: 'system' },
  integrations: {
    discordWebhookUrl: { type: String, default: '' },
    twitchChannelUrl: { type: String, default: '' },
  },
  role: { type: String, enum: ['organizer', 'admin'], default: 'organizer' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
