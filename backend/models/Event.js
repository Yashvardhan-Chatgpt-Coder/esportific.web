const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'GameCatalog', default: null },
  game: { type: String, default: '' },
  format: { type: String, default: '' },
  startDate: { type: String },
  endDate: { type: String },
  status: { type: String, enum: ['Draft', 'Ongoing', 'Completed'], default: 'Draft' },
  scoringRuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScoringRule' },
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team' }]
}, { timestamps: true });

eventSchema.index({ organizerId: 1, createdAt: -1 });

module.exports = mongoose.model('Event', eventSchema);
