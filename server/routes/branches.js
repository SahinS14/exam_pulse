const express = require("express");

const Branch = require("../models/Branch");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");

const router = express.Router();

router.get("/", protect, accessCheck, async (req, res) => {
  try {
    const branches = await Branch.find();
    return res.json(branches);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch branches" });
  }
});

module.exports = router;
