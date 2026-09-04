const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Admin = require('../models/admin/user/Admin');
const Session = require('../models/Session');
const { lookupLocation } = require('../utils/geoLookup');
const { isInternalRequest } = require('../utils/requestOrigin');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // en az 1 hafta
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

/**
 * JWT Token oluştur
 */
const generateToken = (payload, secret = JWT_SECRET, expiresIn = JWT_EXPIRES_IN) => {
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * JWT Token doğrula
 */
const verifyToken = (token, secret = JWT_SECRET) => {
  return jwt.verify(token, secret);
};

/**
 * Session ID oluştur
 */
const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * IP adresini al
 */
const getClientIP = (req) => {
  const raw = req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);
  // Vekil zincirinde ("istemci, vekil1, vekil2") gerçek istemci ilk adrestir
  return typeof raw === 'string' ? raw.split(',')[0].trim() : raw;
};

/**
 * User Agent bilgisini parse et
 */
const parseUserAgent = (userAgent) => {
  // Basit user agent parsing
  const browser = userAgent.includes('Chrome') ? 'Chrome' :
    userAgent.includes('Firefox') ? 'Firefox' :
      userAgent.includes('Safari') ? 'Safari' :
        userAgent.includes('Edge') ? 'Edge' : 'Unknown';

  const device = userAgent.includes('Mobile') ? 'mobile' :
    userAgent.includes('Tablet') ? 'tablet' : 'desktop';

  return { browser, device };
};

/**
 * Session middleware - her request için session kontrolü
 */
const sessionMiddleware = async (req, res, next) => {
  // Next.js sunucusunun kendi SSR çağrıları tarayıcı cookie'si taşımaz; oturum sayılırlarsa
  // her sayfa üretimi sunucu IP'li sahte oturumlar yaratır. Bu çağrılar kayıt dışı bırakılır.
  if (isInternalRequest(req)) return next();

  try {
    const cookies = (req && req.cookies) ? req.cookies : {};
    // Istemciden gelen id (x-session-id basligi veya cookie) biçim kontrolünden geçmezse yok sayılır
    const incomingId = String(req.headers['x-session-id'] || cookies.sessionId || '');
    let sessionId = /^[A-Za-z0-9-]{16,128}$/.test(incomingId) ? incomingId : null;
    let session = null;

    // Session ID yoksa yeni session oluştur
    if (!sessionId) {
      sessionId = generateSessionId();

      const userAgent = req.headers['user-agent'] || '';
      const { browser, device } = parseUserAgent(userAgent);
      const ipAddress = getClientIP(req);

      session = await Session.createGuestSession({
        sessionId,
        site: req.site,
        metadata: {
          ipAddress,
          userAgent: userAgent,
          browser: { name: browser },
          device: device,
          referrer: req.headers.referer,
          location: lookupLocation(ipAddress) || undefined
        }
      });

      // Cookie olarak session ID'yi set et
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 saat
      });
    } else {
      // Mevcut session'ı bul
      session = await Session.findBySessionId(sessionId);

      if (!session || session.isExpired) {
        // Kayıt yoksa istemcinin gönderdiği id KORUNUR (x-session-id ile gelen ilk istek); böylece sonraki
        // istekler aynı başlıkla bu oturumu bulur. Süresi dolmuşsa aynı id ile yeniden yaratılamaz, yeni id üretilir.
        if (session && session.isExpired) sessionId = generateSessionId();

        const userAgent = req.headers['user-agent'] || '';
        const { browser, device } = parseUserAgent(userAgent);
        const ipAddress = getClientIP(req);

        session = await Session.createGuestSession({
          sessionId,
          site: req.site,
          metadata: {
            ipAddress,
            userAgent: userAgent,
            browser: { name: browser },
            device: device,
            referrer: req.headers.referer,
            location: lookupLocation(ipAddress) || undefined
          }
        });

        res.cookie('sessionId', sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000
        });
      }
    }

    // Session'ı request'e ekle
    req.session = session;
    req.sessionId = sessionId;

    // Session aktivitesini güncelle
    await session.updateActivity('page_view', {
      url: req.originalUrl,
      method: req.method
    });

    next();
  } catch (error) {
    console.error('Session middleware error:', error);
    next();
  }
};

