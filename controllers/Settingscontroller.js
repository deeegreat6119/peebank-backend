const express = require('express');
const User = require("../models/Usermodel");
const authMiddleware = require('../middleware/Authmiddleware.js');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('firstName lastName email phone address notifications security');
    
    if (!user) {
      return res.status(404).json({ 
        status: 'fail', 
        message: 'User not found' 
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        notifications: user.notifications || {
          email: true,
          sms: false,
          push: true
        },
        security: user.security || {
          twoFactorAuth: false,
          biometricLogin: false
        }
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch settings' 
    });
  }
});

// Update profile information
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const { firstName, lastName, phone, address } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        firstName, 
        lastName, 
        phone, 
        address 
      },
      { new: true, runValidators: true }
    ).select('firstName lastName email phone address');

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to update profile' 
    });
  }
});

// Update notification preferences
router.patch('/notifications', authMiddleware, async (req, res) => {
  try {
    const { email, sms, push } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        notifications: { email, sms, push }
      },
      { new: true }
    ).select('notifications');

    res.status(200).json({
      status: 'success',
      message: 'Notification preferences updated',
      data: updatedUser.notifications
    });
  } catch (error) {
    console.error('Update notifications error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to update notifications' 
    });
  }
});

// Update security settings
router.patch('/security', authMiddleware, async (req, res) => {
  try {
    const { twoFactorAuth, biometricLogin } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { 
        security: { twoFactorAuth, biometricLogin }
      },
      { new: true }
    ).select('security');

    res.status(200).json({
      status: 'success',
      message: 'Security settings updated',
      data: updatedUser.security
    });
  } catch (error) {
    console.error('Update security error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to update security settings' 
    });
  }
});

// Change password
router.patch('/reset-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id).select('+password');
    
    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ 
        status: 'fail', 
        message: 'Current password is incorrect' 
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to change password' 
    });
  }
});

module.exports = router;
