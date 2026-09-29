const path = require('path');
const paths = require('./config/path');

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================
// NODE_ENV'e göre .env.local / .env.production seçilir; eksik anahtarlar
// diğer dosyadan tamamlanır. Worker da aynı modülü kullanır (config/env.js).
// DİKKAT: config/path yukarıda, bu satırdan ÖNCE yükleniyor — medya kökü
// (PUBLIC_DIR) modül yüklenirken hesaplandığı için sıra değiştirilmemeli.
require('./config/env').yukle();


// ============================================
// CORE DEPENDENCIES
// ============================================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { DOMAIN_TO_SLUG } = require('./config/sites');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const winston = require('winston');

// ============================================
// CACHE MANAGERS
// ============================================
// Import cache utilities and Redis-based cache manager
const { cache, cacheKeys, withCache, cachedFunction } = require('./utils/cache');
const CacheManager = require('../../../packages/cache');

// Use Redis cache in both production and development
const redisCache = new CacheManager();


// ============================================
// MEDIA CONFIG - Merkezi Görsel Yönetimi
// ============================================
const { MEDIA_CONFIG, PUBLIC_DIR } = require('./config/media');

// ============================================
// DATA MODELS
// ============================================
// Web-facing models (synced from DIA)
const WebProduct = require('./models/web/catalog/WebProduct');
const WebCategory = require('./models/web/catalog/WebCategory');
const WebBrand = require('./models/web/catalog/WebBrand');
const WebTag = require('./models/web/catalog/WebTag');
const WebSlider = require('./models/web/design/WebSlider');
const Page = require('./models/admin/content/Page');
const Menu = require('./models/admin/design/Menu');


// Legacy and internal models
const Inventory = require('./models/admin/settings/Inventory');
const Category = require('./models/admin/catalog/Category');
const DiaStock = require('./models/plugins/DiaStock');
const AdminUser = require('./models/admin/user/AdminUser');


// ============================================
// SERVICES
// ============================================
// DIA ERP integration services
const DiaStockService = require('./services/plugins/dia/DiaStockService');
const axios = require('axios');

// ============================================
// EXPRESS APP INITIALIZATION
// ============================================
const app = express();

// Trust proxy - Required when running behind Nginx/reverse proxy
// This ensures correct IP addresses in request logs and rate limiting
app.set('trust proxy', 1);

// Cache is already imported from utils/cache
// Use redisCache in production, simple cache in development

// Use Redis cache for all environments
const activeCache = redisCache;

// Initialize DIA Stock Service
const diaStockService = new DiaStockService();

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'alastik-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
          let metaStr = '';
          try {
            const safeMeta = {};
            for (const [key, value] of Object.entries(meta)) {
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                if (value.toString && value.toString !== Object.prototype.toString) {
                  safeMeta[key] = value.toString();
                }
              } else {
                safeMeta[key] = value;
              }
            }
            metaStr = Object.keys(safeMeta).length ? JSON.stringify(safeMeta) : '';
          } catch (err) {
            metaStr = '[Circular]';
          }
          return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
        })
      )
    })
  ]
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http://localhost:3082"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Sunucunun kendi SSR çağrıları (web → api, nginx üzerinden) tek IP'den geldiği için limite takılmasın.
// Liste env'den okunur: RATE_LIMIT_SKIP_IPS=ip1,ip2
const RATE_LIMIT_SKIP_IPS = new Set(String(process.env.RATE_LIMIT_SKIP_IPS || '').split(',').map(s => s.trim()).filter(Boolean));
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1500,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    if (process.env.NODE_ENV === 'development') return true;
    const ip = req.ip || req.headers['x-forwarded-for'] || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || RATE_LIMIT_SKIP_IPS.has(ip);
  }
});
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  message: 'Too many search requests, please try again later.',
  skip: (req) => {
    if (process.env.NODE_ENV === 'development') return true;
    const ip = req.ip || req.headers['x-forwarded-for'] || '';
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  }
});
app.use('/api/', limiter);
app.use('/api/search', searchLimiter);

// CORS configuration
// Izinli origin'ler: sites.js domain'lerinden (https+http) turetilir + env URL'leri.
// Hardcode yok; yeni site eklenince otomatik kapsanir.
const buildAllowedOrigins = () => {
  const fromSites = Object.keys(DOMAIN_TO_SLUG).flatMap((d) => [
    `https://${d}`,
    `http://${d}`,
  ]);
  const fromEnv = [process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(Boolean);
  const devLocal = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3080', 'http://localhost:3081'];
  // Odeme gateway callback domain'leri (server-to-server 3D donus POST'lari).
  const paymentGateways = [
    'https://reverseprj-pgwapi.ecozum.com',
    'https://iksirext.nkolayislem.com.tr',
    'https://paynkolay.nkolayislem.com.tr',
    'https://otopirpossv2.netahsilatservice.com'
  ];
  return [...new Set([...fromSites, ...fromEnv, ...devLocal, ...paymentGateways])];
};
const allowedOrigins = buildAllowedOrigins();
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS engellendi: ' + origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Site', 'X-Session-Id']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));


// Filigran: ürün görselleri istenirken ayar açıksa filigranlı kopya sunulur.
// nginx önce önbellek klasörüne bakar, bulamazsa bu rotaya düşer.
const watermarkService = require('./services/media/WatermarkService');

app.get(/^\/(urun|blog|genel)\/.+\.(jpe?g|png|webp)$/i, async (req, res, next) => {
    try {
        // Bu rota site middleware'inden önce çalışır; site Host başlığından çözülür
        const { resolveSite } = require('./utils/resolveSite');
        const site = resolveSite(req);
        const dosya = await watermarkService.filigranliDosya(site, decodeURIComponent(req.path));

        if (!dosya) return next();

        res.set('Cache-Control', 'public, max-age=86400');

        return res.sendFile(dosya);
    } catch (error) {
        console.error('Filigran uygulanamadı:', error.message);

        return next();
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// Body parsing & cookies
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(mongoSanitize());
app.use(hpp());

// Site cozumleme (multi-tenant) - req.site set eder
const { siteMiddleware } = require('./middleware/site');
app.use(siteMiddleware);

// Oturum middleware'i cookieParser ve siteMiddleware'den SONRA çalışmalı:
// aksi halde req.cookies ve req.site tanımsız kalır ve her istek yeni oturum yaratır.
try {
  const { sessionMiddleware } = require('./middleware/auth');
  app.use(sessionMiddleware);
} catch (e) {
  // ignore if not available
}

// Compression middleware
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent') || 'Unknown'
    });
  });

  next();
});

