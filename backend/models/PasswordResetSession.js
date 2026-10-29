const mongoose = require('mongoose');

const passwordResetSessionSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, expires: 0 },
});

module.exports = mongoose.model('PasswordResetSession', passwordResetSessionSchema);
