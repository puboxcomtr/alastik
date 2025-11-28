const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Cart = require('../models/admin/order/Cart');
const Wishlist = require('../models/Wishlist');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Google OAuth geçici olarak devre dışı (client yok)

// Rate limiting for auth endpoints - Test süreçleri için yüksek limit
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // limit each IP to 20 requests per minute (artırıldı)
  message: 'Çok fazla giriş denemesi, lütfen daha sonra tekrar deneyin.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Development'ta auth rate limiting'i gevşet
    return process.env.NODE_ENV === 'development';
  }
});

const registerLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 registration attempts per minute (artırıldı)
  message: 'Çok fazla kayıt denemesi, lütfen daha sonra tekrar deneyin.',
  skip: (req) => {
    // Development'ta register rate limiting'i gevşet
    return process.env.NODE_ENV === 'development';
  }
});

// User Registration
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const requestId = `auth_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;
    console.info('🟦 [AUTH][REGISTER][START]', {
      requestId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      payload: {
        username: req.body?.username,
        email: req.body?.email,
        phone: req.body?.phone ? '***masked***' : undefined,
        gdprConsent: req.body?.gdprConsent,
        marketingConsent: req.body?.marketingConsent
      }
    });
    const {
      username,
      email,
      phone,
      password,
      gdprConsent,
      marketingConsent
    } = req.body;

    // Validation: email veya phone zorunlu; şifre zorunlu
    if ((!email && !phone) || !password || !username) {
      console.warn('🟨 [AUTH][REGISTER][VALIDATION]', { requestId, reason: 'missing_required_fields' });
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı adı ve (email veya telefon), ayrıca şifre gereklidir'
      });
    }

    if (password.length < 6) {
      console.warn('🟨 [AUTH][REGISTER][VALIDATION]', { requestId, reason: 'password_too_short' });
      return res.status(400).json({
        success: false,
        message: 'Şifre en az 6 karakter olmalıdır'
      });
    }

    // Input normalize
    const normalizedEmail = email ? email.toLowerCase().trim() : undefined;
    const normalizedPhone = phone ? phone.replace(/\D/g, '') : undefined;

    // Uniqueness checks
    if (normalizedEmail) {
      const existingByEmail = await User.findOne({ email: normalizedEmail });
      if (existingByEmail) {
        console.warn('🟨 [AUTH][REGISTER][EXISTS]', { requestId, field: 'email', email: normalizedEmail });
        return res.status(400).json({ success: false, message: 'Bu email adresi zaten kayıtlı' });
      }
    }

    if (normalizedPhone) {
      const existingByPhone = await User.findOne({ 'profile.phone': normalizedPhone });
      if (existingByPhone) {
        console.warn('🟨 [AUTH][REGISTER][EXISTS]', { requestId, field: 'phone', phone: '***masked***' });
        return res.status(400).json({ success: false, message: 'Bu telefon numarası zaten kayıtlı' });
      }
    }

    // Create user
    const user = new User({
      username,
      ...(normalizedEmail ? { email: normalizedEmail } : {}),
      // Şifreyi burada hash'lemiyoruz; model pre-save hook'u hash'liyor
      password: password,
      profile: {
        firstName: username,
        lastName: undefined,
        ...(normalizedPhone ? { phone: normalizedPhone } : {})
      },
      gdprConsent: {
        given: gdprConsent || false,
        givenAt: gdprConsent ? new Date() : null,
        version: '1.0',
        ip: req.ip
      },
      marketingConsent: {
        given: marketingConsent || false,
        givenAt: marketingConsent ? new Date() : null,
        channels: {
          email: marketingConsent || false,
          sms: false,
          push: false
        }
      }
    });

    await user.save();
    console.info('✅ [AUTH][REGISTER][SAVED]', { requestId, userId: user._id });

    // Create default cart and wishlist
    await Cart.getOrCreateForUser(user._id);
    await Wishlist.getOrCreateDefault(user._id);

    // Generate JWT tokens
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );
    console.info('✅ [AUTH][REGISTER][TOKEN_CREATED]', { requestId, userId: user._id });

    res.status(201).json({
      success: true,
      message: 'Hesap başarıyla oluşturuldu',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          fullName: user.fullName
        },
        token,
        refreshToken
      }
    });
    console.info('🟩 [AUTH][REGISTER][RESPONSE]', { requestId, success: true, userId: user._id });

  } catch (error) {
    console.error('🟥 [AUTH][REGISTER][ERROR]', { message: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Kayıt sırasında bir hata oluştu'
    });
  }
});

  // User Login
  router.post('/login', authLimiter, async (req, res) => {
  try {
    const requestId = `auth_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;
    const { identifier, password } = req.body;
    console.info('🟦 [AUTH][LOGIN][START]', {
      requestId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      payload: {
        identifier: identifier ? (identifier.includes('@') ? identifier.toLowerCase() : '***masked_phone***') : undefined
      }
    });

    if (!identifier || !password) {
      console.warn('🟨 [AUTH][LOGIN][VALIDATION]', { requestId, reason: 'missing_identifier_or_password' });
      return res.status(400).json({
        success: false,
        message: 'Email/telefon ve şifre gereklidir'
      });
    }

    // Find user by email or phone (telefon için normalize et)
    const normalizedPhone = identifier.replace(/\D/g, '');
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { 'profile.phone': normalizedPhone }
      ]
    }).select('+password');
    if (!user) {
      console.warn('🟨 [AUTH][LOGIN][NOT_FOUND]', { requestId });
      return res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı bilgileri'
      });
    }

    // Check account status
    if (user.accountStatus !== 'active') {
      console.warn('🟨 [AUTH][LOGIN][INACTIVE]', { requestId, userId: user._id, status: user.accountStatus });
      return res.status(401).json({
        success: false,
        message: 'Hesabınız aktif değil. Lütfen email adresinizi doğrulayın.'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.warn('🟨 [AUTH][LOGIN][WRONG_PASSWORD]', { requestId, userId: user._id });
      return res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı bilgileri'
      });
    }

    // Update last active
    user.lastActiveAt = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );
    console.info('✅ [AUTH][LOGIN][SUCCESS]', { requestId, userId: user._id });

    res.json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          fullName: user.fullName,
          customerSegment: user.customerSegment,
          loyaltyPoints: user.loyaltyPoints
        },
        token,
        refreshToken
      }
    });
    console.info('🟩 [AUTH][LOGIN][RESPONSE]', { requestId, success: true, userId: user._id });

  } catch (error) {
    console.error('🟥 [AUTH][LOGIN][ERROR]', { message: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Giriş sırasında bir hata oluştu'
    });
  }
});

