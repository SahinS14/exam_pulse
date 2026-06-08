const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { protect } = require("../middleware/authMiddleware");
const { createRateLimiter } = require("../middleware/rateLimit");
const {
  validateRegisterRequest,
  validateLoginRequest,
} = require("../middleware/validation");
const User = require("../models/User");

const router = express.Router();
const authRateLimit = createRateLimiter({
  keyPrefix: "auth",
  windowMs: 15 * 60 * 1000,
  maxRequests: 20,
  message: "Too many authentication attempts. Please try again later.",
});

const normalizeEmail = (email) =>
  typeof email === "string" ? email.trim().toLowerCase() : "";

const createToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const buildUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isPaid: user.isPaid,
  accessExpiry: user.accessExpiry,
  createdAt: user.createdAt,
});

router.get("/session", protect, async (req, res) => {
  return res.json({
    user: buildUserResponse(req.user),
  });
});

router.post("/register", authRateLimit, validateRegisterRequest, async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      passwordHash,
      isPaid: false,
    });

    return res.status(201).json({
      token: createToken(user._id),
      user: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Registration failed" });
  }
});

router.post("/login", authRateLimit, validateLoginRequest, async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.json({
      token: createToken(user._id),
      user: buildUserResponse(user),
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed" });
  }
});

module.exports = router;
