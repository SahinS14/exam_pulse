const mongoose = require("mongoose");

const moduleSchema = new mongoose.Schema({
  number: Number,
  title: String,
  subjectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject",
  },
});

moduleSchema.index({ subjectId: 1 });
moduleSchema.index({ subjectId: 1, number: 1 }, { unique: true });

module.exports = mongoose.model("Module", moduleSchema);
