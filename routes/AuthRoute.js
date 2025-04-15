const express = require('express');
const authController = require('../controllers/Authcontroller');
const fixedTransfer = require('../utils/FixedTransfer');
const settingscontroller = require('../controllers/Settingscontroller');
const authMiddleware = require('../middleware/Authmiddleware');

const router = express.Router();

router.post('/signup', authController.Signup);
router.post('/signin', authController.Signin);
router.get('/dashboard', authController.DashBoard);
router.post('/transfer', fixedTransfer);
router.get('/transactions', authController.getTransferHistory);
router.post('/profile', authMiddleware, authController.getProfile);
router.patch('/settings', authMiddleware, authController.getsetting);




module.exports = router;