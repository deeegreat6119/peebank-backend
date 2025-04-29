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
router.post('/deposit', authController.createDeposit)
router.get('/transactions', authController.getTransactionHistory);
// router.post('/transactions', authController.handleTransactions);
router.post('/profile', authMiddleware, authController.getProfile);
router.patch('/settings', authMiddleware, authController.getsetting);




module.exports = router;