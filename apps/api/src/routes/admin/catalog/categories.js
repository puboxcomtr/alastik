
// ============================================
// DEPENDENCIES
// ============================================
const express = require('express');

// ============================================
// MODELS
// ============================================
// DIA ERP stock model (raw data from ERP system)
const DiaStock = require('../../../models/plugins/DiaStock');

// Web product model (for category statistics)
const WebProduct = require('../../../models/web/catalog/WebProduct');

// Web category model (synced and enhanced version for frontend)
const WebCategory = require('../../../models/web/catalog/WebCategory');

// ============================================
// MIDDLEWARE
// ============================================
// Authentication middleware for admin routes
const { authenticateAdmin } = require('../../../middleware/auth');

// Request validation middleware
const { body, validationResult } = require('express-validator');

// ============================================
// SERVICES
// ============================================
// DIA ERP integration service
const DiaStockService = require('../../../services/plugins/dia/DiaStockService');

// ============================================
// CONFIGURATION
// ============================================
// DIA filter configurations
const { MAIN_DIA_FILTERS } = require('../../../config/diaFilters');

// ============================================
// ROUTER INITIALIZATION
// ============================================
const router = express.Router();

// ============================================
// AUTHENTICATION STRATEGY
// ============================================
// Conditional authentication based on environment
// - Development (DISABLE_AUTH=true): Bypasses authentication for easier testing
// - Production (DISABLE_AUTH=false): Enforces admin authentication
const maybeAuth = process.env.DISABLE_AUTH === 'true'
  ? (req, res, next) => next()
  : authenticateAdmin;

// ============================================
// ROUTES
// ============================================
/**
 * GET /api/categories/sliders
 * Slider listesini getir (kategori düzenleme için)
 */
router.get('/sliders/list', maybeAuth, async (req, res) => {
  try {
    const Slider = require('../../../models/admin/design/Slider');

    const sliders = await Slider.find({ 'settings.isActive': true, site: req.site })
      .select('_id name key')
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: sliders
    });
  } catch (error) {
    console.error('Slider list error:', error);
    res.status(500).json({
      success: false,
      message: 'Slider listesi alınamadı'
    });
  }
});
/**
 * GET /api/categories
 * Get all categories with filtering and statistics
 * 
 * Query Parameters:
 * - search: Search term for category name
 * - level: Category level (1: Main, 2: Sub, 3: Sub-Sub)
 * - web_status: Filter by status (active/hidden/empty)
 * - parent_id: Filter by parent category
 * - visible_only: Show only visible categories (default: true)
 * - with_children: Include child categories (default: false)
 */
