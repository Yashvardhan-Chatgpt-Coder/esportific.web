const mongoose = require("mongoose");

const supportRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: {
      type: String,
      required: true,
      enum: ["Account & billing", "Events and teams", "Technical issue", "Suggestions", "Other"],
    },
    message: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["New", "In review", "Resolved"],
      default: "New",
    },
  },
  { timestamps: true },
);

supportRequestSchema.index({ createdAt: -1 });
supportRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("SupportRequest", supportRequestSchema);
