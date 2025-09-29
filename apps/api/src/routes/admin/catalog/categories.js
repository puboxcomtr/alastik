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
  body('seoUrl').optional().matches(/^[a-z0-9-]*$/).withMessage('SEO URL sadece küçük harf, sayı ve tire içermelidir'),
  body('webOrder').optional().isInt({ min: 0 }).withMessage('Sıralama 0 veya daha büyük olmalıdır')
], async (req, res) => {
  try {
    const { id } = req.params;
    const { description, seoTitle, seoUrl, webOrder } = req.body;

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (seoTitle !== undefined) updateData.seoTitle = seoTitle?.trim();
    if (seoUrl !== undefined) updateData.seoUrl = seoUrl?.trim().toLowerCase();
    if (webOrder !== undefined) updateData.webOrder = Number(webOrder) || 0;

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

module.exports = router;