/**
 * Authentication middleware - kullanıcı girişi kontrolü
 */
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') ||
      req.cookies.authToken;

    if (!token) {
      console.warn('🟨 [AUTH][MISSING_TOKEN]', { path: req.originalUrl, method: req.method });
      return res.status(401).json({
        error: 'Access denied. No token provided.'
      });
    }

    // Token'ı doğrula
    const decoded = verifyToken(token);

    // Kullanıcıyı bul
    const user = await User.findById(decoded.userId).select('+password');

    if (!user) {
      console.warn('🟥 [AUTH][USER_NOT_FOUND]', { path: req.originalUrl, method: req.method });
      return res.status(401).json({
        error: 'Invalid token. User not found.'
      });
    }

    // Kullanıcı aktif mi kontrol et
    if (user.accountStatus !== 'active') {
      console.warn('🟥 [AUTH][ACCOUNT_INACTIVE]', { userId: user._id });
      return res.status(401).json({
        error: 'Account is not active.'
      });
    }

    // Kullanıcı kilitli mi kontrol et
    if (user.isLocked) {
      console.warn('🟥 [AUTH][ACCOUNT_LOCKED]', { userId: user._id });
      return res.status(401).json({
        error: 'Account is temporarily locked.'
      });
    }

    // Son aktivite zamanını güncelle
    user.lastActiveAt = new Date();
    await user.save();

    // Session'ı authenticate et
    if (req.session && req.session.type === 'guest') {
      await req.session.authenticate(user._id);
    }

    // Kullanıcıyı request'e ekle
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      console.warn('🟥 [AUTH][INVALID_TOKEN]', { path: req.originalUrl, method: req.method });
      return res.status(401).json({
        error: 'Invalid token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      console.warn('🟥 [AUTH][TOKEN_EXPIRED]', { path: req.originalUrl, method: req.method });
      return res.status(401).json({
        error: 'Token expired.'
      });
    }

    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed.'
    });
  }
};

/**
 * Optional authentication - token varsa doğrula, yoksa devam et
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') ||
      req.cookies.authToken;

    if (token) {
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.userId);

      if (user && user.accountStatus === 'active' && !user.isLocked) {
        req.user = user;
        req.userId = user._id;

        // Session'ı authenticate et
        if (req.session && req.session.type === 'guest') {
          await req.session.authenticate(user._id);
        }

        // Son aktivite zamanını güncelle
        user.lastActiveAt = new Date();
        await user.save();
      }
    }

    next();
  } catch (error) {
    // Optional auth'da hata olursa devam et
    next();
  }
};

/**
 * Admin authentication middleware
 */
const authenticateAdmin = async (req, res, next) => {
  try {

    const token = req.headers.authorization?.replace('Bearer ', '') ||
      req.cookies.adminToken;

    console.log('🔑 Token alındı:', token ? 'Var' : 'Yok')

    if (!token) {
      return res.status(401).json({
        error: 'Access denied. No admin token provided.'
      });
    }

    // Token'ı doğrula
    const decoded = verifyToken(token);
    console.log('📋 Decoded Token:', decoded)

    // ✅ Hem adminId hem id'yi kontrol et (uyumluluk için)
    const adminId = decoded.adminId || decoded.id;

    console.log('🔍 Admin ID:', adminId)

    if (!adminId) {
      return res.status(401).json({
        error: 'Invalid token format.'
      });
    }

    // Admin'i bul
    const admin = await Admin.findById(adminId).select('+password');

    console.log('👤 Admin bulundu mu?', admin ? `Evet - ${admin.email}` : 'Hayır')

    if (!admin) {
      return res.status(401).json({
        error: 'Invalid token. Admin not found.'
      });
    }

    // Admin aktif mi kontrol et - ✅ isActive kullan (admin modelinde bu var)
    if (!admin.isActive) {
      return res.status(401).json({
        error: 'Admin account is not active.'
      });
    }

    // Admin kilitli mi kontrol et
    if (admin.isLocked) {
      return res.status(401).json({
        error: 'Admin account is temporarily locked.'
      });
    }

    // Site erişim kontrolü — yönetici yalnızca yetkili olduğu sitelerde işlem yapabilir
    // (kendi profil/çıkış uçları hariç: yetkisiz sitedeyken bile kim olduğunu öğrenebilmeli)
    const isAuthSelfEndpoint = (req.originalUrl || '').startsWith('/api/admin/user/auth/');
    const adminSites = Array.isArray(admin.sites) && admin.sites.length > 0 ? admin.sites : null;
    if (!isAuthSelfEndpoint && adminSites && req.site && !adminSites.includes(req.site)) {
      const { SITES } = require('../config/sites');
      const siteName = SITES[req.site]?.name || req.site;
      return res.status(403).json({
        error: `${siteName} yetkiniz kısıtlıdır`,
        code: 'SITE_ACCESS_DENIED',
        site: req.site
      });
    }

    // Son aktivite zamanını güncelle (lastActiveAt yoksa skip et)
    if (admin.lastActiveAt !== undefined) {
      admin.lastActiveAt = new Date();
      await admin.save();
    }

    // Admin'i request'e ekle
    req.admin = admin;
    req.adminId = admin._id;

    next();
  } catch (error) {
    console.error('❌ Admin authentication error:', error)

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid admin token.'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Admin token expired.'
      });
    }

    res.status(500).json({
      error: 'Admin authentication failed.'
    });
  }
};

/**
 * Authorization middleware - yetki kontrolü
 */
const authorize = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(403).json({
          error: 'Access denied. Admin authentication required.'
        });
      }

      // Yetki kontrolü
      if (!req.admin.hasPermission(resource, action)) {
        return res.status(403).json({
          error: `Access denied. Missing permission: ${resource}.${action}`
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        error: 'Authorization failed.'
      });
    }
  };
};

