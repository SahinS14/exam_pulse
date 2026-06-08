const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  name: String,
  semesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Semester",
  },
  syllabusFileUrl: String,
  syllabusFileName: String,
  syllabusFileSize: Number,
  syllabusMimeType: String,
  syllabusUploadedAt: Date,
  syllabusFileCloudinaryPublicId: String,
  syllabusFileCloudinaryResourceType: String,
});

subjectSchema.index({ semesterId: 1 });
subjectSchema.index(
  { semesterId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);
subjectSchema.index({ name: "text" });

module.exports = mongoose.model("Subject", subjectSchema);
