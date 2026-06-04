const mongoose = require("mongoose");

const yearAppearedSchema = new mongoose.Schema(
  {
    examName: String,
    year: Number,
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema({
  questionText: String,
  solutionText: String,
  markCategory: String,
  images: [String],
  yearAppeared: [yearAppearedSchema],
  frequency: Number,
  tags: [String],
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Topic",
  },
  isMostRepeated: {
    type: Boolean,
    default: false,
  },
  isTopRevision: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

questionSchema.pre("save", function setFrequency() {
  this.frequency = Array.isArray(this.yearAppeared) ? this.yearAppeared.length : 0;
});

questionSchema.index({ topicId: 1 });
questionSchema.index({ topicId: 1, markCategory: 1 });
questionSchema.index({ isMostRepeated: 1, createdAt: -1 });
questionSchema.index({ isTopRevision: 1, createdAt: -1 });
questionSchema.index({ questionText: "text", solutionText: "text", tags: "text" });

module.exports = mongoose.model("Question", questionSchema);
