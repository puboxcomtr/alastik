const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Admin = require('../models/admin/user/Admin');
const Session = require('../models/Session');
const { lookupLocation } = require('../utils/geoLookup');
const { isInternalRequest } = require('../utils/requestOrigin');
const { SITES } = require('../config/sites');

const ADMIN_API_PREFIX = '/api/admin';
const VISIT_REUSE_WINDOW_MS = 30 * 60 * 1000;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

const generateToken = (payload, secret = JWT_SECRET, expiresIn = JWT_EXPIRES_IN) => {
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token, secret = JWT_SECRET) => {
  return jwt.verify(token, secret);
};

const generateSessionId = () => {
  return crypto.randomBytes(32).toString('hex');
};

const getClientIP = (req) => {
  const raw = req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    (req.connection.socket ? req.connection.socket.remoteAddress : null);
  return typeof raw === 'string' ? raw.split(',')[0].trim() : raw;
};

const parseUserAgent = (userAgent) => {
  const browser = userAgent.includes('Chrome') ? 'Chrome' :
    userAgent.includes('Firefox') ? 'Firefox' :
      userAgent.includes('Safari') ? 'Safari' :
        userAgent.includes('Edge') ? 'Edge' : 'Unknown';

  const device = userAgent.includes('Mobile') ? 'mobile' :
    userAgent.includes('Tablet') ? 'tablet' : 'desktop';

  return { browser, device };
};

const sessionMiddleware = async (req, res, next) => {
  if (isInternalRequest(req)) return next();
  if ((req.originalUrl || '').startsWith(ADMIN_API_PREFIX) || SITES[req.site]?.trackVisits === false) return next();

  try {
    const cookies = (req && req.cookies) ? req.cookies : {};
    const incomingId = String(req.headers['x-session-id'] || cookies.sessionId || '');
    let sessionId = /^[A-Za-z0-9-]{16,128}$/.test(incomingId) ? incomingId : null;
    let session = null;

    if (!sessionId) {
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = getClientIP(req);
      session = await Session.findOne({
        site: req.site,
        'metadata.ipAddress': ipAddress,
        'metadata.userAgent': userAgent,
        'activity.lastActivity': { $gte: new Date(Date.now() - VISIT_REUSE_WINDOW_MS) }
      }).sort({ 'activity.lastActivity': -1 });
      sessionId = session?.sessionId || generateSessionId();
    }

    if (session) {
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000
      });
    } else if (!/^[A-Za-z0-9-]{16,128}$/.test(incomingId)) {
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
    } else {
      session = await Session.findBySessionId(sessionId);

      if (!session || session.isExpired) {
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

    req.session = session;
    req.sessionId = sessionId;

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

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.userId).select('+password');

    if (!user) {
      console.warn('🟥 [AUTH][USER_NOT_FOUND]', { path: req.originalUrl, method: req.method });
      return res.status(401).json({
        error: 'Invalid token. User not found.'
      });
    }

    if (user.accountStatus !== 'active') {
      console.warn('🟥 [AUTH][ACCOUNT_INACTIVE]', { userId: user._id });
      return res.status(401).json({
        error: 'Account is not active.'
      });
    }

    if (user.isLocked) {
      console.warn('🟥 [AUTH][ACCOUNT_LOCKED]', { userId: user._id });
      return res.status(401).json({
        error: 'Account is temporarily locked.'
      });
    }

    user.lastActiveAt = new Date();
    await user.save();

    if (req.session && req.session.type === 'guest') {
      await req.session.authenticate(user._id);
    }

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

        if (req.session && req.session.type === 'guest') {
          await req.session.authenticate(user._id);
        }

        user.lastActiveAt = new Date();
        await user.save();
      }
    }

    next();
  } catch (error) {
    next();
  }
};

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

    const decoded = verifyToken(token);
    console.log('📋 Decoded Token:', decoded)

    const adminId = decoded.adminId || decoded.id;

    console.log('🔍 Admin ID:', adminId)

    if (!adminId) {
      return res.status(401).json({
        error: 'Invalid token format.'
      });
    }

    const admin = await Admin.findById(adminId).select('+password');

    console.log('👤 Admin bulundu mu?', admin ? `Evet - ${admin.email}` : 'Hayır')

    if (!admin) {
      return res.status(401).json({
        error: 'Invalid token. Admin not found.'
      });
    }

    if (!admin.isActive) {
      return res.status(401).json({
        error: 'Admin account is not active.'
      });
    }

    if (admin.isLocked) {
      return res.status(401).json({
        error: 'Admin account is temporarily locked.'
      });
    }

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

    if (admin.lastActiveAt !== undefined) {
      admin.lastActiveAt = new Date();
      await admin.save();
    }

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

const authorize = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(403).json({
          error: 'Access denied. Admin authentication required.'
        });
      }

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

const loginUser = async (user, req, res) => {
  try {
    await user.resetLoginAttempts();

    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    await user.updateLastLogin(ip, userAgent);

    const token = generateToken({
      userId: user._id,
      email: user.email,
      type: 'user'
    });

    const refreshToken = generateToken({
      userId: user._id,
      type: 'refresh'
    }, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN);

    if (req.session) {
      await req.session.authenticate(user._id);
    }

    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
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

const loginAdmin = async (admin, req, res) => {
  try {
    await admin.resetLoginAttempts();

    const ip = getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    await admin.updateLastLogin(ip, userAgent);

    const sessionToken = admin.createSession(ip, userAgent);

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
const logoutUser = async (req, res) => {
  try {
    if (req.session) {
      await req.session.terminate();
    }

    res.clearCookie('authToken');
    res.clearCookie('refreshToken');
    res.clearCookie('sessionId');

    return { message: 'Logged out successfully' };
  } catch (error) {
    throw error;
  }
};

const logoutAdmin = async (req, res) => {
  try {
    if (req.admin) {
      const sessionToken = req.cookies.adminSession;
      if (sessionToken) {
        await req.admin.invalidateSession(sessionToken);
      }
    }

    res.clearCookie('adminToken');
    res.clearCookie('adminSession');

    return { message: 'Admin logged out successfully' };
  } catch (error) {
    throw error;
  }
};

const refreshUserToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new Error('No refresh token provided');
    }

    const decoded = verifyToken(refreshToken, JWT_REFRESH_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user || user.accountStatus !== 'active') {
      throw new Error('Invalid refresh token');
    }

    const newToken = generateToken({
      userId: user._id,
      email: user.email,
      type: 'user'
    });

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
  authenticateUser: authenticate,
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