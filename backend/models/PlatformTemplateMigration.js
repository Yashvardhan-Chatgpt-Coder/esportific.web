const mongoose = require("mongoose");

const platformTemplateMigrationSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PlatformTemplateMigration", platformTemplateMigrationSchema);
