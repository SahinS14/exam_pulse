const mongoose = require("mongoose");

const semesterSchema = new mongoose.Schema({
  number: Number,
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
  },
});

semesterSchema.index({ branchId: 1 });
semesterSchema.index({ branchId: 1, number: 1 }, { unique: true });

module.exports = mongoose.model("Semester", semesterSchema);
