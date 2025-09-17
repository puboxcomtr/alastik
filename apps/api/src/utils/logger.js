const winston = require('winston');
const path = require('path');

// Güvenli stringify (Error nesneleri dahil)
function safeStringify(obj) {
  try {
    return JSON.stringify(
      obj,
      (key, value) => {
        if (value instanceof Error) {
          return { message: value.message, stack: value.stack };
        }
        return value;
      }
    );
  } catch (e) {
    try {
      return String(obj);
    } catch {
      return '[unserializable]';
    }
  }
}

// Log formatı
const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const msgStr = typeof message === 'string' ? message : safeStringify(message);
    const metaStr = Object.keys(meta).length ? safeStringify(meta) : '';
    const svc = service || 'alastik-api';
    return `${timestamp} [${svc}] ${level}: ${msgStr} ${metaStr}`.trim();
  })
);

// Winston logger konfigürasyonu
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: baseFormat,
  defaultMeta: { service: 'alastik-api' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), baseFormat)
    }),
    
    // File transports
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ],
  
  // Exception handling
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/exceptions.log')
    })
  ],
  
  // Rejection handling
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/rejections.log')
    })
  ]
});

// Production'da da konsol açık kalsın; detaylı çıktılar için faydalı

// Helper methods
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userId: (req.user && (req.user.userId || req.user._id)) || null
  };
  
  if (res.statusCode >= 400) {
    logger.error('HTTP Request Error', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

logger.logError = (error, context = {}) => {
  logger.error('Application Error', Object.assign({
    message: error && error.message,
    stack: error && error.stack
  }, context || {}));
};

logger.logPayment = (action, data) => {
  logger.info(`Payment ${action}`, {
    action,
    ...data,
    timestamp: new Date().toISOString()
  });
};

// Removed Netahsilat specific logger

logger.logDia = (action, data) => {
  logger.info(`DIA ${action}`, {
    service: 'dia',
    action,
    ...data,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;