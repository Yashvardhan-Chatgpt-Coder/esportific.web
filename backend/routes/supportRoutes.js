const express = require("express");
const router = express.Router();
const supportController = require("../controllers/supportController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/", supportController.createSupportRequest);

module.exports = router;
