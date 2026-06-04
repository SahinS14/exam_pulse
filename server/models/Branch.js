const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema({
  name: String,
});

branchSchema.index({ name: 1 });

module.exports = mongoose.model("Branch", branchSchema);
