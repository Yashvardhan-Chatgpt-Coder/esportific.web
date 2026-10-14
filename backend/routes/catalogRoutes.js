const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

const router = express.Router();

router.use(protect);
router.get('/games', adminController.getGames);

module.exports = router;
