const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  name: { type: String, required: true },
  map: { type: String },
  status: { type: String, enum: ['Pending Results', 'Completed'], default: 'Pending Results' },
  order: { type: Number, default: 0 }
}, { timestamps: true });

matchSchema.index({ organizerId: 1, eventId: 1, order: 1, createdAt: 1 });

module.exports = mongoose.model('Match', matchSchema);