// Get User Profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          profile: user.profile,
          addresses: user.addresses,
          garage: user.garage,
          preferences: user.preferences,
          customerSegment: user.customerSegment,
          loyaltyPoints: user.loyaltyPoints,
          statistics: user.statistics,
          accountStatus: user.accountStatus,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt,
          lastActiveAt: user.lastActiveAt
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profil bilgileri alınırken hata oluştu'
    });
  }
});

// Update User Profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const updates = req.body;
    const allowedUpdates = [
      'profile.firstName',
      'profile.lastName',
      'profile.phone',
      'profile.birthDate',
      'profile.gender',
      'preferences'
    ];

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Update allowed fields
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        if (key.includes('.')) {
          const [parent, child] = key.split('.');
          if (!user[parent]) user[parent] = {};
          user[parent][child] = updates[key];
        } else {
          user[key] = updates[key];
        }
      }
    });

    await user.save();

    res.json({
      success: true,
      message: 'Profil başarıyla güncellendi',
      data: { user }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Profil güncellenirken hata oluştu'
    });
  }
});

// Favorites
router.get('/favorites', authenticate, async (req, res) => {
  const user = await User.findById(req.userId).populate('favorites.productId');
  if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
  res.json({ success: true, data: user.favorites });
});

router.post('/favorites', authenticate, async (req, res) => {
  const { productId } = req.body;
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
  await user.addToFavorites(productId);
  res.status(201).json({ success: true });
});

router.delete('/favorites/:productId', authenticate, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
  await user.removeFromFavorites(req.params.productId);
  res.json({ success: true });
});

// Garage
router.get('/garage', authenticate, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
  res.json({ success: true, data: user.garage });
});

router.post('/garage', authenticate, async (req, res) => {
  const { marka, model, yil, modifikasyon, nickname, plate, region } = req.body || {};
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
  user.garage.push({ marka, model, yil, modifikasyon, nickname, plate, region });
  await user.save();
  res.status(201).json({ success: true, data: user.garage[user.garage.length - 1] });
});

router.delete('/garage/:index', authenticate, async (req, res) => {
  const idx = parseInt(req.params.index);
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
  if (Number.isNaN(idx) || idx < 0 || idx >= user.garage.length) {
    return res.status(400).json({ success: false, message: 'Geçersiz araç indexi' });
  }
  user.garage.splice(idx, 1);
  await user.save();
  res.json({ success: true });
});

