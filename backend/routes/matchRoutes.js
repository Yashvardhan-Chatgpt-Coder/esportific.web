const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', matchController.createMatch);
router.get('/event/:eventId/leaderboard', matchController.getEventLeaderboard);
router.get('/event/:eventId/standings', matchController.getEventStandings);
router.get('/event/:eventId', matchController.getMatchesByEvent);
router.put('/:id', matchController.updateMatch);
router.delete('/:id', matchController.deleteMatch);
router.get('/:matchId/results', matchController.getMatchResults);
router.post('/:matchId/results', matchController.saveMatchResults);

module.exports = router;