// MongoDB connection with improved settings
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || 50,
  minPoolSize: 5,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4,
  bufferCommands: true,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  maxIdleTimeMS: 60000
})
  .then(async () => {
    logger.info('Connected to MongoDB');
    // Site bazlı fiyat kuralları (panel: Gösterilecek Fiyat) — istekler gelmeden belleğe al
    await require('./utils/sitePricing').loadPricingConfig();
    // Kargo kuralları (stoklu ürünlerde fiyata gömülü kargo payı)
    await require('./services/web/cargo/ShippingRuleService').loadShippingRules();
    // XML Kontrolü
    // XML_SCHEDULER=false ise başlatılmaz (dev ortamı canlı veritabanını paylaştığı için)
    if (process.env.XML_SCHEDULER !== 'false') {
      const xmlSyncScheduler = require('./services/plugins/xml/XmlSyncScheduler');
      xmlSyncScheduler.start();
    } else {
      logger.info('XmlSyncScheduler devre dışı (XML_SCHEDULER=false)');
    }
    // SEO: gece içerik taraması + Search Console anlık görüntüsü
    try {
      require('./services/seo/SeoScheduler').start();
    } catch (error) {
      logger.error('SEO scheduler başlatılamadı:', error);
    }
    try {
      await AdminUser.createDefaultAdmin();
    } catch (error) {
      logger.error('Failed to create default admin:', error);
    }
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

// ============================================
// DASHBOARD ROUTES
// ============================================
const adminRoutes = require('./routes/admin/Index');
app.use('/api/admin', adminRoutes);

/**
  * (PLUGIN) Wheelsize Senkronize Routes *
*/
/* Kullanıcının araçlarını yönetmek için (CRUD işlemleri) */
const vehiclesRoutes = require('./routes/web/user/vehicles');
app.use('/api/user/vehicles', vehiclesRoutes);

/* Wheel Size API'den marka/model/yıl bilgilerini getirmek i */
const wheelsizeRoutes = require('./routes/web/integration/wheelsize');
app.use('/api/wheelsize', wheelsizeRoutes);

// ============================================
// DIA PLUGIN ROUTES (Workers)
// ============================================
// Yalnızca admin paneli kullanır — sync tetikleme uçları kimlik doğrulaması ister
const diaRoutes = require('./routes/plugins/dia');
const { authenticateAdmin: diaAuth } = require('./middleware/auth');
app.use('/api/dia', process.env.DISABLE_AUTH === 'true' ? (req, res, next) => next() : diaAuth, diaRoutes);

// ============================================
// PAYMENT ROUTES
// ============================================

/* Netahsilat */
const netahsilatRouter = require('./routes/web/payment/netahsilat');
app.use('/api/web/payments/netahsilat', netahsilatRouter);

/* NKolay */
const nkolayRouter = require('./routes/web/payment/nkolay');
app.use('/api/web/payments/nkolay', nkolayRouter);


// ============================================
// THEME ROUTES
// ============================================

/* Genel Site Ayarları */
const webGeneralSettingsRoutes = require('./routes/web/other/generalsettings');
app.use('/api/general-settings', webGeneralSettingsRoutes);

/* Çeviriler */
const webTranslateRoutes = require('./routes/web/other/translations');
app.use('/api/translations', webTranslateRoutes);

/* B2B bayi başvuru formu */
const webB2BApplicationRoutes = require('./routes/web/b2b/application');
app.use('/api/b2b/application', webB2BApplicationRoutes);

/* B2B bayi girişi (cari kodu veya e-posta + şifre) */
const webB2BAuthRoutes = require('./routes/web/b2b/auth');
app.use('/api/b2b/auth', webB2BAuthRoutes);

/* B2B plasiyer girişi (kullanıcı kodu + şifre) ve bayi adına oturum */
const webB2BPlasiyerRoutes = require('./routes/web/b2b/plasiyer');
app.use('/api/b2b/plasiyer', webB2BPlasiyerRoutes);

/* B2B ödeme (Paynet Özelleştirilmiş Form — kart tarayıcıda token'lanır) */
const webB2BPaymentRoutes = require('./routes/web/b2b/payment');
app.use('/api/b2b/payment', webB2BPaymentRoutes);

/* * Menu * */
const webMenuRoutes = require('./routes/web/design/menus');
app.use('/api/menus', webMenuRoutes);

/* * Header Arama * */
const webSearchRoutes = require('./routes/user/catalog/search');
app.use('/api/search', webSearchRoutes);

/* Giriş Yap */
const webAuthRoutes = require('./routes/web/user/auth');
app.use('/api/auth', webAuthRoutes);

/* Web Ayarları */
const webSettingsRoutes = require('./routes/web/other/settings');
app.use('/api/settings', webSettingsRoutes);

/* Tema Ayarları */
const webDesignRoutes = require('./routes/web/other/theme');
app.use('/api/theme', webDesignRoutes);

/* Ürün Marka  */
const webBrandsRoutes = require('./routes/web/catalog/brands');
app.use('/api/brands', webBrandsRoutes);

/* Kategori Detay & Filtreleme */
const webCategoryRoutes = require('./routes/web/catalog/categories');
app.use('/api/categories', webCategoryRoutes);

/* Slider */
const webSliderRoutes = require('./routes/web/design/slider');
app.use('/api/design/slider', webSliderRoutes);

/* Ürün Listeleme */
const webProductsRoutes = require('./routes/web/catalog/products');
app.use('/api/products', webProductsRoutes);

/* Pazar yeri ürün feed'i (Lastiğini Sat) — salt okunur JSON, X-Feed-Key ile */
const marketplaceFeedRoutes = require('./routes/plugins/marketplace/feed');
app.use('/api/feed', marketplaceFeedRoutes);

/* Etiket */
const webTagsRoutes = require('./routes/web/catalog/tags');
app.use('/api/tags', webTagsRoutes);

/* Tanımlamalar */
const definitionRouter = require('./routes/web/other/definition');
app.use('/api/definition', definitionRouter);

// Sitemap veri kaynağı (web route handler'ları XML üretirken kullanır)
const sitemapDataRouter = require('./routes/web/other/sitemap');
app.use('/api/sitemap-data', sitemapDataRouter);

const seoRouter = require('./routes/web/other/seo');
app.use('/api/seo', seoRouter);

/* Sayfa */
const webPageRoutes = require('./routes/web/content/pages');
app.use('/api/pages', webPageRoutes);

// Yönlendirme haritası (web middleware okur)
const webRedirectRoutes = require('./routes/web/other/redirects');
app.use('/api/redirects', webRedirectRoutes);

/* Blog */
const webBlogRoutes = require('./routes/web/content/blog');
app.use('/api/blogs', webBlogRoutes);

/* Ürün Yorumları */
const webReviewsRoutes = require('./routes/web/user/reviews');
app.use('/api/reviews', webReviewsRoutes);

/* Ürün Filtreleme */
const webFiltersRoutes = require('./routes/web/catalog/filters');
app.use('/api/filters', webFiltersRoutes);

// Montaj noktaları (vitrin)
const webMontageRoutes = require('./routes/web/content/montage');
app.use('/api/montage-points', webMontageRoutes);

// Vitrin: dışarıya yalnızca vitrin okuma uçları açılır (/public/*);
// CRUD uçları /api/admin/showcases altında admin kimlik doğrulamasıyla korunur
const showcaseRoutes = require('./routes/admin/catalog/showcase');
app.use('/api/showcases', (req, res, next) => {
    if (req.method === 'GET' && req.path.startsWith('/public/')) return next();
    return res.status(401).json({ success: false, message: 'Bu uç için yetkilendirme gereklidir' });
}, showcaseRoutes);

// ============================================
// THEME CART & PAYMENT ROUTES
// ============================================
/* Sepet Sistemi */
const webCartRoutes = require('./routes/web/cart/cart');
app.use('/api/cart', webCartRoutes);

/* Banka Havalesi */
const webPaymentMethodsRoutes = require('./routes/web/payment/paymentMethods');
app.use('/api/payment-methods', webPaymentMethodsRoutes);

// ============================================
// ACCOUNT 
// ============================================

/* İl İlçe ve Mahalle Json Çekme */
const webLocationRoutes = require('./routes/web/adress/location');
app.use('/api/location', webLocationRoutes);

/* Hesabım Adresler */
const webAddressRoutes = require('./routes/web/adress/address');
app.use('/api/address', webAddressRoutes);

/* Siparişler */
const webOrderRoutes = require('./routes/web/order/order');
app.use('/api/order', webOrderRoutes);

const webFavouritesRoutes = require('./routes/web/user/favourites');
app.use('/api/favourites', webFavouritesRoutes);

/* Kargo Hesaplama */
const webCargoCalculateRoutes = require('./routes/web/cargo/calculate');
app.use('/api/cargo', webCargoCalculateRoutes);

/* Satın Alma Limit Kontrolü */
const webPurchaseLimitsRoutes = require('./routes/web/campaign/purchase-limits');
app.use('/api/campaign/purchase-limits', webPurchaseLimitsRoutes);

/* İletişim Formu */
const contactRoutes = require('./routes/web/content/contact');
app.use('/api/contact', contactRoutes);

/* WheelSize Lastik Hesaplama */
const webCalculatorRoutes = require('./routes/plugins/wheelsize/calculator');
app.use('/api/plugins/wheelsize/calculator', webCalculatorRoutes);

/* Görsel Listeleme */
const mediaFolders = Object.keys(paths.mediaFolders);
mediaFolders.forEach(folder => {
  const staticPath = paths.getStaticPath(folder);
  app.use(`/${folder}`, (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  }, express.static(staticPath));
});

/* CORS */
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
}, express.static(path.join(__dirname, 'public/uploads')));