// Add Address
router.post('/addresses', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    const newAddress = {
      ...req.body,
      createdAt: new Date()
    };

    // İlk adres ise default yap
    if (user.addresses.length === 0) {
      newAddress.isDefault = true;
    }

    user.addresses.push(newAddress);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Adres başarıyla eklendi',
      data: { address: user.addresses[user.addresses.length - 1] }
    });

  } catch (error) {
    console.error('Add address error:', error);
    res.status(500).json({
      success: false,
      message: 'Adres eklenirken hata oluştu'
    });
  }
});

// Update Address
router.put('/addresses/:addressId', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Adres bulunamadı'
      });
    }

    Object.assign(address, req.body);
    await user.save();

    res.json({
      success: true,
      message: 'Adres başarıyla güncellendi',
      data: { address }
    });

  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({
      success: false,
      message: 'Adres güncellenirken hata oluştu'
    });
  }
});

// Delete Address
router.delete('/addresses/:addressId', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Adres bulunamadı'
      });
    }

    // Default adresi siliyorsa, başka bir adresi default yap
    if (address.isDefault && user.addresses.length > 1) {
      const otherAddress = user.addresses.find(addr => 
        addr._id.toString() !== req.params.addressId
      );
      if (otherAddress) {
        otherAddress.isDefault = true;
      }
    }

    user.addresses.pull(req.params.addressId);
    await user.save();

    res.json({
      success: true,
      message: 'Adres başarıyla silindi'
    });

  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({
      success: false,
      message: 'Adres silinirken hata oluştu'
    });
  }
});

// Change Password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Mevcut şifre ve yeni şifre gereklidir'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Yeni şifre en az 6 karakter olmalıdır'
      });
    }

    const user = await User.findById(req.userId).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mevcut şifre yanlış'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    await user.save();

    res.json({
      success: true,
      message: 'Şifre başarıyla güncellendi'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Şifre değiştirilirken hata oluştu'
    });
  }
});

// Get User Orders
router.get('/orders', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const Order = require('../models/admin/catalog/Order');
    const orders = await Order.getOrdersByUser(req.userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    const totalOrders = await Order.countDocuments({ 
      userId: req.userId,
      ...(status && { status })
    });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalOrders,
          pages: Math.ceil(totalOrders / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Siparişler alınırken hata oluştu'
    });
  }
});

// Google OAuth Login
// Google OAuth geçici olarak devre dışı
router.post('/google', authLimiter, async (req, res) => {
  return res.status(503).json({ success: false, message: 'Google ile giriş geçici olarak devre dışı' });
});

// Logout (client-side token removal)
router.post('/logout', authenticate, (req, res) => {
  res.json({
    success: true,
    message: 'Başarıyla çıkış yapıldı'
  });
});

// DEV-ONLY: Şifre sıfırlama (sadece development ortamında)
router.post('/dev/reset-password', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Bu uç sadece development ortamında kullanılabilir' });
    }

    const { email, newPassword } = req.body || {};
    const requestId = `auth_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;
    console.info('🟦 [AUTH][DEV_RESET_PASSWORD][START]', { requestId, email });

    if (!email || !newPassword || newPassword.length < 6) {
      console.warn('🟨 [AUTH][DEV_RESET_PASSWORD][VALIDATION]', { requestId });
      return res.status(400).json({ success: false, message: 'Geçerli email ve en az 6 karakter şifre gereklidir' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      console.warn('🟨 [AUTH][DEV_RESET_PASSWORD][NOT_FOUND]', { requestId, email });
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    user.password = newPassword; // pre-save hook hashleyecek
    await user.save();
    console.info('✅ [AUTH][DEV_RESET_PASSWORD][DONE]', { requestId, userId: user._id });
    return res.json({ success: true, message: 'Şifre güncellendi' });
  } catch (error) {
    console.error('🟥 [AUTH][DEV_RESET_PASSWORD][ERROR]', { message: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'İşlem sırasında hata oluştu' });
  }
});

// Access token yenileme (refresh token ile)
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'refreshToken gereklidir' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key');
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Geçersiz refresh token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || user.accountStatus !== 'active') {
      return res.status(401).json({ success: false, message: 'Kullanıcı bulunamadı veya pasif' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({ success: true, token, refreshToken });
  } catch (error) {
    console.error('🟥 [AUTH][REFRESH_TOKEN][ERROR]', { message: error.message, stack: error.stack });
    return res.status(500).json({ success: false, message: 'Token yenilenirken hata oluştu' });
  }
});

module.exports = router;