const mongoose = require('mongoose');

const userLogChangeSchema = new mongoose.Schema({
  field: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['changed', 'added', 'removed'], default: 'changed' },
  message: { type: String, default: '' },
  previousValue: { type: mongoose.Schema.Types.Mixed, default: null },
  newValue: { type: mongoose.Schema.Types.Mixed, default: null },
}, { _id: false });

const userLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorName: { type: String, default: '' },
  category: {
    type: String,
    enum: ['login', 'activity', 'account'],
    required: true,
  },
  action: { type: String, required: true },
  message: { type: String, required: true },
  changes: { type: [userLogChangeSchema], default: [] },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  device: { type: String, default: 'Unknown device' },
  location: { type: String, default: 'Unknown location' },
}, { timestamps: true });

userLogSchema.index({ userId: 1, category: 1, createdAt: -1 });

module.exports = mongoose.model('UserLog', userLogSchema);