router.get('/', maybeAuth, async (req, res) => {
  try {
    const {
      search,
      level,
      web_status,
      parent_id,
      visible_only = 'true',
      with_children = 'false'
    } = req.query;

    // WebCategory filtreleri (görünürlük/sıralama/ürün sayısı seçili siteye göre)
    const siteVisibleField = `siteSettings.${req.site}.webVisible`;
    const siteOrderField = `siteSettings.${req.site}.webOrder`;
    const siteCountField = `siteSettings.${req.site}.productCount`;
    const webFilter = {};

    // Sadece görünür kategoriler mi? (seçili sitede yayınlanmış ürünü olmayan kategori listelenmez;
    // görmek için "Boş" durum filtresi kullanılır)
    if (visible_only === 'true') {
      webFilter[siteVisibleField] = true;
      webFilter[siteCountField] = { $gt: 0 };
    }

    // Web durumu filtreleme
    if (web_status && web_status.trim() !== '') {
      if (web_status.trim() === 'active') {
        webFilter[siteVisibleField] = true;
        webFilter[siteCountField] = { $gt: 0 };
      } else if (web_status.trim() === 'hidden') {
        webFilter[siteVisibleField] = false;
      } else if (web_status.trim() === 'empty') {
        webFilter[siteCountField] = 0;
      }
    }

    // Level filtreleme (1: Ana, 2: Alt, 3: Alt-Alt)
    if (level && !isNaN(level)) {
      webFilter.level = parseInt(level);
    }

    // Üst kategori filtreleme
    if (parent_id && parent_id !== '') {
      if (parent_id === 'null' || parent_id === 'main') {
        webFilter.parent = null; // Ana kategoriler
      } else {
        webFilter.parent = parent_id;
      }
    }

    // Arama - text search
    if (search && search.trim() !== '') {
      webFilter.$text = { $search: String(search.trim()) };
    }


    // WebCategory'leri getir
    let query = WebCategory.find(webFilter)
      .select({
        name: 1,
        slug: 1,
        level: 1,
        parent: 1,
        diaCategory: 1,
        diaLevel: 1,
        webVisible: 1,
        webOrder: 1,
        siteSettings: 1,
        siteContent: 1,
        seoTitle: 1,
        seoDescription: 1,
        seoUrl: 1,
        sliderId: 1,
        productCount: 1,
        activeProductCount: 1,
        totalStock: 1,
        'syncInfo.lastSync': 1,
        'syncInfo.syncStatus': 1,
        'syncInfo.lastProductSync': 1,
        createdAt: 1,
        updatedAt: 1,
        description: 1,
        customImage: 1
      })
      .sort({ level: 1, [siteOrderField]: 1, name: 1 });

    // Parent bilgilerini populate et
    if (with_children === 'true' || level !== '1') {
      query = query.populate('parent', 'name slug level');
    }

    const categories = await query.lean();

    // Response formatını product.js gibi ayarla
    const formattedCategories = categories.map(cat => {
      // Seçili sitenin görünürlük/sıralama/ürün sayısı (eski ortak alanlar yedek)
      const siteSet = cat.siteSettings?.[req.site] || {};
      const siteVisible = siteSet.webVisible !== undefined ? siteSet.webVisible : cat.webVisible;
      const siteOrder = siteSet.webOrder !== undefined ? siteSet.webOrder : (cat.webOrder || 0);
      const siteProductCount = siteSet.productCount !== undefined ? siteSet.productCount : (cat.productCount || 0);

      // Web durumu belirleme
      let webStatus = 'Inactive';
      if (siteVisible && siteProductCount > 0) {
        webStatus = 'Active';
      } else if (siteVisible && siteProductCount === 0) {
        webStatus = 'Empty';
      } else if (!siteVisible) {
        webStatus = 'Hidden';
      }

      // Level görüntü adları
      const levelNames = {
        1: 'Ana Kategori',
        2: 'Alt Kategori',
        3: 'Alt-Alt Kategori'
      };

      // Parent path oluştur
      let parentPath = '';
      if (cat.parent && cat.parent.name) {
        parentPath = cat.parent.name;
        if (cat.parent.parent) {
          parentPath = `${cat.parent.parent.name} > ${parentPath}`;
        }
      }

      return {
        id: cat._id,
        name: cat.name,
        slug: cat.slug,
        level: cat.level,
        levelName: levelNames[cat.level] || 'Bilinmeyen',

        // Hiyerarşi
        parent: cat.parent || null,
        parentName: cat.parent?.name || '',
        parentPath: parentPath,

        // DIA bağlantısı
        diaCategory: cat.diaCategory,
        diaLevel: cat.diaLevel,

        // Web yönetimi (seçili site)
        webVisible: siteVisible,
        webOrder: siteOrder,
        status: webStatus,

        // SEO (seçili site öncelikli)
        seoTitle: cat.siteContent?.[req.site]?.seoTitle || cat.seoTitle || cat.name,
        seoDescription: cat.siteContent?.[req.site]?.seoDescription || cat.seoDescription || '',
        seoUrl: cat.seoUrl || cat.slug,

        // Slider (seçili site öncelikli)
        sliderId: (cat.siteContent?.[req.site]?.sliderId !== undefined
          ? cat.siteContent[req.site].sliderId
          : cat.sliderId) || null,
        menuIds: (() => {
          const c = cat.siteContent?.[req.site] || {};
          return c.menuIds && c.menuIds.length ? c.menuIds : (c.menuId ? [c.menuId] : []);
        })(),

        // Fiyat gösterimi (KDV dahil / hariç)
        priceDisplay: cat.siteContent?.[req.site]?.priceDisplay || 'dahil',
        vatRate: cat.siteContent?.[req.site]?.vatRate ?? 20,
        hideStockCode: cat.siteContent?.[req.site]?.hideStockCode === true,

        // İstatistikler (ürün sayısı seçili sitenin yayınlanmış ürünleri)
        productCount: siteProductCount,
        totalDiaProductCount: cat.productCount || 0,
        activeProductCount: cat.activeProductCount || 0,
        totalStock: cat.totalStock || 0,

        // Opsiyonel Alanlar (seçili site öncelikli)
        description: cat.siteContent?.[req.site]?.description ?? (cat.description || ''),

        // Tarihler
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
        lastSync: cat.syncInfo?.lastSync,
        lastProductSync: cat.syncInfo?.lastProductSync,
        syncStatus: cat.syncInfo?.syncStatus || 'unknown'
      };
    });
    const formattedKarPaleti = formattedCategories.find(c => c.name === 'Kar Paleti ve Zinciri');

    res.json({
      success: true,
      data: formattedCategories,
      total: formattedCategories.length,
      meta: {
        mainCategories: formattedCategories.filter(c => c.level === 1).length,
        subCategories: formattedCategories.filter(c => c.level === 2).length,
        subSubCategories: formattedCategories.filter(c => c.level === 3).length,
        visibleCategories: formattedCategories.filter(c => c.webVisible).length,
        activeCategories: formattedCategories.filter(c => c.status === 'Active').length
      }
    });

  } catch (error) {
    console.error('Categories get error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriler getirilirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Kategori Detay Güncelleme - WebProduct Kullanarak
 */
router.patch('/:id', maybeAuth, [
  body('description').optional().isLength({ max: 500 }).withMessage('Açıklama en fazla 500 karakter olabilir'),
  body('seoTitle').optional().isLength({ max: 100 }).withMessage('SEO başlığı en fazla 100 karakter olabilir'),
  body('seoDescription').optional().isLength({ max: 160 }).withMessage('SEO açıklaması en fazla 160 karakter olabilir'),
  body('seoUrl').optional().matches(/^[a-z0-9-]*$/).withMessage('SEO URL sadece küçük harf, sayı ve tire içermelidir'),
  body('webOrder').optional().isInt({ min: 0 }).withMessage('Sıralama 0 veya daha büyük olmalıdır'),
  body('webVisible').optional().isBoolean().withMessage('Görünürlük true veya false olmalıdır'),
  body('sliderId').optional(),
  body('menuId').optional(),
  body('menuIds').optional().isArray().withMessage('Menü listesi dizi olmalıdır'),
  body('priceDisplay').optional().isIn(['dahil', 'haric']).withMessage('Fiyat gösterimi dahil veya haric olmalıdır'),
  body('vatRate').optional().isFloat({ min: 0, max: 100 }).withMessage('KDV oranı 0-100 arasında olmalıdır'),
  body('hideStockCode').optional().isBoolean().withMessage('Stok kodu gizleme boolean olmalıdır')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { description, seoTitle, seoDescription, content, seoUrl, webOrder, webVisible, sliderId, menuId, menuIds, priceDisplay, vatRate, hideStockCode } = req.body;
    const updateData = {};
    if (description !== undefined) updateData[`siteContent.${req.site}.description`] = description;
    if (seoTitle !== undefined) updateData[`siteContent.${req.site}.seoTitle`] = seoTitle?.trim();
    if (seoDescription !== undefined) updateData[`siteContent.${req.site}.seoDescription`] = seoDescription?.trim();
    if (content !== undefined) updateData[`siteContent.${req.site}.content`] = content;
    if (seoUrl !== undefined) updateData.seoUrl = seoUrl?.trim().toLowerCase();
    if (webOrder !== undefined) updateData[`siteSettings.${req.site}.webOrder`] = Number(webOrder) || 0;
    if (webVisible !== undefined) updateData[`siteSettings.${req.site}.webVisible`] = webVisible === true || webVisible === 'true';
    if (sliderId !== undefined) updateData[`siteContent.${req.site}.sliderId`] = sliderId || null;
    // Kategori sayfasında gösterilecek menüler (boş bırakılabilir, birden fazla olabilir)
    if (menuIds !== undefined) {
      updateData[`siteContent.${req.site}.menuIds`] = Array.isArray(menuIds) ? menuIds.filter(Boolean) : [];
      // Eski tek alan artık kullanılmıyor; çakışmaması için temizlenir
      updateData[`siteContent.${req.site}.menuId`] = null;
    } else if (menuId !== undefined) {
      updateData[`siteContent.${req.site}.menuId`] = menuId || null;
    }
    if (priceDisplay !== undefined) updateData[`siteContent.${req.site}.priceDisplay`] = priceDisplay === 'haric' ? 'haric' : 'dahil';
    if (vatRate !== undefined) updateData[`siteContent.${req.site}.vatRate`] = Number(vatRate) || 20;
    if (hideStockCode !== undefined) updateData[`siteContent.${req.site}.hideStockCode`] = hideStockCode === true || hideStockCode === 'true';
    updateData.updatedAt = new Date();

    const updatedCategory = await WebCategory.findByIdAndUpdate(
      id,
      { $set: updateData },
      {
        new: true,
        strict: false
      }
    );

    res.json({
      success: true,
      data: updatedCategory,
      message: 'Kategori başarıyla güncellendi'
    });

  } catch (error) {
    console.error('Hata:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori güncellenirken hata oluştu'
    });
  }
});
router.get('/:id', maybeAuth, async (req, res) => {
  try {
    const cat = await WebCategory.findById(req.params.id).lean();
    if (!cat) {
      return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
    }
    const sc = (cat.siteContent && cat.siteContent[req.site]) || {};
    const siteSet = (cat.siteSettings && cat.siteSettings[req.site]) || {};
    res.json({
      success: true,
      data: {
        id: cat._id,
        name: cat.name,
        description: sc.description ?? (cat.description || ''),
        seoUrl: cat.seoUrl || '',
        webOrder: siteSet.webOrder !== undefined ? siteSet.webOrder : (cat.webOrder || 0),
        webVisible: siteSet.webVisible !== undefined ? siteSet.webVisible : (cat.webVisible !== false),
        sliderId: (sc.sliderId !== undefined ? sc.sliderId : cat.sliderId) || null,
        menuIds: (sc.menuIds && sc.menuIds.length ? sc.menuIds : (sc.menuId ? [sc.menuId] : [])),
        content: sc.content || '',
        seoTitle: sc.seoTitle || '',
        seoDescription: sc.seoDescription || ''
      }
    });
  } catch (error) {
    console.error('Kategori detay hatası:', error);
    res.status(500).json({ success: false, message: 'Kategori getirilemedi' });
  }
});

module.exports = router;