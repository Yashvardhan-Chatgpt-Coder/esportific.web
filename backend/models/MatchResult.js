const mongoose = require('mongoose');

const matchResultSchema = new mongoose.Schema({
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  placement: { type: Number, required: true },
  kills: { type: Number, default: 0 },
  playerKills: { type: Map, of: Number, default: {} },
  totalPoints: { type: Number, default: 0 },
  isBanned: { type: Boolean, default: false }
}, { timestamps: true });

matchResultSchema.index({ organizerId: 1, matchId: 1 });

module.exports = mongoose.model('MatchResult', matchResultSchema);
