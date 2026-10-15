const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  googleId: { type: String, default: undefined },
  avatar: { type: String },
  phone: { type: String },
  dob: { type: Date },
  gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'] },
  timezone: { type: String, default: 'Asia/Kolkata' },
  organization: {
    name: { type: String, default: '' },
    logo: { type: String, default: '' },
  },
  appearanceMode: { type: String, enum: ['system', 'light', 'dark'], default: 'light' },
  integrations: {
    discordWebhookUrl: { type: String, default: '' },
    twitchChannelUrl: { type: String, default: '' },
  },
  authSessions: {
    type: [{
      _id: false,
      sessionId: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    }],
    default: [],
    select: false,
  },
  role: { type: String, enum: ['organizer', 'admin'], default: 'organizer' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
