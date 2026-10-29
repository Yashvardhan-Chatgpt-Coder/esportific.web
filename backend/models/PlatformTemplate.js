const mongoose = require("mongoose");

const platformTemplateSchema = new mongoose.Schema(
  {
    templateKey: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    format: { type: String, required: true, trim: true, maxlength: 80 },
    previewUrl: { type: String, required: true, trim: true },
    // Backend renderer identifier consumed by mobile. Keep rendering data on
    // the server so newly published designs do not require an APK update.
    exportKey: { type: String, trim: true, default: "" },
    tags: {
      type: [{ type: String, trim: true, maxlength: 40 }],
      default: [],
      validate: {
        validator: (tags) => Array.isArray(tags) && tags.length <= 12,
        message: "A template can have up to 12 tags.",
      },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PlatformTemplate", platformTemplateSchema);
