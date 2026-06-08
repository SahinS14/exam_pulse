const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema({
  name: String,
});

branchSchema.index(
  { name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

module.exports = mongoose.model("Branch", branchSchema);
