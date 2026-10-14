const mongoose = require('mongoose');

const auditChangeSchema = new mongoose.Schema({
  field: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, enum: ['changed', 'added', 'removed'], default: 'changed' },
  message: { type: String, default: '' },
  previousValue: { type: mongoose.Schema.Types.Mixed, default: null },
  newValue: { type: mongoose.Schema.Types.Mixed, default: null },
}, { _id: false });

const auditLogSchema = new mongoose.Schema({
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  category: {
    type: String,
    enum: ['event', 'team', 'match', 'result', 'scoring', 'export'],
    required: true,
  },
  action: { type: String, required: true },
  message: { type: String, required: true },
  changes: { type: [auditChangeSchema], default: [] },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

auditLogSchema.index({ organizerId: 1, eventId: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
