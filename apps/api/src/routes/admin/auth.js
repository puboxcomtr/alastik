const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdminUser = require('../../models/AdminUser');
const { authenticate } = require('../../middleware/auth');
const router = express.Router();

/*
=======================================================================
ADMIN AUTH ENDPOİNTLERI
/api/admin/* endpointleri için
=======================================================================
*/

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: ['Email ve şifre gereklidir']
      });
    }

    const admin = await AdminUser.findOne({ email: email.toLowerCase() }).select('+password');
    if (!admin) {
      return res.status(401).json({
        message: ['Email veya şifre hatalı']
      });
    }

    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        message: ['Email veya şifre hatalı']
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        message: ['Hesap devre dışı bırakılmış. Yönetici ile iletişime geçiniz.']
      });
    }

    const token = jwt.sign(
      { 
        userId: admin._id, 
        email: admin.email, 
        role: admin.role,
        type: 'admin'
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    admin.lastLogin = new Date();
    await admin.save();

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

    res.cookie('adminToken', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json(adminData);
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      message: ['Sunucu hatası']
    });
  }
});

// Admin Profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    if (req.user.type !== 'admin') {
      return res.status(403).json({
        message: ['Erişim reddedildi. Admin yetkisi gereklidir.']
      });
    }

    const admin = await AdminUser.findById(req.user.userId).select('-password');
    if (!admin) {
      return res.status(404).json({
        message: ['Admin bulunamadı']
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
      message: ['Sunucu hatası']
    });
  }
});

// Admin Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    res.json({
      message: 'Başarıyla çıkış yapıldı'
    });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({
      message: ['Sunucu hatası']
    });
  }
});

// Change Password
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (req.user.type !== 'admin') {
      return res.status(403).json({
        message: ['Erişim reddedildi. Admin yetkisi gereklidir.']
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: ['Mevcut şifre ve yeni şifre gereklidir']
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: ['Yeni şifre en az 6 karakter olmalıdır']
      });
    }

    const admin = await AdminUser.findById(req.user.userId);
    if (!admin) {
      return res.status(404).json({
        message: ['Admin bulunamadı']
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
    if (!isValidPassword) {
      return res.status(400).json({
        message: ['Mevcut şifre hatalı']
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    admin.password = hashedPassword;
    await admin.save();

    res.json({
      message: 'Şifre başarıyla değiştirildi'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      message: ['Sunucu hatası']
    });
  }
});

module.exports = router;