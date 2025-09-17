const express = require('express');
const AdminUser = require('../../models/AdminUser');

const router = express.Router();

/*
=======================================================================
PUBLIC AUTH ENDPOİNT - NEXTAUTH İÇİN
/api/auth/login endpoint'i
=======================================================================
*/

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email ve şifre gereklidir'
      });
    }

    const admin = await AdminUser.findByEmail(email).select('+password');
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı adı veya şifre hatalı'
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Hesap devre dışı bırakılmış'
      });
    }

    if (admin.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Hesap geçici olarak kilitlenmiş'
      });
    }

    const isPasswordValid = await admin.comparePassword(password);
    
    if (!isPasswordValid) {
      await admin.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Kullanıcı adı veya şifre hatalı'
      });
    }

    await admin.resetLoginAttempts();
    await admin.updateLastLogin();

    res.json({
      success: true,
      user: {
        _id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

module.exports = router;