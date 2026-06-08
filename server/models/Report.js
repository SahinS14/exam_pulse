const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
  },
  reason: String,
  status: {
    type: String,
    default: "pending",
  },
});

reportSchema.index({ status: 1 });
reportSchema.index({ questionId: 1, status: 1 });
reportSchema.index({ userId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model("Report", reportSchema);