/**
 * Role-based authorization
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(403).json({
        error: 'Access denied. Admin authentication required.'
      });
    }

    const userRoles = Array.isArray(roles) ? roles : [roles];

    if (!userRoles.includes(req.admin.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${userRoles.join(' or ')}`
      });
    }

    next();
  };
};

/**
 * Rate limiting middleware - Test süreçleri için yüksek limit
 */
const rateLimiter = (windowMs = 1 * 60 * 1000, max = 100) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!requests.has(key)) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const request = requests.get(key);

    if (now > request.resetTime) {
      request.count = 1;
      request.resetTime = now + windowMs;
      return next();
    }

    if (request.count >= max) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((request.resetTime - now) / 1000)
      });
    }

    request.count++;
    next();
  };
};

/**
 * CSRF protection middleware
 */
const csrfProtection = (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.data?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({
      error: 'Invalid CSRF token.'
    });
  }

  next();
};

/**
 * Login helper function
 */
const loginUser = async (user, req, res) => {
  try {
    // Login attempts'ı sıfırla
    await user.resetLoginAttempts();

    // Son login bilgilerini güncelle
    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    await user.updateLastLogin(ip, userAgent);

    // JWT token oluştur
    const token = generateToken({
      userId: user._id,
      email: user.email,
      type: 'user'
    });

    // Refresh token oluştur
    const refreshToken = generateToken({
      userId: user._id,
      type: 'refresh'
    }, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN);

    // Session'ı authenticate et
    if (req.session) {
      await req.session.authenticate(user._id);
    }

    // Cookie'leri set et
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 gün
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 gün
    });

    return {
      token,
      refreshToken,
      user: {
        _id: user._id,
        email: user.email,
        profile: user.profile,
        accountStatus: user.accountStatus,
        customerSegment: user.customerSegment
      }
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Login admin helper function
 */
const loginAdmin = async (admin, req, res) => {
  try {
    await admin.resetLoginAttempts();

    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    await admin.updateLastLogin(ip, userAgent);

    // Session oluştur
    const sessionToken = admin.createSession(ip, userAgent);

    // JWT token oluştur
    const token = generateToken({
      adminId: admin._id,
      email: admin.email,
      role: admin.role,
      type: 'admin'
    });

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'lax' : 'strict',
      maxAge: 8 * 60 * 60 * 1000
    };
    if (isProduction) {
      cookieOptions.domain = '.alastik.com';
    }
    res.cookie('adminToken', token, cookieOptions);
    res.cookie('adminSession', sessionToken, cookieOptions);

    return {
      token,
      sessionToken,
      admin: {
        _id: admin._id,
        email: admin.email,
        username: admin.username,
        profile: admin.profile,
        role: admin.role,
        permissions: admin.permissions
      }
    };
  } catch (error) {
    throw error;
  }
};
/**
 * Logout helper function
 */
const logoutUser = async (req, res) => {
  try {
    // Session'ı terminate et
    if (req.session) {
      await req.session.terminate();
    }

    // Cookie'leri temizle
    res.clearCookie('authToken');
    res.clearCookie('refreshToken');
    res.clearCookie('sessionId');

    return { message: 'Logged out successfully' };
  } catch (error) {
    throw error;
  }
};

/**
 * Logout admin helper function
 */
const logoutAdmin = async (req, res) => {
  try {
    // Admin session'ı invalid et
    if (req.admin) {
      const sessionToken = req.cookies.adminSession;
      if (sessionToken) {
        await req.admin.invalidateSession(sessionToken);
      }
    }

    // Cookie'leri temizle
    res.clearCookie('adminToken');
    res.clearCookie('adminSession');

    return { message: 'Admin logged out successfully' };
  } catch (error) {
    throw error;
  }
};

/**
 * Refresh token helper function
 */
const refreshUserToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new Error('No refresh token provided');
    }

    // Refresh token'ı doğrula
    const decoded = verifyToken(refreshToken, JWT_REFRESH_SECRET);

    // Kullanıcıyı bul
    const user = await User.findById(decoded.userId);

    if (!user || user.accountStatus !== 'active') {
      throw new Error('Invalid refresh token');
    }

    // Yeni token oluştur
    const newToken = generateToken({
      userId: user._id,
      email: user.email,
      type: 'user'
    });

    // Cookie'yi güncelle
    res.cookie('authToken', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return { token: newToken };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  sessionMiddleware,
  authenticate,
  authenticateUser: authenticate, // Alias for user authentication
  optionalAuth,
  authenticateAdmin,
  authorize,
  requireRole,
  rateLimiter,
  csrfProtection,
  loginUser,
  loginAdmin,
  logoutUser,
  logoutAdmin,
  refreshUserToken,
  generateToken,
  verifyToken,
  getClientIP,
  parseUserAgent
}; 