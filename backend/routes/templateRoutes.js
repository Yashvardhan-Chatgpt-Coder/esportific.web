const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");

// Any signed-in organizer may read templates and their tags for exports.
router.get("/", protect, adminController.getPlatformTemplates);

module.exports = router;
