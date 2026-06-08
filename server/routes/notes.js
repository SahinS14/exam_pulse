const express = require("express");

const Note = require("../models/Note");
const { protect } = require("../middleware/authMiddleware");
const accessCheck = require("../middleware/accessCheck");
const {
  getPaginationParams,
  buildPaginatedResponse,
} = require("../utils/pagination");

const router = express.Router();

router.get("/:moduleId", protect, accessCheck, async (req, res) => {
  try {
    const query = { moduleId: req.params.moduleId };
    const pagination = getPaginationParams(req.query);

    if (!pagination) {
      const notes = await Note.find(query).sort({ uploadedAt: -1 }).lean();
      return res.json(notes);
    }

    const [notes, totalItems] = await Promise.all([
      Note.find(query)
        .sort({ uploadedAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Note.countDocuments(query),
    ]);

    return res.json(
      buildPaginatedResponse({
        items: notes,
        total: totalItems,
        page: pagination.page,
        limit: pagination.limit,
      })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch notes" });
  }
});

module.exports = router;
