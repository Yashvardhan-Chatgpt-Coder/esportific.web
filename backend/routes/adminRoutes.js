const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.use(protect, adminOnly);

router.get("/users", adminController.getUsers);
router.get("/support-requests", adminController.getSupportRequests);
router.put("/support-requests/:id", adminController.updateSupportRequest);
router.get("/users/:id/events", adminController.getUserEvents);
router.get("/users/:id/teams", adminController.getUserTeams);
router.get("/users/:id/scoring-rules", adminController.getUserScoringRules);
router.get("/users/:id/logs", adminController.getUserLogs);
router.get("/users/:id", adminController.getUserById);
router.get("/orphaned-assets", adminController.getOrphanedAssets);
router.post("/orphaned-assets/cleanup", adminController.deleteOrphanedAssets);
router.get("/games", adminController.getGames);
router.post(
  "/games",
  upload.fields([
    { name: "logoLight", maxCount: 1 },
    { name: "logoDark", maxCount: 1 },
  ]),
  adminController.createGame,
);
router.put(
  "/games/:id",
  upload.fields([
    { name: "logoLight", maxCount: 1 },
    { name: "logoDark", maxCount: 1 },
  ]),
  adminController.updateGame,
);
router.delete("/games/:id", adminController.deleteGame);
router.get("/templates", adminController.getPlatformTemplates);
router.post("/templates", adminController.createPlatformTemplate);
router.put("/templates/:id", adminController.updatePlatformTemplate);
router.delete("/templates/:id", adminController.deletePlatformTemplate);
router.get("/scoring-rules", adminController.getPlatformScoringRules);
router.post("/scoring-rules", adminController.createPlatformScoringRule);
router.put("/scoring-rules/:id", adminController.updatePlatformScoringRule);
router.delete("/scoring-rules/:id", adminController.deletePlatformScoringRule);

module.exports = router;
