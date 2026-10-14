const mongoose = require("mongoose");

const scoringRuleSchema = new mongoose.Schema(
  {
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true },
    format: { type: String, default: "battle_royale" },
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: "GameCatalog", default: null },
    gameName: { type: String, default: "" },
    isGeneric: { type: Boolean, default: true },
    scoringFields: [{ type: String }],
    description: { type: String, default: "" },
    killPoints: { type: Number, default: 1 },
    winPoints: { type: Number, default: 0 },
    drawPoints: { type: Number, default: 0 },
    lossPoints: { type: Number, default: 0 },
    isTemplate: { type: Boolean, default: true },
    isPlatform: { type: Boolean, default: false },
    placementPoints: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ScoringRule", scoringRuleSchema);
