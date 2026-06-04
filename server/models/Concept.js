const mongoose = require("mongoose");

const conceptSchema = new mongoose.Schema({
  title: String,
  explanation: String,
  images: [String],
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Module",
  },
});

conceptSchema.index({ moduleId: 1 });
conceptSchema.index({ title: "text", explanation: "text" });

module.exports = mongoose.model("Concept", conceptSchema);
