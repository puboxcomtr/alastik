const express = require('express');
const router = express.Router();
const Admin = require('../../../models/admin/user/Admin');
const ActivityLog = require('../../../models/admin/user/ActivityLog');
const BlockedIP = require('../../../models/admin/user/BlockedIP');
const { loginAdmin, logoutAdmin, authenticateAdmin, getClientIP } = require('../../../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email ve şifre gereklidir'
      });
    }

    const clientIP = getClientIP(req);
    const isBlocked = await BlockedIP.isBlocked(clientIP);

    if (isBlocked) {
      await ActivityLog.logActivity({
      site: req.site,
        action: 'login_failed',
        module: 'auth',
        details: { reason: 'Engellenen IP', email, ip: clientIP },
        ipAddress: clientIP,
        userAgent: req.get('user-agent'),
        status: 'failed'
      });

      return res.status(403).json({
        success: false,
        message: 'IP adresiniz engellenmiştir'
      });
    }

    const admin = await Admin.findByEmail(email);

    if (!admin) {
      await ActivityLog.logActivity({
      site: req.site,
        action: 'login_failed',
        module: 'auth',
        details: { reason: 'Kullanıcı bulunamadı', email },
        ipAddress: clientIP,
        userAgent: req.get('user-agent'),
        status: 'failed'
      });

      return res.status(401).json({
        success: false,
        message: 'Email veya şifre hatalı'
      });
    }

    if (admin.isLocked) {
      await ActivityLog.logActivity({
      site: req.site,
        user: admin._id,
        action: 'login_failed',
        module: 'auth',
        details: { reason: 'Hesap kilitli' },
        ipAddress: clientIP,
        userAgent: req.get('user-agent'),
        status: 'failed'
      });

      return res.status(403).json({
        success: false,
        message: 'Hesabınız geçici olarak kilitlenmiştir. Lütfen daha sonra tekrar deneyin.'
      });
    }

    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      await admin.incLoginAttempts();

      await ActivityLog.logActivity({
      site: req.site,
        user: admin._id,
        action: 'login_failed',
        module: 'auth',
        details: { reason: 'Hatalı şifre', attempts: admin.loginAttempts + 1 },
        ipAddress: clientIP,
        userAgent: req.get('user-agent'),
        status: 'failed'
      });

      return res.status(401).json({
        success: false,
        message: 'Email veya şifre hatalı'
      });
    }

    if (!admin.isActive) {
      await ActivityLog.logActivity({
      site: req.site,
        user: admin._id,
        action: 'login_failed',
        module: 'auth',
        details: { reason: 'Hesap aktif değil' },
        ipAddress: clientIP,
        userAgent: req.get('user-agent'),
        status: 'failed'
      });

      return res.status(403).json({
        success: false,
        message: 'Hesabınız aktif değil'
      });
    }

    const loginData = await loginAdmin(admin, req, res);

    await ActivityLog.logActivity({
      site: req.site,
      user: admin._id,
      action: 'login',
      module: 'auth',
      details: {
        email: admin.email,
        role: admin.role
      },
      ipAddress: clientIP,
      userAgent: req.get('user-agent'),
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Giriş başarılı',
      data: loginData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Giriş yapılırken bir hata oluştu'
    });
  }
});

router.post('/logout', authenticateAdmin, async (req, res) => {
  try {
    await logoutAdmin(req, res);

    await ActivityLog.logActivity({
      site: req.site,
      user: req.adminId,
      action: 'logout',
      module: 'auth',
      ipAddress: getClientIP(req),
      userAgent: req.get('user-agent'),
      status: 'success'
    });

    res.json({
      success: true,
      message: 'Çıkış başarılı'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Çıkış yapılırken bir hata oluştu'
    });
  }
});

router.get('/me', authenticateAdmin, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        admin: req.admin,
        permissions: req.admin.permissions
      }
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Bilgiler alınırken bir hata oluştu'
    });
  }
});

module.exports = router;