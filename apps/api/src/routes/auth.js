const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Admin Login
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: ['Email and password are required']
      });
    }

    // Find admin user (include password for verification)
    const admin = await AdminUser.findOne({ email: email.toLowerCase() }).select('+password');
    if (!admin) {
      return res.status(401).json({
        message: ['Email or Password is invalid']
      });
    }

    // Check password
    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        message: ['Email or Password is invalid']
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        message: ['Account is deactivated. Please contact administrator.']
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: admin._id, 
        email: admin.email, 
        role: admin.role,
        type: 'admin'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Return admin data (without password)
    const adminData = {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      image: admin.avatar || '/images/avatars/default.png',
      permissions: admin.permissions,
      lastLogin: admin.lastLogin,
      token
    };

    // Set HttpOnly cookie for admin auth
    res.cookie('adminToken', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json(adminData);
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      message: ['Internal server error']
    });
  }
});

// Admin Profile
router.get('/admin/profile', authenticate, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.type !== 'admin') {
      return res.status(403).json({
        message: ['Access denied. Admin privileges required.']
      });
    }

    const admin = await AdminUser.findById(req.user.userId).select('-password');
    if (!admin) {
      return res.status(404).json({
        message: ['Admin not found']
      });
    }

    res.json({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      image: admin.avatar || '/images/avatars/default.png',
      permissions: admin.permissions,
      lastLogin: admin.lastLogin
    });
  } catch (error) {
    console.error('Admin profile error:', error);
    res.status(500).json({
      message: ['Internal server error']
    });
  }
});

// Admin Logout
router.post('/admin/logout', authenticate, async (req, res) => {
  try {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just return success
    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      message: ['Internal server error']
    });
  }
});

// Change Password
router.post('/admin/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Check if user is admin
    if (req.user.type !== 'admin') {
      return res.status(403).json({
        message: ['Access denied. Admin privileges required.']
      });
    }

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: ['Current password and new password are required']
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: ['New password must be at least 6 characters long']
      });
    }

    const admin = await AdminUser.findById(req.user.userId);
    if (!admin) {
      return res.status(404).json({
        message: ['Admin not found']
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
    if (!isValidPassword) {
      return res.status(400).json({
        message: ['Current password is incorrect']
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    admin.password = hashedPassword;
    await admin.save();

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: ['Internal server error']
    });
  }
});

module.exports = router;