/* * Görsel Upload — yalnızca /api/admin/media altında, admin kimlik doğrulamasıyla sunulur * */

/* * Static Görsel Upload *  */
app.use('/uploads', express.static(paths.getStaticPath('')));

/* * Sliders Upload * */
app.use('/sliders', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'public/sliders')));

// Media kategorileri için static middleware
Object.entries(MEDIA_CONFIG).forEach(([category, config]) => {
  const staticPath = path.join(config.basePath, config.folder);
  const fs = require('fs');
  if (!fs.existsSync(staticPath)) {
    fs.mkdirSync(staticPath, { recursive: true });
    console.log(`Klasör oluşturuldu: ${staticPath}`);
  }

  app.use(config.urlPrefix, (req, res, next) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  }, express.static(staticPath));

});
app.use('/banners', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'public/banners')));


/* * Theme Upload GET * */
app.use('/uploads/theme', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'public/uploads/theme')));

/* Tema Blokları */
const blocksRoutes = require('./routes/public/theme/block');
app.use('/api/blocks', blocksRoutes);

// Inventory routes
const inventoryRoutes = require('./routes/inventory');
app.use('/api/inventory', inventoryRoutes);

// Dashboard routes
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/users');
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);

// Cart routes
const cartRoutes = require('./routes/cart');
app.use('/api/cart', cartRoutes);

// External payments (Netahsilat gateway entegrasyonu)
try {
  const externalPayments = require('./routes/payments');
  app.use('/api/payments', externalPayments);
} catch (e) {
  console.warn('External payments routes not loaded:', e?.message);
}
// ============================================
// (PLUGIN) - WHEELSIZE ROUTES
// ============================================

const WHEEL_SIZE_API_BASE = process.env.WHEEL_SIZE_API_URL || 'http://217.195.202.170:5000/api';

async function tryWheelSize(path, cfg = {}) {
  const bases = new Set();
  const base = (WHEEL_SIZE_API_BASE || '').replace(/\/$/, '');
  const hasApi = /\/api$/i.test(base);
  const alt = hasApi ? base.replace(/\/api$/i, '') : `${base}/api`;
  const swapProtocol = (u) => u.startsWith('http://') ? u.replace('http://', 'https://') : (u.startsWith('https://') ? u.replace('https://', 'http://') : u);

  // ✅ localhost:5058 kaldırıldı
  [base, alt, swapProtocol(base), swapProtocol(alt)]
    .filter(Boolean)
    .map(u => u.replace(/\/$/, ''))
    .forEach(u => bases.add(u));

  let lastError;
  for (const b of Array.from(bases)) {
    try {
      const url = `${b}${path}`;
      const response = await axios.get(url, { timeout: 15000, ...cfg });
      return response;
    } catch (err) {
      lastError = err;
      continue;
    }
  }
  throw lastError;
}

// Jant API'leri
app.get('/api/jant/caplar', async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const cacheKey = 'jant:caplar:eudm';

  try {
    const cached = await activeCache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const WheelSizeService = require('./services/plugins/wheelsize/WheelSizeService');
    const data = await WheelSizeService.getRimDiameters({ region: 'eudm' });

    const response = {
      basarili: true,
      veri: Array.isArray(data) ? data : [],
      toplamKayit: Array.isArray(data) ? data.length : 0,
      requestId
    };

    await activeCache.set(cacheKey, JSON.stringify(response), 3600);
    res.json(response);

  } catch (error) {
    logger.error('Jant çapları hatası:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Jant çap bilgileri alınırken hata oluştu',
      requestId
    });
  }
});
app.get('/api/jant/genislikler', async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const cacheKey = 'jant:genislikler:eudm';

  try {
    const cached = await activeCache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const WheelSizeService = require('./services/plugins/wheelsize/WheelSizeService');
    const data = await WheelSizeService.getRimWidths({ region: 'eudm' });

    const response = {
      basarili: true,
      veri: Array.isArray(data) ? data : [],
      toplamKayit: Array.isArray(data) ? data.length : 0,
      requestId
    };

    await activeCache.set(cacheKey, JSON.stringify(response), 3600);
    res.json(response);

  } catch (error) {
    logger.error('Jant genişlikleri hatası:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Jant genişlik bilgileri alınırken hata oluştu',
      requestId
    });
  }
});
app.get('/api/jant/offsetler', async (req, res) => {
  try {
    const response = await tryWheelSize(`/jant/offsetler`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    logger.error('Wheel Size API - Jant offsetleri error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Jant offset bilgileri alınırken hata oluştu'
    });
  }
});
app.get('/api/jant/merkez-delikler', async (req, res) => {
  try {
    const response = await tryWheelSize(`/jant/merkez-delikler`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    logger.error('Wheel Size API - Merkez delikler error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Merkez delik bilgileri alınırken hata oluştu'
    });
  }
});
app.get('/api/jant/vida-sablonlari', async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const cacheKey = 'jant:vida-sablonlari:eudm';

  try {
    const cached = await activeCache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const WheelSizeService = require('./services/plugins/wheelsize/WheelSizeService');
    const data = await WheelSizeService.getRimBoltPatterns({ region: 'eudm' });

    const response = {
      basarili: true,
      veri: Array.isArray(data) ? data : [],
      toplamKayit: Array.isArray(data) ? data.length : 0,
      requestId
    };

    await activeCache.set(cacheKey, JSON.stringify(response), 3600);
    res.json(response);

  } catch (error) {
    logger.error('Jant vida şablonları hatası:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Vida şablon bilgileri alınırken hata oluştu',
      requestId
    });
  }
});
app.get('/api/jant/arama', async (req, res) => {
  try {
    const response = await tryWheelSize(`/jant/arama`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    logger.error('Wheel Size API - Jant arama error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Jant arama sırasında hata oluştu'
    });
  }
});

app.get('/api/jant/modifikasyon-arama', async (req, res) => {
  try {
    const response = await tryWheelSize(`/jant/modifikasyon-arama`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    logger.error('Wheel Size API - Jant modifikasyon arama error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Jant modifikasyon arama sırasında hata oluştu'
    });
  }
});
// Lastik API'leri
app.get('/api/lastik/caplar', async (req, res) => {
  try {
    const response = await tryWheelSize(`/lastik/caplar`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    logger.error('Wheel Size API - Lastik çapları error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Lastik çap bilgileri alınırken hata oluştu'
    });
  }
});

