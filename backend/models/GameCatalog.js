const mongoose = require('mongoose');

const gameFormatSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  key: { type: String, required: true, trim: true },
  scoringFields: [{ type: String }],
}, { _id: false });

const gameCatalogSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  logo: { type: String, default: null },
  logoLight: { type: String, default: null },
  logoDark: { type: String, default: null },
  maps: [{ type: String }],
  modes: [{ type: String }],
  formats: [gameFormatSchema],
}, { timestamps: true });

gameCatalogSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('GameCatalog', gameCatalogSchema);
