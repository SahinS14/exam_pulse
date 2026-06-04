const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  email: {
    type: String,
    unique: true,
  },
  phone: String,
  passwordHash: String,
  role: {
    type: String,
    default: "student",
  },
  isPaid: {
    type: Boolean,
    default: false,
  },
  accessExpiry: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.index({ role: 1 });
userSchema.index({ isPaid: 1, accessExpiry: 1 });

module.exports = mongoose.model("User", userSchema);