app.get('/api/lastik/genislikler', async (req, res) => {
  try {
    const response = await tryWheelSize(`/lastik/genislikler`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    logger.error('Wheel Size API - Lastik genişlikleri error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Lastik genişlik bilgileri alınırken hata oluştu'
    });
  }
});
app.get('/api/lastik/kesit-genislikleri', async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const cacheKey = 'lastik:kesit-genislikleri:eudm';

  try {
    const cached = await activeCache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const WheelSizeService = require('./services/plugins/wheelsize/WheelSizeService');
    const data = await WheelSizeService.getTireSectionWidths({ region: 'eudm' });

    const response = {
      basarili: true,
      veri: Array.isArray(data) ? data : [],
      toplamKayit: Array.isArray(data) ? data.length : 0,
      requestId
    };

    await activeCache.set(cacheKey, JSON.stringify(response), 3600);
    res.json(response);

  } catch (error) {
    logger.error('Kesit genişlikleri hatası:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Kesit genişlik bilgileri alınırken hata oluştu',
      requestId
    });
  }
});
app.get('/api/lastik/yanak-oranlari', async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const sectionWidth = req.query.section_width ? String(req.query.section_width) : '';
  const cacheKey = `lastik:yanak-oranlari:eudm${sectionWidth ? `:sw-${sectionWidth}` : ''}`;

  try {
    const cached = await activeCache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const WheelSizeService = require('./services/plugins/wheelsize/WheelSizeService');
    const params = { region: 'eudm' };
    if (sectionWidth) params.section_width = sectionWidth;
    const data = await WheelSizeService.getTireAspectRatios(params);

    const response = {
      basarili: true,
      veri: Array.isArray(data) ? data : [],
      toplamKayit: Array.isArray(data) ? data.length : 0,
      requestId
    };

    await activeCache.set(cacheKey, JSON.stringify(response), 3600);
    res.json(response);

  } catch (error) {
    logger.error('Yanak oranları hatası:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Yanak oranı bilgileri alınırken hata oluştu',
      requestId
    });
  }
});
app.get('/api/lastik/jant-caplari', async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const sectionWidth = req.query.section_width ? String(req.query.section_width) : '';
  const aspectRatio = req.query.aspect_ratio ? String(req.query.aspect_ratio) : '';
  const suffix = [
    sectionWidth ? `sw-${sectionWidth}` : '',
    aspectRatio ? `ar-${aspectRatio}` : ''
  ].filter(Boolean).join(':');
  const cacheKey = `lastik:jant-caplari:eudm${suffix ? `:${suffix}` : ''}`;

  try {
    const cached = await activeCache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const WheelSizeService = require('./services/plugins/wheelsize/WheelSizeService');
    const params = { region: 'eudm' };
    if (sectionWidth) params.section_width = sectionWidth;
    if (aspectRatio) params.aspect_ratio = aspectRatio;
    const data = await WheelSizeService.getTireRimDiameters(params);

    const response = {
      basarili: true,
      veri: Array.isArray(data) ? data : [],
      toplamKayit: Array.isArray(data) ? data.length : 0,
      requestId
    };

    await activeCache.set(cacheKey, JSON.stringify(response), 3600);
    res.json(response);

  } catch (error) {
    logger.error('Jant çapları hatası:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Jant çapı bilgileri alınırken hata oluştu',
      requestId
    });
  }
});
app.get('/api/lastik/yanakOranlari', async (req, res) => {
  try {
    const response = await tryWheelSize(`/lastik/yanakOranlari`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    logger.error('Wheel Size API - Lastik yanak oranları error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Lastik yanak oranı bilgileri alınırken hata oluştu'
    });
  }
});
app.get('/api/lastik/arama', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('=== LASTİK ARAMA API İSTEĞİ ===', {
    requestId,
    endpoint: '/api/lastik/arama',
    query: req.query,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  try {
    const response = await tryWheelSize(`/lastik/arama`, { params: req.query });

    const duration = Date.now() - startTime;
    const responseData = response.data;

    logger.info('=== LASTİK ARAMA API YANITI ===', {
      requestId,
      duration: `${duration}ms`,
      statusCode: response.status,
      success: responseData.basarili,
      dataLength: responseData.veri ? responseData.veri.length : 0,
      totalRecords: responseData.toplamKayit,
      sampleData: responseData.veri ? responseData.veri.slice(0, 2).map(item => ({
        lastiklerCount: item.lastikler ? item.lastikler.length : 0,
        sampleLastikler: item.lastikler ? item.lastikler.slice(0, 2) : null
      })) : null,
      timestamp: new Date().toISOString()
    });

    res.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('=== LASTİK ARAMA API HATASI ===', {
      requestId,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      basarili: false,
      hata: 'Lastik arama sırasında hata oluştu',
      requestId
    });
  }
});
app.get('/api/lastik/modifikasyon-arama', async (req, res) => {
  try {
    const response = await tryWheelSize(`/lastik/modifikasyon-arama`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    logger.error('Wheel Size API - Lastik modifikasyon arama error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Lastik modifikasyon arama sırasında hata oluştu'
    });
  }
});
// Genel lastik arama API'si (test ürünleri için)
app.get('/api/lastik/genel-arama', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('=== GENEL LASTİK ARAMA API İSTEĞİ ===', {
    requestId,
    endpoint: '/api/lastik/genel-arama',
    query: req.query,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ basarili: false, mesaj: 'Arama terimi en az 2 karakter olmalıdır' });
    }

    const searchTerm = (q || '').toString().trim();
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Ebat deseni algıla (225/45R17, 225 45 17, 225-45-17, 225/45 ZR17 gibi)
    const sizeRegex = /(\d{3})\s*[\/\-\s]?\s*(\d{2})\s*[ZR\-\s]*\s*(\d{2})/i;
    const sizeMatch = searchTerm.match(sizeRegex);
    let sizeFilters = [];
    if (sizeMatch) {
      const w = sizeMatch[1];
      const a = sizeMatch[2];
      const r = sizeMatch[3];
      const normalizedSize = `${w}/${a}R${r}`;
      sizeFilters = [
        { aciklama: { $regex: normalizedSize, $options: 'i' } },
        { aciklama: { $regex: `${w}[\/-]${a}[ZR\/-]*${r}`, $options: 'i' } },
        { ozelkod3: normalizedSize },
        { Ebat1: parseInt(w) },
        { Ebat2: parseInt(a) },
        { Ebat3: parseInt(r) }
      ];
    }

    // Genel alanlarda arama
    const genericFilters = [
      { aciklama: { $regex: searchTerm, $options: 'i' } },
      { marka: { $regex: searchTerm, $options: 'i' } },
      { Marka: { $regex: searchTerm, $options: 'i' } },
      { stokkartkodu: { $regex: searchTerm, $options: 'i' } },
      { _key: { $regex: searchTerm, $options: 'i' } },
      { ozelkod3: { $regex: searchTerm, $options: 'i' } },
      { ozelkod4: { $regex: searchTerm, $options: 'i' } },
      { ozelkod5: { $regex: searchTerm, $options: 'i' } }
    ];

    // Ana filtre: sadece aktif ve B2C gönderilecek ürünler
    const query = {
      $and: [
        { durum: 'A' },
        { b2c_gonder: 'E' },
        { $or: sizeFilters.length > 0 ? [...sizeFilters, ...genericFilters] : genericFilters }
      ]
    };

    // $text index varsa ayrıca deneyebiliriz (daha geniş eşleşme)
    // Not: $text ve $regex aynı anda kullanılamaz; burada opsiyonel ayrı bir deneme olabilir.

    const [diaProducts, total] = await Promise.all([
      DiaStock.find(query)
        .sort({ fiili_stok: -1, fiyat1: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      DiaStock.countDocuments(query)
    ]);

    // Sonuçları frontend ürün formatına dönüştür (category sayfasıyla uyumlu)
    const products = diaProducts.map(item => {
      // Lastik ölçüsünü açıklama veya ozelkod3'ten çıkar
      let width = 0, aspect = 0, rim = 0;
      const desc = item.aciklama || '';
      const m = desc.match(/(\d{3})[\/\-](\d{2})[ZR\/\-]*(\d{2})/i) || (item.ozelkod3 && item.ozelkod3.match(/(\d{3})[\/\-](\d{2})[ZR\/\-]*(\d{2})/i));
      if (m) {
        width = parseInt(m[1]);
        aspect = parseInt(m[2]);
        rim = parseInt(m[3]);
      } else {
        width = item.Ebat1 || 0;
        aspect = item.Ebat2 || 0;
        rim = item.Ebat3 || 0;
      }

      // Mevsim
      let season = 'yaz';
      const lc = desc.toLowerCase();
      if (lc.includes('kış') || lc.includes('winter') || lc.includes('snow')) season = 'kis';
      else if (lc.includes('4 mevsim') || lc.includes('4season') || lc.includes('all season')) season = '4mevsim';

      const price = item.fiyat1 || item.fiyat2 || item.fiyat3 || item.sontuketicifiyati || 0;

      return {
        _id: item._key,
        name: item.aciklama || 'Lastik',
        brand: item.marka || item.Marka || 'Bilinmeyen Marka',
        sku: item.stokkartkodu || item._key,
        price: price,
        stock: item.fiili_stok || 0,
        specifications: {
          size: width && aspect && rim ? `${width}/${aspect}R${rim}` : (item.ozelkod3 || ''),
          width,
          aspectRatio: aspect,
          rimDiameter: rim,
          season,
          loadIndex: '',
          speedIndex: '',
          vehicleType: 'otomobil'
        },
        images: (item.m_resimler && item.m_resimler.length > 0)
          ? item.m_resimler.map(img => ({ url: img.aws_url || '/assets/img/tires/default-tire.jpg', alt: item.aciklama, isPrimary: true }))
          : [{ url: '/assets/img/tires/default-tire.jpg', alt: item.aciklama || 'Lastik', isPrimary: true }],
        stockStatus: (item.fiili_stok || 0) > 0 ? 'in_stock' : 'out_of_stock',
        currency: 'TRY'
      };
    });

    logger.info('Genel arama tamamlandı', { requestId, searchTerm, foundCount: products.length, total, duration: Date.now() - startTime });

    res.json({
      basarili: true,
      veri: products,
      sayfalama: {
        sayfaNo: parseInt(page),
        sayfaBoyutu: parseInt(limit),
        toplamKayit: total,
        toplamSayfa: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    logger.error('Genel arama hatası', { requestId, error: error.message, stack: error.stack, duration: Date.now() - startTime });
    res.status(500).json({ basarili: false, mesaj: 'Arama sırasında hata oluştu' });
  }
});

// Lastik arama API'si - ebata göre (DiaStock'tan)
app.get('/api/lastik/ebat-arama', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('=== LASTİK EBAT ARAMA API İSTEĞİ ===', {
    requestId,
    endpoint: '/api/lastik/ebat-arama',
    query: req.query,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  try {
    const { genislik, yanak, cap, mevsim, marka, minFiyat, maxFiyat, page = 1, limit = 20 } = req.query;
    // Cache kontrolü (60 sn TTL)
    const normalizedMevsim = (mevsim || 'tum').toString().toLowerCase();
    const normalizedMarka = (marka || '').toString().trim().toLowerCase();
    const cacheKey = `lastik:ebat:${genislik}x${yanak}R${cap}:${normalizedMevsim}:page${page}:limit${limit}${normalizedMarka ? `:marka:${normalizedMarka}` : ''}`;
    const cachedResults = await activeCache.get(cacheKey);
    if (cachedResults) {
      const duration = Date.now() - startTime;
      logger.info('=== LASTİK EBAT ARAMA CACHE HIT ===', {
        requestId,
        duration: `${duration}ms`,
        cacheKey,
        timestamp: new Date().toISOString()
      });
      return res.json(JSON.parse(cachedResults));
    }

    if (!genislik || !yanak || !cap) {
      return res.status(400).json({
        basarili: false,
        hata: 'Genişlik, yanak oranı ve jant çapı parametreleri gereklidir',
        requestId
      });
    }

    // DiaStock modelini import et
    const DiaStock = require('./models/plugins/DiaStock');

    // Lastik ebat regex'i oluştur (225/45R17, 225/45ZR17, 225-45-17 gibi formatları destekler)
    const sizePattern = `${genislik}[/-]${yanak}[ZR/-]*${cap}`;
    const sizeRegex = new RegExp(sizePattern, 'i');

    // MongoDB query oluştur
    const query = {
      durum: 'A', // Aktif
      b2c_gonder: 'E', // B2C'de göster
      fiili_stok: { $gt: 0 }, // Stokta var
      $or: [
        { aciklama: { $regex: sizeRegex } },
        { stokkartkodu: { $regex: sizeRegex } },
        { kodveaciklama: { $regex: sizeRegex } }
      ]
    };

    // Opsiyonel filtreler
    if (marka && marka !== 'tum') {
      query.marka = new RegExp(marka, 'i');
    }

    // Mevsim filtresi
    if (mevsim && mevsim !== 'tum') {
      const seasonQuery = [];
      if (mevsim === 'yaz') {
        seasonQuery.push(
          { aciklama: { $regex: /yaz|summer|yaz lastik/i } },
          { aciklama: { $not: { $regex: /kış|winter|snow|4 mevsim|all season|4season/i } } }
        );
      } else if (mevsim === 'kis') {
        seasonQuery.push(
          { aciklama: { $regex: /kış|winter|snow/i } }
        );
      } else if (mevsim === '4mevsim') {
        seasonQuery.push(
          { aciklama: { $regex: /4 mevsim|all season|4season/i } }
        );
      }

      if (seasonQuery.length > 0) {
        query.$and = query.$and || [];
        query.$and.push({ $or: seasonQuery });
      }
    }

    if (minFiyat || maxFiyat) {
      const priceQuery = {};
      if (minFiyat) priceQuery.$gte = parseFloat(minFiyat);
      if (maxFiyat) priceQuery.$lte = parseFloat(maxFiyat);

      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { fiyat1: priceQuery },
          { fiyat2: priceQuery },
          { fiyat3: priceQuery },
          { fiyat4: priceQuery },
          { sontuketicifiyati: priceQuery }
        ]
      });
    }

    // Sayfalama
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Arama yap
    const [diaProducts, totalCount] = await Promise.all([
      DiaStock.find(query)
        .sort({ fiili_stok: -1, fiyat1: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      DiaStock.countDocuments(query)
    ]);

    // DiaStock verilerini frontend formatına dönüştür
    const products = diaProducts.map(item => {
      // Lastik ölçülerini açıklamadan parse et
      const sizeMatch = item.aciklama?.match(/(\d{3})[\/\-](\d{2})[ZR\/\-]*(\d{2})/i);
      let parsedWidth = parseInt(genislik);
      let parsedAspect = parseInt(yanak);
      let parsedRim = parseInt(cap);

      if (sizeMatch) {
        parsedWidth = parseInt(sizeMatch[1]);
        parsedAspect = parseInt(sizeMatch[2]);
        parsedRim = parseInt(sizeMatch[3]);
      }

      // Mevsim bilgisini açıklamadan çıkar
      let season = 'yaz';
      const description = (item.aciklama || '').toLowerCase();
      if (description.includes('kış') || description.includes('winter') || description.includes('snow')) {
        season = 'kis';
      } else if (description.includes('4 mevsim') || description.includes('all season') || description.includes('4season')) {
        season = '4mevsim';
      }

      // Hız ve yük endekslerini çıkar
      const indexMatch = item.aciklama?.match(/(\d{2,3})([A-Z])/);
      const loadIndex = indexMatch ? indexMatch[1] : '';
      const speedIndex = indexMatch ? indexMatch[2] : '';

      // Fiyatı belirle
      const price = item.fiyat1 || item.fiyat2 || item.fiyat3 || item.sontuketicifiyati || 0;

      return {
        _id: item._key,
        name: item.aciklama || 'Lastik',
        brand: item.marka || 'Bilinmeyen Marka',
        sku: item.stokkartkodu || item._key,
        price: price,
        stock: item.fiili_stok || 0,
        specifications: {
          size: `${parsedWidth}/${parsedAspect}R${parsedRim}`,
          width: parsedWidth,
          aspectRatio: parsedAspect,
          rimDiameter: parsedRim,
          season: season,
          loadIndex: loadIndex,
          speedIndex: speedIndex,
          vehicleType: 'otomobil'
        },
        images: item.m_resimler && item.m_resimler.length > 0 ?
          item.m_resimler.map(img => ({
            url: img.aws_url || '/assets/img/tires/default-tire.jpg',
            alt: item.aciklama,
            isPrimary: true
          })) :
          [{
            url: '/assets/img/tires/default-tire.jpg',
            alt: item.aciklama || 'Lastik',
            isPrimary: true
          }],
        rating: {
          average: 4.0,
          count: 0
        },
        stockStatus: item.fiili_stok > 0 ? 'in_stock' : 'out_of_stock',
        isActive: item.durum === 'A',
        description: item.aciklama,
        b2c_description: item.b2c_description
      };
    });

    const duration = Date.now() - startTime;

    logger.info('=== LASTİK EBAT ARAMA API YANITI ===', {
      requestId,
      duration: `${duration}ms`,
      statusCode: 200,
      success: true,
      totalCount,
      returnedCount: products.length,
      query: { genislik, yanak, cap, mevsim, marka },
      sampleProducts: products.slice(0, 3).map(p => ({
        name: p.name,
        brand: p.brand,
        size: p.specifications.size,
        price: p.price,
        stock: p.stock
      })),
      timestamp: new Date().toISOString()
    });

    const responsePayload = {
      basarili: true,
      veri: products,
      sayfalama: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit),
        hasNext: skip + products.length < totalCount,
        hasPrev: parseInt(page) > 1
      },
      mesaj: `${totalCount} adet lastik bulundu`,
      requestId
    };

    // 60 sn TTL ile cache'e yaz
    await activeCache.set(cacheKey, JSON.stringify(responsePayload), 60);

    res.json(responsePayload);

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('=== LASTİK EBAT ARAMA API HATASI ===', {
      requestId,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      basarili: false,
      hata: 'Lastik arama sırasında hata oluştu',
      mesaj: 'Lastik arama sırasında hata oluştu',
      requestId
    });
  }
});

// Wheelsize lastik ölçüleri ile Dia stok karşılaştırma API'si
app.post('/api/lastik/dia-stok-kontrol', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('=== DIA STOK KONTROL API İSTEĞİ ===', {
    requestId,
    endpoint: '/api/lastik/dia-stok-kontrol',
    body: req.body,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  try {
    const { wheelsizeProducts } = req.body;

    // Cache key oluştur (ürün ID'lerine göre)
    const productIds = wheelsizeProducts.map(p => p._id || p.id).filter(Boolean);
    const cacheKey = cacheKeys.diaStock(productIds);

    // Cache'den kontrol et
    const cachedData = await activeCache.get(cacheKey);
    if (cachedData) {
      const cachedResult = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
      const duration = Date.now() - startTime;

      logger.info('=== DIA STOK KONTROL CACHE HIT ===', {
        requestId,
        duration: `${duration}ms`,
        cacheKey,
        inputCount: wheelsizeProducts.length,
        outputCount: cachedResult.veri ? cachedResult.veri.length : 0,
        timestamp: new Date().toISOString()
      });

      return res.json({
        ...cachedResult,
        requestId,
        cached: true
      });
    }

    if (!wheelsizeProducts || !Array.isArray(wheelsizeProducts)) {
      return res.status(400).json({
        basarili: false,
        hata: 'wheelsizeProducts array gereklidir',
        requestId
      });
    }

    // DiaStock modelini import et
    const DiaStock = require('./models/plugins/DiaStock');

    const enhancedProducts = [];

    // Her wheelsize ürünü için Dia stok karşılaştırması yap
    for (const wheelsizeProduct of wheelsizeProducts) {
      try {
        // Lastik ölçüsünü parse et
        const sizeInfo = parseWheelsizeProduct(wheelsizeProduct);
        if (!sizeInfo) {
          // Parse edilemeyen ürünleri olduğu gibi ekle
          enhancedProducts.push({
            ...wheelsizeProduct,
            diaStock: null,
            stockStatus: 'unknown'
          });
          continue;
        }

        // Dia stokta eşleşen ürünleri ara
        const diaMatches = await findDiaStockMatches(sizeInfo);

        // En iyi eşleşmeyi seç (stok durumu, fiyat vs. göre)
        const bestMatch = selectBestDiaMatch(diaMatches, sizeInfo);

        // Wheelsize ürünü ile Dia stok bilgisini birleştir
        enhancedProducts.push({
          ...wheelsizeProduct,
          diaStock: bestMatch,
          stockStatus: bestMatch ? (bestMatch.fiili_stok > 0 ? 'in_stock' : 'out_of_stock') : 'not_found',
          realPrice: bestMatch?.fiyat1 || bestMatch?.sontuketicifiyati || null,
          realStock: bestMatch?.fiili_stok || 0,
          realBrand: bestMatch?.marka || null,
          diaProductCode: bestMatch?.stokkartkodu || null
        });

      } catch (productError) {
        logger.error('Ürün işleme hatası:', {
          requestId,
          product: wheelsizeProduct,
          error: productError.message
        });

        // Hatalı ürünleri olduğu gibi ekle
        enhancedProducts.push({
          ...wheelsizeProduct,
          diaStock: null,
          stockStatus: 'error'
        });
      }
    }

    const duration = Date.now() - startTime;

    const responseData = {
      basarili: true,
      veri: enhancedProducts,
      meta: {
        totalProducts: enhancedProducts.length,
        stockAvailable: enhancedProducts.filter(p => p.stockStatus === 'in_stock').length,
        outOfStock: enhancedProducts.filter(p => p.stockStatus === 'out_of_stock').length,
        notFound: enhancedProducts.filter(p => p.stockStatus === 'not_found').length,
        errors: enhancedProducts.filter(p => p.stockStatus === 'error').length
      },
      requestId
    };

    // Başarılı sonucu cache'le (5 dakika TTL)
    await activeCache.set(cacheKey, JSON.stringify(responseData), 300);

    logger.info('=== DIA STOK KONTROL API YANITI ===', {
      requestId,
      duration: `${duration}ms`,
      statusCode: 200,
      success: true,
      inputCount: wheelsizeProducts.length,
      outputCount: enhancedProducts.length,
      stockFoundCount: responseData.meta.stockAvailable,
      noStockCount: responseData.meta.outOfStock,
      notFoundCount: responseData.meta.notFound,
      cached: false
    });

    res.json(responseData);

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('=== DIA STOK KONTROL API HATASI ===', {
      requestId,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
      body: req.body,
      detailedError: {
        name: error.name,
        message: error.message,
        code: error.code
      }
    });

    res.status(500).json({
      basarili: false,
      hata: `Dia stok kontrolü sırasında hata oluştu: ${error.message}`,
      requestId,
      errorDetails: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
});
// Wheelsize Lastik ebadına göre uyumlu araçlar
app.get('/api/wheelsize/by-tire', async (req, res) => {
  const cacheKey = `wheelsize:by-tire:${req.query.width}-${req.query.aspect_ratio}-${req.query.rim_diameter}`;

  try {
    // Cache kontrol
    const cached = await activeCache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const { width, aspect_ratio, rim_diameter } = req.query;

    if (!width || !aspect_ratio || !rim_diameter) {
      return res.status(400).json({
        success: false,
        message: 'width, aspect_ratio, rim_diameter parametreleri gerekli'
      });
    }

    const WheelSizeService = require('./services/plugins/wheelsize/WheelSizeService');
    const result = await WheelSizeService.searchByTire(
      parseInt(width),
      parseInt(aspect_ratio),
      parseInt(rim_diameter)
    );

    const response = { success: true, data: result };

    // 1 saat cache
    await activeCache.set(cacheKey, JSON.stringify(response), 3600);

    res.json(response);
  } catch (error) {
    logger.error('by-tire error:', error);
    res.status(500).json({ success: false, message: 'Uyumlu araclar getirilemedi' });
  }
});
// Navbar kategorilerine göre lastik filtreleme API'si
app.get('/api/lastik/kategori/:kategori', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('=== LASTİK KATEGORİ API İSTEĞİ ===', {
    requestId,
    endpoint: `/api/lastik/kategori/${req.params.kategori}`,
    query: req.query,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  try {
    const { kategori } = req.params;
    const { marka, ebat, teknoloji, desen } = req.query;

    // Cache key oluştur - marka parametresini normalize et
    const normalizedMarka = marka ? marka.toLowerCase().trim() : '';
    const cacheKey = `lastik:kategori:${kategori}:${normalizedMarka}:${ebat || ''}:${teknoloji || ''}:${desen || ''}`;

    // Cache'den kontrol et
    const cachedData = await activeCache.get(cacheKey);
    if (cachedData) {
      const cachedResult = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
      const duration = Date.now() - startTime;

      logger.info('=== LASTİK KATEGORİ CACHE HIT ===', {
        requestId,
        duration: `${duration}ms`,
        cacheKey,
        kategori,
        resultCount: cachedResult.veri ? cachedResult.veri.length : 0,
        timestamp: new Date().toISOString()
      });

      return res.json({
        ...cachedResult,
        requestId,
        cached: true
      });
    }

    // DiaStock modelini import et
    const DiaStock = require('./models/plugins/DiaStock');

    // Kategori bazlı filtreleme
    let query = {
      durum: 'A',
      b2c_gonder: 'E'
    };

    // Kategori filtreleme
    switch (kategori.toLowerCase()) {
      case 'yaz':
        query['ozelkod1'] = { $regex: /YAZ/i };
        break;
      case 'kis':
        query['ozelkod1'] = { $regex: /KIŞ|WINTER/i };
        break;
      case '4mevsim':
      case '4-mevsim':
      case 'dort-mevsim':
        query['ozelkod1'] = { $regex: /4 MEVSİM|ALL SEASON/i };
        break;
      case 'runflat':
        query['ozelkod7'] = { $regex: /RUNFLAT|RF/i };
        break;
      case 'seal':
        query['ozelkod7'] = { $regex: /SEAL/i };
        break;
      case 'xl-rf':
        query['$and'] = [
          { 'ozelkod7': { $regex: /XL/i } },
          { 'ozelkod7': { $regex: /RF|RUNFLAT/i } }
        ];
        break;
      default:
        // Genel lastik araması
        query['ozelkod7'] = { $regex: /LASTİK/i };
    }

    // Marka filtreleme
    if (marka) {
      // Hem marka hem de markaack alanlarında ara
      query['$or'] = [
        { 'marka': { $regex: new RegExp(marka, 'i') } },
        { 'markaack': { $regex: new RegExp(marka, 'i') } }
      ];
    }

    // Ebat filtreleme
    if (ebat) {
      query['ozelkod3'] = { $regex: new RegExp(ebat, 'i') };
    }

    // Teknoloji filtreleme
    if (teknoloji) {
      query['ozelkod7'] = { $regex: new RegExp(teknoloji, 'i') };
    }

    // Desen filtreleme
    if (desen) {
      query['aciklama'] = { $regex: new RegExp(desen, 'i') };
    }

    // Veritabanından lastikleri getir
    const lastikler = await DiaStock.find(query)
      .limit(50) // Performans için limit
      .sort({ fiili_stok: -1, fiyat1: 1 }); // Stoklu ve ucuz olanlar önce

    // Sonuçları formatla
    const formattedLastikler = lastikler.map(lastik => ({
      _id: lastik._id,
      stokkartkodu: lastik.stokkartkodu,
      aciklama: lastik.aciklama,
      marka: lastik.marka,
      markaack: lastik.markaack,
      fiili_stok: lastik.fiili_stok,
      fiyat1: lastik.fiyat1,
      sontuketicifiyati: lastik.sontuketicifiyati,
      ozelkod1: lastik.ozelkod1, // Mevsim
      ozelkod2: lastik.ozelkod2, // Tip
      ozelkod3: lastik.ozelkod3, // Ebat
      ozelkod4: lastik.ozelkod4, // Jant çapı
      ozelkod7: lastik.ozelkod7, // Teknoloji
      aws_url: lastik.aws_url,
      stockStatus: lastik.fiili_stok > 0 ? 'in_stock' : 'out_of_stock',
      realPrice: lastik.sontuketicifiyati || lastik.fiyat1,
      realStock: lastik.fiili_stok,
      realBrand: lastik.markaack,
      diaProductCode: lastik.stokkartkodu
    }));

    const duration = Date.now() - startTime;

    const responseData = {
      basarili: true,
      veri: formattedLastikler,
      meta: {
        kategori,
        totalProducts: formattedLastikler.length,
        stockAvailable: formattedLastikler.filter(p => p.stockStatus === 'in_stock').length,
        outOfStock: formattedLastikler.filter(p => p.stockStatus === 'out_of_stock').length,
        filters: {
          marka,
          ebat,
          teknoloji,
          desen
        }
      },
      requestId
    };

    // Başarılı sonucu cache'le (10 dakika TTL)
    await activeCache.set(cacheKey, JSON.stringify(responseData), 600);

    logger.info('=== LASTİK KATEGORİ API YANITI ===', {
      requestId,
      duration: `${duration}ms`,
      statusCode: 200,
      success: true,
      kategori,
      resultCount: formattedLastikler.length,
      stockFoundCount: responseData.meta.stockAvailable,
      noStockCount: responseData.meta.outOfStock,
      cached: false
    });

    res.json(responseData);

  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('=== LASTİK KATEGORİ API HATASI ===', {
      requestId,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
      kategori: req.params.kategori,
      query: req.query
    });

    res.status(500).json({
      basarili: false,
      hata: `Lastik kategori araması sırasında hata oluştu: ${error.message}`,
      requestId,
      errorDetails: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }
});

// Wheelsize ürün bilgisini parse et
function parseWheelsizeProduct(product) {
  try {
    // Farklı kaynaklardan ölçü bilgisini çıkar
    let genislik, yanak, cap;

    // 1. Direkt alanlardan
    if (product.kesitGenisligi && product.yanakOrani && product.jantCapi) {
      genislik = product.kesitGenisligi;
      yanak = product.yanakOrani;
      cap = product.jantCapi;
    }
    // 2. ebat alanından (225/45R17 formatı)
    else if (product.ebat) {
      const sizeMatch = product.ebat.match(/(\d+)\/(\d+)[ZR]*(\d+)/i);
      if (sizeMatch) {
        genislik = parseInt(sizeMatch[1]);
        yanak = parseInt(sizeMatch[2]);
        cap = parseInt(sizeMatch[3]);
      }
    }
    // 3. model alanından
    else if (product.model) {
      const sizeMatch = product.model.match(/(\d+)\/(\d+)[ZR]*(\d+)/i);
      if (sizeMatch) {
        genislik = parseInt(sizeMatch[1]);
        yanak = parseInt(sizeMatch[2]);
        cap = parseInt(sizeMatch[3]);
      }
    }

    if (!genislik || !yanak || !cap) {
      return null;
    }

    return {
      genislik,
      yanak,
      cap,
      mevsim: detectSeason(product),
      wheelsizeProduct: product
    };

  } catch (error) {
    logger.error('Wheelsize ürün parse hatası:', { product, error: error.message });
    return null;
  }
}

// Mevsim bilgisini tespit et
function detectSeason(product) {
  const searchText = `${product.aciklama || ''} ${product.model || ''} ${product.mevsim || ''}`.toLowerCase();

  if (searchText.includes('kış') || searchText.includes('winter') || searchText.includes('snow')) {
    return 'kis';
  } else if (searchText.includes('4 mevsim') || searchText.includes('all season') || searchText.includes('4season')) {
    return '4mevsim';
  } else {
    return 'yaz'; // Default
  }
}

// Dia stokta eşleşen ürünleri bul
async function findDiaStockMatches(sizeInfo) {
  const DiaStock = require('./models/plugins/DiaStock');

  try {
    // 1. Ana arama: ozelkod3 ile (175/70R14 formatı)
    const sizePattern1 = `${sizeInfo.genislik}/${sizeInfo.yanak}R${sizeInfo.cap}`;
    const sizePattern2 = `${sizeInfo.genislik}/${sizeInfo.yanak}ZR${sizeInfo.cap}`;
    const sizePattern3 = `${sizeInfo.genislik}-${sizeInfo.yanak}-${sizeInfo.cap}`;

    const query = {
      durum: 'A',
      // b2c_gonder filtresi kaldırıldı - tüm ürünleri dahil et
      $or: [
        { ozelkod3kodu: { $in: [sizePattern1, sizePattern2, sizePattern3] } },
        { ozelkod3: { $regex: new RegExp(`${sizeInfo.genislik}[/-]${sizeInfo.yanak}[ZR/-]*${sizeInfo.cap}`, 'i') } },
        { aciklama: { $regex: new RegExp(`${sizeInfo.genislik}[/-]${sizeInfo.yanak}[ZR/-]*${sizeInfo.cap}`, 'i') } },
        { stokkartkodu: { $regex: new RegExp(`${sizeInfo.genislik}[/-]${sizeInfo.yanak}[ZR/-]*${sizeInfo.cap}`, 'i') } },
        { kodveaciklama: { $regex: new RegExp(`${sizeInfo.genislik}[/-]${sizeInfo.yanak}[ZR/-]*${sizeInfo.cap}`, 'i') } }
      ]
    };

    // 2. Ürün özellikleri ile de ara
    const propertyQuery = {
      durum: 'A',
      // b2c_gonder filtresi kaldırıldı - tüm ürünleri dahil et
      'm_urunOzellikleri': {
        $elemMatch: {
          $and: [
            { ozellikadi: 'Genişlik', detayaciklama: sizeInfo.genislik.toString() },
            { ozellikadi: 'Yanak', detayaciklama: sizeInfo.yanak.toString() },
            { ozellikadi: 'Jant Çapı', detayaciklama: { $regex: new RegExp(`R?${sizeInfo.cap}`, 'i') } }
          ]
        }
      }
    };

    // Her iki sorguyu da çalıştır
    const [mainResults, propertyResults] = await Promise.all([
      DiaStock.find(query).limit(50).lean(),
      DiaStock.find(propertyQuery).limit(50).lean()
    ]);

    // Sonuçları birleştir ve unique yap
    const allResults = [...mainResults, ...propertyResults];
    const uniqueResults = allResults.filter((item, index, self) =>
      index === self.findIndex(t => t._key === item._key)
    );

    return uniqueResults;

  } catch (error) {
    logger.error('Dia stok arama hatası:', { sizeInfo, error: error.message });
    return [];
  }
}

// En iyi Dia eşleşmesini seç
function selectBestDiaMatch(matches, sizeInfo) {
  if (!matches || matches.length === 0) {
    return null;
  }

  // Öncelik sırası:
  // 1. Stokta olan ürünler (öncelik ver ama zorunlu değil)
  // 2. Mevsim eşleşmesi
  // 3. En düşük fiyat
  // 4. En yüksek stok

  const stockedMatches = matches.filter(m => m.fiili_stok > 0);
  const workingSet = stockedMatches.length > 0 ? stockedMatches : matches;

  // Mevsim eşleşmesi kontrolü
  const seasonMatches = workingSet.filter(match => {
    const matchSeason = detectSeasonFromDiaProduct(match);
    return matchSeason === sizeInfo.mevsim;
  });

  const finalSet = seasonMatches.length > 0 ? seasonMatches : workingSet;

  // En iyi eşleşmeyi seç (stok > fiyat sıralaması)
  return finalSet.sort((a, b) => {
    // Önce stok durumuna göre sırala
    if (a.fiili_stok > 0 && b.fiili_stok <= 0) return -1;
    if (a.fiili_stok <= 0 && b.fiili_stok > 0) return 1;

    // Sonra fiyata göre (düşük fiyat önce)
    const priceA = a.fiyat1 || a.sontuketicifiyati || 999999;
    const priceB = b.fiyat1 || b.sontuketicifiyati || 999999;
    if (priceA !== priceB) return priceA - priceB;

    // Son olarak stok miktarına göre (yüksek stok önce)
    return b.fiili_stok - a.fiili_stok;
  })[0];
}

// Dia ürününden mevsim bilgisini çıkar
function detectSeasonFromDiaProduct(diaProduct) {
  const searchFields = [
    diaProduct.aciklama,
    diaProduct.ekalan1,
    diaProduct.ekalan2,
    diaProduct.ozelkod1,
    diaProduct.ozelkod1kodu
  ].filter(Boolean);

  const searchText = searchFields.join(' ').toLowerCase();

  if (searchText.includes('kış') || searchText.includes('winter') || searchText.includes('snow')) {
    return 'kis';
  } else if (searchText.includes('4 mevsim') || searchText.includes('all season') || searchText.includes('4season')) {
    return '4mevsim';
  } else {
    return 'yaz';
  }
}

// Cache temizleme API'si
app.post('/api/cache/clear', async (req, res) => {
  try {
    const { pattern } = req.body;

    if (pattern) {
      const deletedCount = await activeCache.invalidateDiaStockCache(pattern);
      res.json({
        basarili: true,
        mesaj: `${deletedCount} cache entry silindi`,
        veri: { deletedCount, pattern }
      });
    } else {
      await activeCache.clear();
      res.json({
        basarili: true,
        mesaj: 'Tüm cache temizlendi'
      });
    }
  } catch (error) {
    logger.error('Cache clear error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Cache temizlenirken hata oluştu'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: Object.values(error.errors).map(err => err.message)
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid ID format' });
  }

  res.status(500).json({ error: 'Internal server error' });
});
// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');

  try {
    // Stop scheduler first
    logger.info('DIA Stock Scheduler stopped');

    await mongoose.connection.close();
    await activeCache.disconnect();
    logger.info('Database and cache connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');

  try {

    await mongoose.connection.close();
    await activeCache.disconnect();
    logger.info('Database and cache connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

async function checkAndRunStartupSync() {
  try {
    // Son sync bilgisini sadece log için kontrol et
    const lastSyncInfo = await activeCache.get('dia-sync:last-full-sync');

    if (lastSyncInfo) {
      const lastSync = JSON.parse(lastSyncInfo);
      const lastSyncDate = new Date(lastSync.timestamp);
      const hoursAgo = Math.round((Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60));

      logger.info('Son sync bilgisi:', {
        lastSyncDate: lastSyncDate,
        hoursAgo: hoursAgo,
        source: lastSync.source || 'unknown'
      });
    } else {
      logger.info('Henüz sync yapılmamış - İlk sync gece saat 05:00\'da otomatik çalışacak');
    }

  } catch (error) {
    logger.error('Startup sync kontrolü hatası:', error);
  }
}
// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});
// Start server
const PORT = process.env.PORT || 3082;
app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`Alastik API Server started on port ${PORT}`);
  // Start DIA Stock Scheduler
  try {
  } catch (error) {
    logger.error('Failed to start DIA Stock Scheduler:', error);
  }
  // Startup sync kontrolü
  await checkAndRunStartupSync();
});

module.exports = app; 
