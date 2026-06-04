const mongoose = require("mongoose");

const topicSchema = new mongoose.Schema({
  name: String,
  moduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Module",
  },
});

topicSchema.index({ moduleId: 1 });
topicSchema.index({ moduleId: 1, name: 1 });

module.exports = mongoose.model("Topic", topicSchema);
