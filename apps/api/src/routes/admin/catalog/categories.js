// routes/admin/catalog/categories.js
const express = require('express');

// Models
const DiaStock = require('../../../models/DiaStock');
const WebProduct = require('../../../models/WebProduct');
const WebCategory = require('../../../models/WebCategory');

// Middleware
const { authenticateAdmin } = require('../../../middleware/auth');
const { body, validationResult } = require('express-validator');

// @IMPORT Library
const DiaStockService = require('../../../services/DiaStockService');

// Config
const { MAIN_DIA_FILTERS } = require('../../../config/diaFilters');

const router = express.Router();

// Auth kontrolü - production'da zorunlu
const maybeAuth = process.env.NODE_ENV === 'production' ? authenticateAdmin : (req, res, next) => next();

/**
 * Kategori Listeleme - WebCategory Collection'dan
 * GET /api/categories
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

    console.log('🟢 CATEGORIES.JS ROUTE ÇALIŞTI - Listeleme');

    // WebCategory filtreleri
    const webFilter = {};

    // Sadece görünür kategoriler mi?
    if (visible_only === 'true') {
      webFilter.webVisible = true;
    }

    // Web durumu filtreleme
    if (web_status && web_status.trim() !== '') {
      if (web_status.trim() === 'active') {
        webFilter.webVisible = true;
        webFilter.productCount = { $gt: 0 };
      } else if (web_status.trim() === 'hidden') {
        webFilter.webVisible = false;
      } else if (web_status.trim() === 'empty') {
        webFilter.productCount = 0;
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

    console.log('Category Filter:', webFilter);

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
        seoTitle: 1,
        seoUrl: 1,
        customImage: 1,
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
      .sort({ level: 1, webOrder: 1, name: 1 });

    // Parent bilgilerini populate et
    if (with_children === 'true' || level !== '1') {
      query = query.populate('parent', 'name slug level');
    }

    const categories = await query.lean();

    console.log(`${categories.length} kategori bulundu`);

    // Response formatını product.js gibi ayarla
    const formattedCategories = categories.map(cat => {
      // Web durumu belirleme
      let webStatus = 'Inactive';
      if (cat.webVisible && cat.productCount > 0) {
        webStatus = 'Active';
      } else if (cat.webVisible && cat.productCount === 0) {
        webStatus = 'Empty';
      } else if (!cat.webVisible) {
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

        // Web yönetimi
        webVisible: cat.webVisible,
        webOrder: cat.webOrder,
        status: webStatus,

        // SEO
        seoTitle: cat.seoTitle || cat.name,
        seoUrl: cat.seoUrl || cat.slug,

        // Görsel
        image: cat.customImage?.url || '/images/kategori/default-category.jpg',

        // İstatistikler
        productCount: cat.productCount || 0,
        activeProductCount: cat.activeProductCount || 0,
        totalStock: cat.totalStock || 0,

        // Opsiyonel Alanlar
        description: cat.description || '',

        // Tarihler
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
        lastSync: cat.syncInfo?.lastSync,
        lastProductSync: cat.syncInfo?.lastProductSync,
        syncStatus: cat.syncInfo?.syncStatus || 'unknown'
      };
    });

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
 * Kategori Detay Görüntüleme
 * GET /api/categories/:id
 */
router.get('/:id', maybeAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    console.log('🟢 CATEGORY DETAIL - ID:', id);

    // ID veya slug ile kategori bul
    const category = await WebCategory.findOne({
      $or: [
        { _id: id },
        { slug: id }
      ]
    })
      .populate('parent', 'name slug level')
      .populate('parentPath', 'name slug level')
      .populate('showcase.productKey', 'diaData.aciklama customData.webPrice diaData.m_resimler customData.featuredImage')
      .lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori bulunamadı'
      });
    }

    // Alt kategorileri getir
    const subCategories = await WebCategory.find({
      parent: category._id,
      webVisible: true
    })
      .sort({ webOrder: 1, name: 1 })
      .select('name slug level productCount activeProductCount')
      .lean();

    // Showcase ürünlerini düzenle
    const showcaseProducts = (category.showcase || [])
      .filter(item => item.productKey)
      .map(item => ({
        ...item,
        product: item.productKey ? {
          name: item.productKey.diaData?.aciklama,
          price: item.productKey.customData?.webPrice,
          image: item.productKey.customData?.featuredImage ||
            (item.productKey.diaData?.m_resimler?.[0]?.aws_url)
        } : null
      }))
      .sort((a, b) => a.order - b.order);

    const responseData = {
      // Temel bilgiler
      id: category._id,
      name: category.name,
      slug: category.slug,
      level: category.level,

      // Hiyerarşi
      parent: category.parent,
      parentPath: category.parentPath || [],
      subCategories: subCategories,

      // DIA bağlantısı
      diaCategory: category.diaCategory,
      diaLevel: category.diaLevel,
      diaKey: category.diaKey,

      // Web yönetimi
      webVisible: category.webVisible,
      webOrder: category.webOrder,

      // SEO bilgileri
      seoTitle: category.seoTitle || category.name,
      seoDescription: category.seoDescription || '',
      seoUrl: category.seoUrl || category.slug,
      seoKeywords: category.seoKeywords || [],

      // Görsel ve içerik
      customImage: category.customImage || { url: '', alt: '', title: '' },
      detail: category.detail || '',

      // Showcase
      showcase: showcaseProducts,

      // İstatistikler
      productCount: category.productCount || 0,
      activeProductCount: category.activeProductCount || 0,
      totalStock: category.totalStock || 0,

      // Senkronizasyon
      syncInfo: category.syncInfo || {},

      // Tarihler
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Category detail get error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori detayı getirilirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Kategori İstatistikleri
 * GET /api/categories/stats
 */
router.get('/stats/overview', maybeAuth, async (req, res) => {
  try {
    console.log('📊 CATEGORY STATS İSTEĞİ');

    const stats = await WebCategory.aggregate([
      {
        $group: {
          _id: null,
          totalCategories: { $sum: 1 },
          visibleCategories: {
            $sum: { $cond: ['$webVisible', 1, 0] }
          },
          mainCategories: {
            $sum: { $cond: [{ $eq: ['$level', 1] }, 1, 0] }
          },
          subCategories: {
            $sum: { $cond: [{ $eq: ['$level', 2] }, 1, 0] }
          },
          subSubCategories: {
            $sum: { $cond: [{ $eq: ['$level', 3] }, 1, 0] }
          },
          totalProducts: { $sum: '$productCount' },
          totalActiveProducts: { $sum: '$activeProductCount' },
          totalStock: { $sum: '$totalStock' },
          categoriesWithProducts: {
            $sum: { $cond: [{ $gt: ['$productCount', 0] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalCategories: 0,
      visibleCategories: 0,
      mainCategories: 0,
      subCategories: 0,
      subSubCategories: 0,
      totalProducts: 0,
      totalActiveProducts: 0,
      totalStock: 0,
      categoriesWithProducts: 0
    };

    // Son senkronizasyon tarihi
    const lastSync = await WebCategory.findOne({}, { 'syncInfo.lastSync': 1 })
      .sort({ 'syncInfo.lastSync': -1 });

    res.json({
      success: true,
      data: {
        ...result,
        lastSync: lastSync?.syncInfo?.lastSync,
        syncRequired: result.totalCategories === 0
      }
    });

  } catch (error) {
    console.error('Category stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori istatistikleri alınamadı',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;