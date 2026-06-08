const express = require("express");

const Concept = require("../models/Concept");
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
      const concepts = await Concept.find(query).sort({ createdAt: -1 }).lean();
      return res.json(concepts);
    }

    const [concepts, totalItems] = await Promise.all([
      Concept.find(query)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Concept.countDocuments(query),
    ]);

    return res.json(
      buildPaginatedResponse({
        items: concepts,
        total: totalItems,
        page: pagination.page,
        limit: pagination.limit,
      })
    );
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch concepts" });
  }
});

module.exports = router;
