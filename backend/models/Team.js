const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  name: { type: String, required: true },
  inGameId: { type: String }
});

const teamSchema = new mongoose.Schema({
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  logoUrl: { type: String },
  tags: [{ type: String }],
  contactMobile: { type: String, default: '' },
  notes: { type: String, default: '' },
  players: [playerSchema],
  isPoolTeam: { type: Boolean, default: true },
  source: { type: String, enum: ['pool', 'event'], default: 'pool' },
  sourceEventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', default: null },
  sourceEventName: { type: String, default: '' }
}, { timestamps: true });

teamSchema.index({ organizerId: 1, createdAt: -1 });

// Tenant-scoping query middleware (automatically filters by organizerId if passed via context)
// To be fully implemented in controllers/auth later.

module.exports = mongoose.model('Team', teamSchema);
