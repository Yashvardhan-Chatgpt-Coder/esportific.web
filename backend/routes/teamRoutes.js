const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/authMiddleware');

// Direct template download (public endpoint for browser/mobile direct download)
router.get('/template', teamController.downloadTemplate);

router.use(protect);

router.post('/', upload.single('logo'), teamController.createTeam);
router.post('/bulk', teamController.createTeamsBulk);
router.get('/', teamController.getTeams);
router.get('/players/suggestions', teamController.getPlayerSuggestions);
router.get('/:id/stats', teamController.getTeamStats);
router.get('/:id', teamController.getTeamById);
router.put('/:id', upload.single('logo'), teamController.updateTeam);
router.delete('/:id', teamController.deleteTeam);

module.exports = router;
