const path = require('path');
const paths = require('./config/path');

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================
// Dynamically load the correct .env file based on NODE_ENV
// - Development: loads .env.local
// - Production: loads .env.production

const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.local';

require('dotenv').config({
  path: path.resolve(__dirname, `../${envFile}`)
});

// ============================================
// CORE DEPENDENCIES
// ============================================
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
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
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
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

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 500,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'development';
  }
});

const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika
  max: 300,
  message: 'Too many search requests, please try again later.',
  skip: (req) => {
    // Development'ta search rate limiting'i gevşet
    return process.env.NODE_ENV === 'development';
  }
});
app.use('/api/', limiter);
app.use('/api/search', searchLimiter);
// Attach session middleware early (if used globally)
try {
  const { sessionMiddleware } = require('./middleware/auth');
  app.use(sessionMiddleware);
} catch (e) {
  // ignore if not available
}

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL, process.env.ADMIN_URL]
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3080', 'http://localhost:3081'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.static(path.join(__dirname, 'public')));

// Body parsing & cookies
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security middleware
app.use(mongoSanitize());
app.use(hpp());

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
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });

  next();
});

// MongoDB connection with improved settings
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || 15,
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4,
  bufferCommands: false,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  maxIdleTimeMS: 30000
})
  .then(async () => {
    logger.info('Connected to MongoDB');

    // Create default admin user if not exists
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
/**
  * (MAIN) Dashboard - Route *
*/
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
// DIA PLUGIN ROUTES (YENİ - Worker Queue API)
// ============================================
const diaRoutes = require('./routes/plugins/dia');
app.use('/api/dia', diaRoutes);
logger.info('✅ DIA Plugin Routes yüklendi');

/**
  * THEME - Routes *
*/

/* Genel Site Ayarları */
const webGeneralSettingsRoutes = require('./routes/web/other/generalsettings');
app.use('/api/general-settings', webGeneralSettingsRoutes);

/* Çeviriler */
const webTranslateRoutes = require('./routes/web/other/translations');
app.use('/api/translations', webTranslateRoutes);

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

/* Etiket */
const webTagsRoutes = require('./routes/web/catalog/tags');
app.use('/api/tags', webTagsRoutes);

/* Ürün Filtreleme */
const webFiltersRoutes = require('./routes/web/catalog/filters');
app.use('/api/filters', webFiltersRoutes);

const showcaseRoutes = require('./routes/admin/catalog/showcase');
app.use('/api/showcases', showcaseRoutes);
/**
  * (Dashboard) Admin - Functions *
*/
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

/* * Görsel Upload * */
const mediaRoutes = require('./routes/admin/catalog/media');
app.use('/api/media', mediaRoutes);

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


/**
  * Tema - Routes *
*/

/* Tema Blokları */
const blocksRoutes = require('./routes/public/theme/block');
app.use('/api/blocks', blocksRoutes);


// API Routes
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

// Netahsilat routes removed



// Search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // Check cache first
    const cacheKey = `search:${q}:${page}:${limit}`;
    const cachedResults = await activeCache.get(cacheKey);

    if (cachedResults) {
      return res.json(JSON.parse(cachedResults));
    }

    // Perform text search
    const products = await Product.find(
      {
        $text: { $search: q },
        isActive: true
      },
      {
        score: { $meta: 'textScore' }
      }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v')
      .lean();

    const total = await Product.countDocuments({
      $text: { $search: q },
      isActive: true
    });

    const result = {
      products,
      query: q,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    // Cache search results for 5 minutes
    await activeCache.set(cacheKey, JSON.stringify(result), 300);

    res.json(result);
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Inventory endpoint
app.get('/api/inventory/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const inventory = await Inventory.findOne({ productId })
      .populate('productId', 'name sku brand')
      .select('-__v');

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory not found' });
    }

    res.json(inventory);
  } catch (error) {
    logger.error('Inventory fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DIA Stock endpoints
// Get DIA stock list with filters and pagination
app.get('/api/dia-stock', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      marka,
      durum = 'A',
      b2c_gonder = 'E',
      stok_durumu,
      kategori,
      search,
      sort = 'updatedAt'
    } = req.query;

    // Build query
    const query = {};
    if (durum) query.durum = durum;
    if (b2c_gonder) query.b2c_gonder = b2c_gonder;
    if (marka) query.marka = { $regex: marka, $options: 'i' };
    if (kategori) query['m_kategoriler.kategori_aciklama_1'] = { $regex: kategori, $options: 'i' };

    // Stok durumu filtresi
    if (stok_durumu === 'in_stock') {
      query.fiili_stok = { $gt: 0 };
    } else if (stok_durumu === 'out_of_stock') {
      query.fiili_stok = { $lte: 0 };
    }

    // Search filter
    if (search) {
      query.$or = [
        { aciklama: { $regex: search, $options: 'i' } },
        { stokkartkodu: { $regex: search, $options: 'i' } },
        { marka: { $regex: search, $options: 'i' } },
        { ekalan1: { $regex: search, $options: 'i' } }
      ];
    }

    // Check cache first
    const cacheKey = `dia-stock:${JSON.stringify(query)}:${page}:${limit}:${sort}`;
    const cachedResults = await activeCache.get(cacheKey);

    if (cachedResults) {
      return res.json(JSON.parse(cachedResults));
    }

    // Build sort object
    const sortObj = {};
    if (sort === 'marka') sortObj.marka = 1;
    else if (sort === 'stok_desc') sortObj.fiili_stok = -1;
    else if (sort === 'stok_asc') sortObj.fiili_stok = 1;
    else if (sort === 'fiyat_desc') sortObj.fiyat1 = -1;
    else if (sort === 'fiyat_asc') sortObj.fiyat1 = 1;
    else if (sort === 'updatedAt') sortObj.updatedAt = -1;
    else sortObj.updatedAt = -1;

    // Execute query
    const stocks = await DiaStock.find(query)
      .sort(sortObj)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('_key aciklama marka stokkartkodu fiili_stok fiyat1 primaryCategory primaryImage durum b2c_gonder updatedAt')
      .lean();

    const total = await DiaStock.countDocuments(query);

    const result = {
      stocks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        marka,
        durum,
        b2c_gonder,
        stok_durumu,
        kategori,
        search
      }
    };

    // Cache result for 5 minutes
    await activeCache.set(cacheKey, JSON.stringify(result), 300);

    res.json(result);
  } catch (error) {
    logger.error('DIA stock fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single DIA stock by _key
app.get('/api/dia-stock/:_key', async (req, res) => {
  try {
    const { _key } = req.params;

    // Check cache first
    const cacheKey = `dia-stock:${_key}`;
    const cachedStock = await activeCache.get(cacheKey);

    if (cachedStock) {
      return res.json(JSON.parse(cachedStock));
    }

    const stock = await DiaStock.findOne({ _key })
      .select('-__v')
      .lean();

    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    // Cache stock for 30 minutes
    await activeCache.set(cacheKey, JSON.stringify(stock), 1800);

    res.json(stock);
  } catch (error) {
    logger.error('DIA stock fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add manual DIA stock
app.post('/api/dia-stock', async (req, res) => {
  try {
    const stockData = req.body;

    if (!stockData._key) {
      return res.status(400).json({ error: '_key field is required' });
    }

    const result = await diaStockService.addManualStock(stockData);

    res.status(201).json(result);
  } catch (error) {
    logger.error('Manual stock add error:', error);

    if (error.message.includes('zaten mevcut')) {
      return res.status(409).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update DIA stock
app.put('/api/dia-stock/:_key', async (req, res) => {
  try {
    const { _key } = req.params;
    const updateData = req.body;

    const stock = await DiaStock.findOne({ _key });
    if (!stock) {
      return res.status(404).json({ error: 'Stock not found' });
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (key !== '_key' && key !== 'createdAt' && key !== 'updatedAt') {
        stock[key] = updateData[key];
      }
    });

    // Update sync info
    stock.syncInfo.lastSyncDate = new Date();
    stock.syncInfo.syncSource = 'manual';
    stock.syncInfo.syncStatus = 'synced';

    await stock.save();

    // Invalidate cache
    await activeCache.del(`dia-stock:${_key}`);
    await activeCache.invalidateSearchCache();

    res.json({ success: true, _key });
  } catch (error) {
    logger.error('DIA stock update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Trigger DIA stock synchronization
app.post('/api/dia-stock/sync', async (req, res) => {
  try {
    const { type = 'full', _key } = req.body;

    let result;

    if (type === 'single' && _key) {
      result = await diaStockService.syncSingleStock(_key);
    } else if (type === 'incremental') {
      const lastSyncDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Son 24 saat
      result = await diaStockService.incrementalSync(lastSyncDate);
    } else {
      // Background'da çalıştır - tam sync uzun sürebilir
      diaStockService.fullSync().catch(error => {
        logger.error('Background sync error:', error);
      });

      result = {
        success: true,
        message: 'Full synchronization started in background',
        type: 'full'
      };
    }

    res.json(result);
  } catch (error) {
    logger.error('DIA stock sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get DIA stock synchronization statistics
app.get('/api/dia-stock/stats', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'dia-stock:stats';
    const cachedStats = await activeCache.get(cacheKey);

    if (cachedStats) {
      return res.json(JSON.parse(cachedStats));
    }

    const stats = await diaStockService.getSyncStats();

    // Cache stats for 10 minutes
    await activeCache.set(cacheKey, JSON.stringify(stats), 600);

    res.json(stats);
  } catch (error) {
    logger.error('DIA stock stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get DIA stock synchronization status
app.get('/api/dia-stock/sync-status', async (req, res) => {
  try {
    const pendingSync = await DiaStock.countDocuments({ 'syncInfo.syncStatus': 'pending' });
    const errorSync = await DiaStock.countDocuments({ 'syncInfo.syncStatus': 'error' });
    const lastSyncDate = await DiaStock.findOne(
      { 'syncInfo.syncStatus': 'synced' },
      { 'syncInfo.lastSyncDate': 1 }
    ).sort({ 'syncInfo.lastSyncDate': -1 });

    const syncErrors = await DiaStock.find(
      { 'syncInfo.syncStatus': 'error' },
      { _key: 1, stokkartkodu: 1, 'syncInfo.errorMessage': 1, 'syncInfo.lastSyncDate': 1 }
    ).limit(10).sort({ 'syncInfo.lastSyncDate': -1 });

    res.json({
      pendingCount: pendingSync,
      errorCount: errorSync,
      lastSyncDate: lastSyncDate?.syncInfo?.lastSyncDate || null,
      recentErrors: syncErrors
    });
  } catch (error) {
    logger.error('DIA stock sync status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search DIA stocks with text search
app.get('/api/dia-stock/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // Check cache first
    const cacheKey = `dia-stock:search:${q}:${page}:${limit}`;
    const cachedResults = await activeCache.get(cacheKey);

    if (cachedResults) {
      return res.json(JSON.parse(cachedResults));
    }

    // Perform text search
    const stocks = await DiaStock.find(
      {
        $text: { $search: q },
        durum: 'A',
        b2c_gonder: 'E'
      },
      {
        score: { $meta: 'textScore' }
      }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('_key aciklama marka stokkartkodu fiili_stok fiyat1 primaryCategory primaryImage')
      .lean();

    const total = await DiaStock.countDocuments({
      $text: { $search: q },
      durum: 'A',
      b2c_gonder: 'E'
    });

    const result = {
      stocks,
      query: q,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };

    // Cache search results for 5 minutes
    await activeCache.set(cacheKey, JSON.stringify(result), 300);

    res.json(result);
  } catch (error) {
    logger.error('DIA stock search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get DIA stock brands
app.get('/api/dia-stock/brands', async (req, res) => {
  try {
    // Check cache first
    const cacheKey = 'dia-stock:brands';
    const cachedBrands = await activeCache.get(cacheKey);

    if (cachedBrands) {
      return res.json(JSON.parse(cachedBrands));
    }

    const brands = await DiaStock.aggregate([
      { $match: { durum: 'A', marka: { $ne: null, $ne: '' } } },
      { $group: { _id: '$marka', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { brand: '$_id', count: 1, _id: 0 } }
    ]);

    // Cache brands for 1 hour
    await activeCache.set(cacheKey, JSON.stringify(brands), 3600);

    res.json(brands);
  } catch (error) {
    logger.error('DIA stock brands error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Wheel Size API Proxy Endpoints
const WHEEL_SIZE_API_BASE = process.env.WHEEL_SIZE_API_URL || 'http://217.195.202.170:5000/api';

async function tryWheelSize(path, cfg = {}) {
  const bases = new Set();
  const base = (WHEEL_SIZE_API_BASE || '').replace(/\/$/, '');
  const hasApi = /\/api$/i.test(base);
  const alt = hasApi ? base.replace(/\/api$/i, '') : `${base}/api`;
  const swapProtocol = (u) => u.startsWith('http://') ? u.replace('http://', 'https://') : (u.startsWith('https://') ? u.replace('https://', 'http://') : u);

  [base, alt, swapProtocol(base), swapProtocol(alt), 'http://localhost:5058/api', 'http://localhost:5058']
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

// Araç API'leri
app.get('/api/arac/markalar', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('=== ARAÇ MARKALAR API İSTEĞİ ===', {
    requestId,
    endpoint: '/api/arac/markalar',
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  try {
    const params = { ...(req.query || {}) };
    // Sadece eudm bölgesini iste
    params.bolgeler = 'eudm';
    const response = await tryWheelSize(`/arac/markalar`, { params });

    const duration = Date.now() - startTime;
    const responseData = response.data;

    logger.info('=== ARAÇ MARKALAR API YANITI ===', {
      requestId,
      duration: `${duration}ms`,
      statusCode: response.status,
      dataLength: responseData.veri ? responseData.veri.length : 0,
      success: responseData.basarili,
      totalRecords: responseData.toplamKayit,
      sampleData: responseData.veri ? responseData.veri.slice(0, 3) : null,
      timestamp: new Date().toISOString()
    });

    res.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('=== ARAÇ MARKALAR API HATASI ===', {
      requestId,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
      statusCode: error.response?.status,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      basarili: false,
      hata: 'Marka bilgileri alınırken hata oluştu',
      requestId
    });
  }
});

app.get('/api/arac/modeller', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('=== ARAÇ MODELLER API İSTEĞİ ===', {
    requestId,
    endpoint: '/api/arac/modeller',
    query: req.query,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  try {
    const params = { ...(req.query || {}) };
    params.bolgeler = 'eudm';
    const response = await tryWheelSize(`/arac/modeller`, { params });

    const duration = Date.now() - startTime;
    const responseData = response.data;

    logger.info('=== ARAÇ MODELLER API YANITI ===', {
      requestId,
      duration: `${duration}ms`,
      statusCode: response.status,
      dataLength: responseData.veri ? responseData.veri.length : 0,
      success: responseData.basarili,
      totalRecords: responseData.toplamKayit,
      sampleData: responseData.veri ? responseData.veri.slice(0, 3) : null,
      timestamp: new Date().toISOString()
    });

    res.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('=== ARAÇ MODELLER API HATASI ===', {
      requestId,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
      statusCode: error.response?.status,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      basarili: false,
      hata: 'Model bilgileri alınırken hata oluştu',
      requestId
    });
  }
});

app.get('/api/arac/yillar', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('=== ARAÇ YILLAR API İSTEĞİ ===', {
    requestId,
    endpoint: '/api/arac/yillar',
    query: req.query,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  try {
    const params = { ...(req.query || {}) };
    params.bolgeler = 'eudm';
    const response = await tryWheelSize(`/arac/yillar`, { params });

    const duration = Date.now() - startTime;
    const responseData = response.data;

    logger.info('=== ARAÇ YILLAR API YANITI ===', {
      requestId,
      duration: `${duration}ms`,
      statusCode: response.status,
      dataLength: responseData.veri ? responseData.veri.length : 0,
      success: responseData.basarili,
      sampleData: responseData.veri ? responseData.veri.slice(0, 5) : null,
      timestamp: new Date().toISOString()
    });

    res.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('=== ARAÇ YILLAR API HATASI ===', {
      requestId,
      duration: `${duration}ms`,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      basarili: false,
      hata: 'Yıl bilgileri alınırken hata oluştu',
      requestId
    });
  }
});

app.get('/api/arac/jenerasyonlar', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('=== ARAÇ JENERASYONLAR API İSTEĞİ ===', {
    requestId,
    endpoint: '/api/arac/jenerasyonlar',
    query: req.query,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  try {
    const response = await tryWheelSize(`/arac/jenerasyonlar`, { params: req.query });

    const duration = Date.now() - startTime;
    const responseData = response.data;

    logger.info('=== ARAÇ JENERASYONLAR API YANITI ===', {
      requestId,
      duration: `${duration}ms`,
      statusCode: response.status,
      dataLength: responseData.veri ? responseData.veri.length : 0,
      success: responseData.basarili,
      timestamp: new Date().toISOString()
    });

    res.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('=== ARAÇ JENERASYONLAR API HATASI ===', {
      requestId,
      duration: `${duration}ms`,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      basarili: false,
      hata: 'Jenerasyon bilgileri alınırken hata oluştu',
      requestId
    });
  }
});

app.get('/api/arac/modifikasyonlar', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('=== ARAÇ MODİFİKASYONLAR API İSTEĞİ ===', {
    requestId,
    endpoint: '/api/arac/modifikasyonlar',
    query: req.query,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  try {
    const params = { ...(req.query || {}) };
    // Bölgeyi varsayılan olarak eudm ile sınırla (çoğalmayı azaltır)
    if (!params.bolgeler && !params.bolge) params.bolgeler = 'eudm';
    const response = await tryWheelSize(`/arac/modifikasyonlar`, { params, timeout: 30000 });

    const duration = Date.now() - startTime;
    const responseData = response.data || {};

    // Gelen listeyi bölgeye göre filtrele ve olası tekrarları sadeleştir
    const rawList = Array.isArray(responseData.veri) ? responseData.veri : [];
    const onlyEudm = rawList.filter(m => {
      const regs = m?.regions || m?.bolgeler || [];
      return regs.length === 0 || regs.includes('eudm');
    });

    // Aynı jenerasyon + trim (veya name) tekrarlarını kaldır
    const seen = new Set();
    const deduped = [];
    for (const m of onlyEudm) {
      const gen = m?.generation?.slug || m?.generation || '';
      const key = `${gen}__${m?.trim || m?.name || m?.slug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(m);
    }

    // İstatistiksel log (neden birden fazla?)
    const regionBuckets = {};
    for (const m of rawList) {
      const regs = (m?.regions || []).length ? m.regions : ['(yok)'];
      regs.forEach(r => { regionBuckets[r] = (regionBuckets[r] || 0) + 1; });
    }

    const trimBuckets = {};
    for (const m of rawList) {
      const k = m?.trim || m?.name || '(yok)';
      trimBuckets[k] = (trimBuckets[k] || 0) + 1;
    }

    logger.info('=== ARAÇ MODİFİKASYONLAR API YANITI ===', {
      requestId,
      duration: `${duration}ms`,
      statusCode: response.status,
      dataLength: rawList.length,
      filteredToEudm: onlyEudm.length,
      dedupedCount: deduped.length,
      regionBuckets,
      topSamples: deduped.slice(0, 3).map(m => ({ slug: m.slug, name: m.name, trim: m.trim, regions: m.regions, engine: m.engine?.code })),
      success: responseData.basarili,
      sampleData: rawList.slice(0, 3),
      timestamp: new Date().toISOString()
    });

    res.json({ ...responseData, veri: deduped });
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('=== ARAÇ MODİFİKASYONLAR API HATASI ===', {
      requestId,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
      statusCode: error.response?.status,
      timestamp: new Date().toISOString()
    });

    // Wheel Size API'den gelen hata mesajını kullan
    const errorMessage = error.response?.data?.hata || error.response?.data?.mesaj || error.message;

    res.status(500).json({
      basarili: false,
      hata: errorMessage || 'Modifikasyon bilgileri alınırken hata oluştu',
      mesaj: errorMessage || 'Modifikasyon bilgileri alınırken hata oluştu',
      requestId
    });
  }
});

app.get('/api/arac/model-arama', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('=== ARAÇ MODEL ARAMA API İSTEĞİ ===', {
    requestId,
    endpoint: '/api/arac/model-arama',
    query: req.query,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  try {
    const params = { ...(req.query || {}) };
    params.bolgeler = 'eudm';
    const response = await tryWheelSize(`/arac/model-arama`, { params, timeout: 30000 });

    const duration = Date.now() - startTime;
    const responseData = response.data;

    // Wheels array'ini lastikler/jantlar ve ön-arka kombinasyonlarına dönüştür
    if (responseData.basarili && responseData.veri && Array.isArray(responseData.veri)) {
      responseData.veri.forEach(modifikasyon => {
        if (modifikasyon.wheels && Array.isArray(modifikasyon.wheels)) {
          // 1) Frontend'in beklediği lastik listesi (tek ebat listesi)
          modifikasyon.lastikler = modifikasyon.wheels.map(wheel => {
            return {
              // Frontend'in beklediği alanlar
              kesitGenisligi: wheel.front.tire_width,
              yanakOrani: wheel.front.tire_aspect_ratio,
              jantCapi: wheel.front.rim_diameter,
              marka: 'Çeşitli Markalar',
              model: wheel.front.tire,
              fiyat: Math.floor(Math.random() * 500) + 200,
              stok: wheel.is_stock,
              mevsim: wheel.is_recommended_for_winter ? 'kis' : 'yaz',
              yukEndeksi: wheel.front.load_index?.toString(),
              hizEndeksi: wheel.front.speed_index,

              // Ek bilgiler
              id: `${modifikasyon.slug}_${wheel.front.tire}`,
              ebat: wheel.front.tire,
              basincOn: wheel.front.tire_pressure?.bar,
              basincArka: wheel.rear?.tire_pressure?.bar || wheel.front.tire_pressure?.bar,
              kisLastigiUygun: wheel.is_recommended_for_winter,
              runFlat: wheel.is_runflat_tires,
              agirlik: wheel.front.tire_weight_kg,
              resim: null,
              aciklama: `${wheel.front.tire} ebadında lastik`
            };
          });

          // 2) Jant bilgilerini de ekle
          modifikasyon.jantlar = modifikasyon.wheels.map(wheel => {
            return {
              id: `${modifikasyon.slug}_jant_${wheel.front.rim}`,
              ebat: wheel.front.rim,
              genislik: wheel.front.rim_width,
              cap: wheel.front.rim_diameter,
              offset: wheel.front.rim_offset,
              pcd: modifikasyon.technical?.pcd,
              merkezDeligi: modifikasyon.technical?.centre_bore,
              cividaSayisi: modifikasyon.technical?.stud_holes,
              stok: wheel.is_stock,
              fiyat: Math.floor(Math.random() * 800) + 300, // Geçici fiyat
              marka: 'OEM',
              model: wheel.front.rim,
              resim: null,
              aciklama: `${wheel.front.rim} ebadında jant`
            };
          });

          // 3) Ön/Arka kombinasyonları
          modifikasyon.kombinasyonlar = modifikasyon.wheels.map((wheel, idx) => {
            const on = wheel.front ? {
              rim: wheel.front.rim,
              rim_diameter: wheel.front.rim_diameter,
              rim_width: wheel.front.rim_width,
              rim_offset: wheel.front.rim_offset,
              tire_full: wheel.front.tire_full || `${wheel.front.tire} ${wheel.front.load_index || ''}${wheel.front.speed_index || ''}`.trim(),
              tire: wheel.front.tire,
              load_index: wheel.front.load_index,
              speed_index: wheel.front.speed_index,
              pressure: wheel.front.tire_pressure || null,
              tire_width: wheel.front.tire_width,
              tire_aspect_ratio: wheel.front.tire_aspect_ratio,
              tire_diameter_mm: wheel.front.tire_diameter_mm,
              tire_weight_kg: wheel.front.tire_weight_kg
            } : null;

            const arka = wheel.rear ? {
              rim: wheel.rear.rim,
              rim_diameter: wheel.rear.rim_diameter,
              rim_width: wheel.rear.rim_width,
              rim_offset: wheel.rear.rim_offset,
              tire_full: wheel.rear.tire_full || `${wheel.rear.tire} ${wheel.rear.load_index || ''}${wheel.rear.speed_index || ''}`.trim(),
              tire: wheel.rear.tire,
              load_index: wheel.rear.load_index,
              speed_index: wheel.rear.speed_index,
              pressure: wheel.rear.tire_pressure || null,
              tire_width: wheel.rear.tire_width,
              tire_aspect_ratio: wheel.rear.tire_aspect_ratio,
              tire_diameter_mm: wheel.rear.tire_diameter_mm,
              tire_weight_kg: wheel.rear.tire_weight_kg
            } : null;

            return {
              sira: idx + 1,
              stokta: !!wheel.is_stock,
              kisUygun: !!wheel.is_recommended_for_winter,
              runflat: !!wheel.is_runflat_tires,
              on,
              arka
            };
          });

          // Örnek log
          logger.info('=== ARAÇ LASTİK KOMBİNASYONLARI ===', {
            requestId,
            modification: modifikasyon.slug || modifikasyon.name,
            count: modifikasyon.kombinasyonlar.length,
            sample: modifikasyon.kombinasyonlar.slice(0, 2)
          });
        }
      });
    }

    logger.info('=== ARAÇ MODEL ARAMA API YANITI ===', {
      requestId,
      duration: `${duration}ms`,
      statusCode: response.status,
      success: responseData.basarili,
      hasLastikler: responseData.veri?.[0]?.lastikler ? responseData.veri[0].lastikler.length : 0,
      hasJantlar: responseData.veri?.[0]?.jantlar ? responseData.veri[0].jantlar.length : 0,
      sampleLastikler: responseData.veri?.[0]?.lastikler ? responseData.veri[0].lastikler.slice(0, 3) : null,
      timestamp: new Date().toISOString()
    });

    res.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('=== ARAÇ MODEL ARAMA API HATASI ===', {
      requestId,
      duration: `${duration}ms`,
      error: error.message,
      stack: error.stack,
      response: error.response?.data,
      statusCode: error.response?.status,
      timestamp: new Date().toISOString()
    });

    // Wheel Size API'den gelen hata mesajını kullan
    const errorMessage = error.response?.data?.hata || error.response?.data?.mesaj || error.message;

    res.status(500).json({
      basarili: false,
      hata: errorMessage || 'Model arama sırasında hata oluştu',
      mesaj: errorMessage || 'Model arama sırasında hata oluştu',
      requestId
    });
  }
});

app.get('/api/arac/bolgeler', async (req, res) => {
  try {
    const response = await tryWheelSize(`/arac/bolgeler`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    logger.error('Wheel Size API - Bölgeler error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Bölge bilgileri alınırken hata oluştu'
    });
  }
});

// Jant API'leri
app.get('/api/jant/caplar', async (req, res) => {
  try {
    const response = await tryWheelSize(`/jant/caplar`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    logger.error('Wheel Size API - Jant çapları error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Jant çap bilgileri alınırken hata oluştu'
    });
  }
});

app.get('/api/jant/genislikler', async (req, res) => {
  try {
    const response = await tryWheelSize(`/jant/genislikler`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    logger.error('Wheel Size API - Jant genişlikleri error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Jant genişlik bilgileri alınırken hata oluştu'
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
  try {
    const response = await tryWheelSize(`/jant/vida-sablonlari`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    logger.error('Wheel Size API - Vida şablonları error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Vida şablon bilgileri alınırken hata oluştu'
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

// Frontend'in beklediği endpoint'ler
app.get('/api/lastik/kesit-genislikleri', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('=== LASTİK KESİT GENİŞLİKLERİ API İSTEĞİ ===', {
    requestId,
    endpoint: '/api/lastik/kesit-genislikleri',
    query: req.query,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  try {
    const params = { ...(req.query || {}) };
    params.regions = 'eudm';
    const response = await tryWheelSize(`/lastik/kesit-genislikleri`, { params });

    const duration = Date.now() - startTime;
    const responseData = response.data;

    logger.info('=== LASTİK KESİT GENİŞLİKLERİ API YANITI ===', {
      requestId,
      duration: `${duration}ms`,
      statusCode: response.status,
      success: responseData.basarili,
      dataLength: responseData.veri ? responseData.veri.length : 0,
      sampleData: responseData.veri ? responseData.veri.slice(0, 5) : null,
      timestamp: new Date().toISOString()
    });

    res.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('=== LASTİK KESİT GENİŞLİKLERİ API HATASI ===', {
      requestId,
      duration: `${duration}ms`,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      basarili: false,
      hata: 'Kesit genişlik bilgileri alınırken hata oluştu',
      requestId
    });
  }
});

app.get('/api/lastik/yanak-oranlari', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('=== LASTİK YANAK ORANLARI API İSTEĞİ ===', {
    requestId,
    endpoint: '/api/lastik/yanak-oranlari',
    query: req.query,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  try {
    const params = { ...(req.query || {}) };
    params.regions = 'eudm';
    const response = await tryWheelSize(`/lastik/yanak-oranlari`, { params });

    const duration = Date.now() - startTime;
    const responseData = response.data;

    logger.info('=== LASTİK YANAK ORANLARI API YANITI ===', {
      requestId,
      duration: `${duration}ms`,
      statusCode: response.status,
      success: responseData.basarili,
      dataLength: responseData.veri ? responseData.veri.length : 0,
      sampleData: responseData.veri ? responseData.veri.slice(0, 5) : null,
      timestamp: new Date().toISOString()
    });

    res.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('=== LASTİK YANAK ORANLARI API HATASI ===', {
      requestId,
      duration: `${duration}ms`,
      error: error.message,
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      basarili: false,
      hata: 'Yanak oranı bilgileri alınırken hata oluştu',
      requestId
    });
  }
});

app.get('/api/lastik/jant-caplari', async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  logger.info('=== LASTİK JANT ÇAPLARI API İSTEĞİ ===', {
    requestId,
    endpoint: '/api/lastik/jant-caplari',
    query: req.query,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  try {
    const params = { ...(req.query || {}) };
    params.regions = 'eudm';
    const response = await tryWheelSize(`/lastik/jant-caplari`, { params });

    const duration = Date.now() - startTime;
    const responseData = response.data;

    logger.info('=== LASTİK JANT ÇAPLARI API YANITI ===', {
      requestId,
      duration: `${duration}ms`,
      statusCode: response.status,
      success: responseData.basarili,
      dataLength: responseData.veri ? responseData.veri.length : 0,
      sampleData: responseData.veri ? responseData.veri.slice(0, 5) : null,
      timestamp: new Date().toISOString()
    });

    res.json(responseData);
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error('=== LASTİK JANT ÇAPLARI API HATASI ===', {
      requestId,
      duration: `${duration}ms`,
      error: error.message,
      timestamp: new Date().toISOString()
    });

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

/**
  * (PLUGIN) DİA Senkronize Routes *
*/
/* * Sadece Ürün Adı Güncelle * */
app.post('/api/dia-stock/sync-names', async (req, res) => {
  try {
    const result = await diaStockService.syncOnlyNames();
    res.json(result);
  } catch (error) {
    console.error('Sync names hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

/* * Sadece SKU Güncelle * */
app.post('/api/dia-stock/sync-codes', async (req, res) => {
  try {
    const result = await diaStockService.syncOnlyCodes();
    res.json(result);
  } catch (error) {
    console.error('Sync codes hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

/* * Sadece Fiyat Güncelle * */
app.post('/api/dia-stock/sync-prices', async (req, res) => {
  try {
    const result = await diaStockService.syncOnlyPrices();
    res.json(result);
  } catch (error) {
    console.error('Sync prices hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

/* * Sadece Görsel Güncelle * */
app.post('/api/dia-stock/sync-images', async (req, res) => {
  try {
    const result = await diaStockService.syncOnlyImages();
    res.json(result);
  } catch (error) {
    console.error('Sync images hatası:', error);
    res.status(500).json({ error: error.message });
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

// Cache istatistikleri API'si
app.get('/api/cache/stats', async (req, res) => {
  try {
    const stats = await activeCache.getStats();

    res.json({
      basarili: true,
      veri: {
        ...stats,
        type: 'redis',
        environment: process.env.NODE_ENV || 'development'
      },
      mesaj: 'Cache istatistikleri başarıyla alındı'
    });
  } catch (error) {
    logger.error('Cache stats error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Cache istatistikleri alınırken hata oluştu'
    });
  }
});

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

// Genel API'ler
app.get('/api/genel/bilgiler', async (req, res) => {
  try {
    const response = await tryWheelSize(`/genel/bilgiler`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    logger.error('Wheel Size API - Genel bilgiler error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'Genel bilgiler alınırken hata oluştu'
    });
  }
});

app.get('/api/genel/istatistikler', async (req, res) => {
  try {
    const response = await tryWheelSize(`/genel/istatistikler`, { params: req.query });
    res.json(response.data);
  } catch (error) {
    logger.error('Wheel Size API - İstatistikler error:', error);
    res.status(500).json({
      basarili: false,
      hata: 'İstatistik bilgileri alınırken hata oluştu'
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

// Startup'ta otomatik sync kontrolü - DEVRE DIŞI
// Artık sadece günlük cron job ile saat 05:00'da çalışır
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
