const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  title: String,
  fileUrl: String,
  fileName: String,
  fileSize: Number,
  mimeType: String,
  cloudinaryPublicId: String,
  cloudinaryResourceType: String,
  type: String,
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Module",
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

noteSchema.index({ moduleId: 1 });
noteSchema.index({ title: "text", type: "text" });

module.exports = mongoose.model("Note", noteSchema);
