const express = require("express");
const router = express.Router();
const scoringRuleController = require("../controllers/scoringRuleController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect);

router.post("/", scoringRuleController.createScoringRule);
router.get("/", scoringRuleController.getScoringRules);
router.get("/:id/usage", scoringRuleController.getScoringRuleUsage);
router.get("/:id", scoringRuleController.getScoringRuleById);
router.put("/:id", scoringRuleController.updateScoringRule);
router.delete("/:id", scoringRuleController.deleteScoringRule);

module.exports = router;
