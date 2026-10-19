const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/admin/user/AdminUser');
const { authenticateAdmin, loginAdmin, logoutAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors.array().map(error => error.msg)
      });
    }

    const { email, password } = req.body;

    const admin = await AdminUser.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(401).json({
        message: ['Email or Password is invalid']
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        message: ['Account is not active']
      });
    }

    if (admin.lockUntil && admin.lockUntil > Date.now()) {
      return res.status(401).json({
        message: ['Account is temporarily locked. Please try again later.']
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      await admin.incLoginAttempts();
      return res.status(401).json({
        message: ['Email or Password is invalid']
      });
    }

    await admin.resetLoginAttempts();

    await admin.updateLastLogin();

    const token = jwt.sign(
      { 
        id: admin._id,
        email: admin.email,
        role: admin.role,
        type: 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '8h' }
    );

    res.json({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      avatar: admin.avatar,
      permissions: admin.permissions,
      token,
      lastLogin: admin.lastLogin
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      message: ['Internal server error']
    });
  }
});

router.get('/profile', authenticateAdmin, async (req, res) => {
  try {
    const admin = await AdminUser.findById(req.user.id).select('-password');
    if (!admin) {
      return res.status(404).json({
        message: 'Admin not found'
      });
    }

    res.json({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      avatar: admin.avatar,
      permissions: admin.permissions,
      lastLogin: admin.lastLogin,
      preferences: admin.preferences
    });
  } catch (error) {
    console.error('Admin profile error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

router.post('/logout', authenticateAdmin, async (req, res) => {
  try {
    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

router.put('/profile', authenticateAdmin, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('preferences.theme').optional().isIn(['light', 'dark', 'auto']),
  body('preferences.language').optional().isIn(['tr', 'en'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors.array().map(error => error.msg)
      });
    }

    const admin = await AdminUser.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        message: 'Admin not found'
      });
    }

    const { name, preferences } = req.body;
    if (name) admin.name = name;
    if (preferences) {
      admin.preferences = { ...admin.preferences, ...preferences };
    }

    await admin.save();

    res.json({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      avatar: admin.avatar,
      preferences: admin.preferences,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('Admin profile update error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

router.put('/change-password', authenticateAdmin, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: errors.array().map(error => error.msg)
      });
    }

    const { currentPassword, newPassword } = req.body;
    const admin = await AdminUser.findById(req.user.id).select('+password');

    if (!admin) {
      return res.status(404).json({
        message: 'Admin not found'
      });
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        message: ['Current password is incorrect']
      });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Admin password change error:', error);
    res.status(500).json({
      message: 'Internal server error'
    });
  }
});

module.exports = router; 