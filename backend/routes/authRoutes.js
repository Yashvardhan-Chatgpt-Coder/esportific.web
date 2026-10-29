const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Public routes
router.post('/send-otp', authController.sendOtp);
router.post('/password-reset/send-otp', authController.sendPasswordResetOtp);
router.post('/password-reset/verify-otp', authController.verifyPasswordResetOtp);
router.post('/password-reset/complete', authController.completePasswordReset);
router.post('/register', authController.registerUser);
router.post('/login', authController.loginUser);
router.post('/admin/login', authController.loginAdmin);
router.post('/google', authController.googleLogin);

// Protected routes
router.get('/profile', protect, authController.getUserProfile);
router.put(
  '/profile',
  protect,
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'organizationLogo', maxCount: 1 },
  ]),
  authController.updateUserProfile,
);
router.put('/password', protect, authController.updatePassword);
router.post('/logout', protect, authController.logoutUser);

module.exports = router;
