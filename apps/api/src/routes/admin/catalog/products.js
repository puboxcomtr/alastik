const express = require('express');

const Product = require('../../../models/admin/catalog/Product');

const DiaStock = require('../../../models/plugins/DiaStock');

const WebProduct = require('../../../models/web/catalog/WebProduct');

const WebCategory = require('../../../models/web/catalog/WebCategory');

const { authenticateAdmin } = require('../../../middleware/auth');

const { body, validationResult } = require('express-validator');

const DiaStockService = require('../../../services/plugins/dia/DiaStockService');

const { getProductListFilters, getSiteVisibilityFilter, getSyncRules } = require('../../../config/diaFilters');

function extractYoutubeId(rawUrl) {
  const url = String(rawUrl || '').trim();

  if (!url) return null;

  const patterns = [
    /(?:youtube\.com|youtube-nocookie\.com)\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/,
    /youtu\.be\/([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com|youtube-nocookie\.com)\/shorts\/([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com|youtube-nocookie\.com)\/embed\/([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com|youtube-nocookie\.com)\/live\/([A-Za-z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);

    if (match) return match[1];
  }

  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;

  return null;
}

const router = express.Router();

const maybeAuth = process.env.DISABLE_AUTH === 'true'
  ? (req, res, next) => next()
  : authenticateAdmin;

router.get('/', maybeAuth, async (req, res) => {
  try {
    const {
      search, sku, web_status, main_category, sub_category, brand,
      page = 1,
      limit = 100
    } = req.query;
    const webFilter = getProductListFilters(req.site);

    if (sku && sku.trim() !== '') {
      webFilter['diaData.stokkartkodu'] = sku.trim();
    }
    else if (search) {
      const searchTerm = String(search).trim();
      const keywords = searchTerm.split(/\s+/).filter(k => k.length > 0);
      const searchConditions = keywords.map(keyword => ({
        $or: [
          { 'diaData.aciklama': { $regex: keyword, $options: 'i' } },
          { 'diaData.stokkartkodu': { $regex: keyword, $options: 'i' } },
          { 'diaData.marka': { $regex: keyword, $options: 'i' } },
          { 'customData.seoTitle': { $regex: keyword, $options: 'i' } }
        ]
      }));
      webFilter.$and = searchConditions;
    }

    if (web_status && web_status.trim() !== '') {
      const siteVisibleField = `customData.siteData.${req.site}.webVisible`;
      if (web_status.trim() === 'Published') {
        webFilter['syncInfo.webStatus'] = 'active';
        webFilter.$and = [...(webFilter.$and || []), getSiteVisibilityFilter(req.site)];
      } else if (web_status.trim() === 'Draft') {
        webFilter['syncInfo.webStatus'] = 'draft';
      } else if (web_status.trim() === 'Hidden') {
        webFilter.$and = [...(webFilter.$and || []), {
          $or: [
            { [siteVisibleField]: false },
            { [siteVisibleField]: { $exists: false }, 'customData.webVisible': false }
          ]
        }];
      }
    }

    if (main_category) {
      webFilter['diaData.m_kategoriler.kategori_aciklama_1'] = main_category;
    }
    if (sub_category) {
      webFilter['diaData.m_kategoriler.kategori_aciklama_2'] = sub_category;
    }

    if (brand && brand !== '') {
      webFilter['diaData.marka'] = brand;
    }
    if (req.query.product_type && req.query.product_type !== '') {
      webFilter['diaData.ozelkod7kodu'] = req.query.product_type;
    }
    if (req.query.season && req.query.season !== '') {
      webFilter['diaData.ozelkod1kodu'] = req.query.season;
    }
    if (req.query.size && req.query.size !== '') {
      webFilter['diaData.ozelkod3kodu'] = req.query.size;
    }
    if (req.query.size && req.query.size !== '') {
      webFilter['diaData.ozelkod3kodu'] = req.query.size;
    }
    if (req.query.width && req.query.width !== '') {
      if (!webFilter.$and) webFilter.$and = [];
      webFilter.$and.push({
        'diaData.m_urunOzellikleri': {
          $elemMatch: { ozellikadi: 'Genişlik', detayaciklama: req.query.width }
        }
      });
    }
    if (req.query.profile && req.query.profile !== '') {
      if (!webFilter.$and) webFilter.$and = [];
      webFilter.$and.push({
        'diaData.m_urunOzellikleri': {
          $elemMatch: { ozellikadi: 'Yanak', detayaciklama: req.query.profile }
        }
      });
    }
    if (req.query.rim && req.query.rim !== '') {
      if (!webFilter.$and) webFilter.$and = [];
      webFilter.$and.push({
        'diaData.m_urunOzellikleri': {
          $elemMatch: {
            ozellikadi: 'Jant Çapı',
            detayaciklama: { $regex: new RegExp(`^R?${req.query.rim}C?$`, 'i') }
          }
        }
      });
    }
    if (req.query.stock_status === 'in_stock') {
      webFilter['diaData.gercek_stok'] = { $gt: 0 };
    } else if (req.query.stock_status === 'out_of_stock') {
      webFilter['diaData.gercek_stok'] = { $lte: 0 };
    }

    ['1', '2', '3', '4', '5', '6', '7'].forEach(num => {
      const param = req.query[`ozelkod${num}`];
      if (param && String(param).trim() !== '') {
        webFilter[`diaData.ozelkod${num}kodu`] = String(param).trim();
      }
    });
    const ensureAnd = () => {
      if (!webFilter.$and) webFilter.$and = [];
      return webFilter.$and;
    };

    if (req.query.has_image === 'yes') {
      ensureAnd().push({
        $or: [
          { 'diaData.m_resimler.0': { $exists: true } },
          { 'customData.customImages.0': { $exists: true } },
          { 'customData.featuredImage': { $type: 'string', $ne: '' } }
        ]
      });
    } else if (req.query.has_image === 'no') {
      ensureAnd().push({
        $and: [
          { $or: [{ 'diaData.m_resimler': { $exists: false } }, { 'diaData.m_resimler': { $size: 0 } }] },
          { $or: [{ 'customData.customImages': { $exists: false } }, { 'customData.customImages': { $size: 0 } }] },
          { $or: [{ 'customData.featuredImage': { $exists: false } }, { 'customData.featuredImage': null }, { 'customData.featuredImage': '' }] }
        ]
      });
    }

    if (req.query.has_description === 'yes' || req.query.has_description === 'no') {
      const siteDescField = `customData.siteDescriptions.${req.site}`;
      const legacyDescField = 'customData.customDescription';
      const filled = (field) => ({ [field]: { $exists: true, $nin: [null, ''] } });
      const empty = (field) => ({
        $or: [
          { [field]: { $exists: false } },
          { [field]: null },
          { [field]: '' }
        ]
      });

      if (req.query.has_description === 'yes') {
        ensureAnd().push({ $or: [filled(siteDescField), filled(legacyDescField)] });
      } else {
        ensureAnd().push({ $and: [empty(siteDescField), empty(legacyDescField)] });
      }
    }

    if (req.query.has_price === 'yes') {
      ensureAnd().push({
        $or: [
          { 'diaData.m_birimler.0.fiyat1': { $gt: 0 } },
          { 'diaData.m_birimler.0.fiyat4': { $gt: 0 } }
        ]
      });
    } else if (req.query.has_price === 'no') {
      ensureAnd().push({
        $and: [
          { $or: [{ 'diaData.m_birimler.0.fiyat1': { $exists: false } }, { 'diaData.m_birimler.0.fiyat1': { $in: [null, 0] } }] },
          { $or: [{ 'diaData.m_birimler.0.fiyat4': { $exists: false } }, { 'diaData.m_birimler.0.fiyat4': { $in: [null, 0] } }] }
        ]
      });
    }

    const ozelkodList = ['1', '2', '3', '4', '6', '7'];
    ozelkodList.forEach(num => {
      const param = req.query[`has_ozelkod${num}`];
      const field = `diaData.ozelkod${num}kodu`;
      if (param === 'yes') {
        ensureAnd().push({ [field]: { $exists: true, $nin: [null, ''] } });
      } else if (param === 'no') {
        ensureAnd().push({
          $or: [
            { [field]: { $exists: false } },
            { [field]: null },
            { [field]: '' }
          ]
        });
      }
    });

    const aktifOzelkod = getSyncRules().ozelkod11Kodu || 'E';
    if (req.query.has_ozelkod11 === 'yes') {
      webFilter['diaData.ozelkod11kodu'] = aktifOzelkod;
    } else if (req.query.has_ozelkod11 === 'no') {
      ensureAnd().push({
        $or: [
          { 'diaData.ozelkod11kodu': { $exists: false } },
          { 'diaData.ozelkod11kodu': { $nin: [aktifOzelkod] } }
        ]
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = await WebProduct.countDocuments(webFilter);
    const products = await WebProduct.find(webFilter)
      .select({
        _key: 1,
        'diaData.aciklama': 1,
        'diaData.marka': 1,
        'diaData.stokkartkodu': 1,
        'diaData.gercek_stok': 1,
        'diaData.durum': 1,
        'diaData.menseiulkeadi': 1,
        'diaData.m_urunOzellikleri': 1,
        'diaData.m_birimler': 1,
        'diaData.m_resimler': 1,
        'diaData.m_kategoriler': 1,
        'customData.seoTitle': 1,
        'customData.seoUrl': 1,
        'customData.webPrice': 1,
        'customData.webVisible': 1,
        'customData.siteData': 1,
        'customData.featuredImage': 1,
        'customData.customImages': 1,
        'syncInfo.webStatus': 1,
        'syncInfo.lastDiaSync': 1,
        'syncInfo.syncSource': 1,
        'syncInfo.xmlSource': 1,
        createdAt: 1,
        updatedAt: 1
      })
      .sort({ 'syncInfo.syncSource': 1, updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      success: true,
      data: products.map(p => {
        const diaData = p.diaData || {};
        const customData = p.customData || {};
        const syncInfo = p.syncInfo || {};
        let images = [];

        if (customData.customImages && customData.customImages.length > 0) {
          images = customData.customImages
            .sort((a, b) => a.order - b.order)
            .map(img => ({ aws_url: img.url }))
            .slice(0, 3);
        }
        else if (diaData.m_resimler && diaData.m_resimler.length > 0) {
          images = diaData.m_resimler
            .sort((a, b) => parseInt(a.order_id || 0) - parseInt(b.order_id || 0))
            .slice(0, 3);
        }

        const featuredImage = customData.featuredImage ||
          (images[0] && images[0].aws_url) ||
          '/images/urun/gorsel-bulunamadi.jpg';

        const pricing = diaData.m_birimler && diaData.m_birimler[0] ? diaData.m_birimler[0] : {};
        const displayPrice = customData.webPrice ||
          pricing.fiyat1 ||
          diaData.fiyat1 ||
          diaData.sontuketicifiyati ||
          0;

        const properties = (diaData.m_urunOzellikleri || [])
          .filter(prop => prop.ozellikadi && prop.detayaciklama)
          .sort((a, b) => parseInt(a.ozellisirano || 0) - parseInt(b.ozellisirano || 0))
          .reduce((acc, prop) => {
            acc[prop.ozellikadi] = prop.detayaciklama;
            return acc;
          }, {});

        const effVisible = customData.siteData?.[req.site]?.webVisible ?? customData.webVisible;

        let webStatus = 'Inactive';
        if (syncInfo.webStatus === 'active' && effVisible) {
          webStatus = 'Published';
        } else if (syncInfo.webStatus === 'draft') {
          webStatus = 'Draft';
        } else if (!effVisible) {
          webStatus = 'Hidden';
        }

        return {
          id: p._key,
          name: diaData.aciklama || customData.seoTitle || diaData.stokkartkodu,
          price: displayPrice,
          brand: diaData.marka || '',
          sku: diaData.stokkartkodu,
          qty: diaData.gercek_stok || 0,
          status: webStatus,

          image: featuredImage,
          image2: images[1]?.aws_url || null,
          image3: images[2]?.aws_url || null,

          category: (diaData.m_kategoriler && diaData.m_kategoriler[0] &&
            diaData.m_kategoriler[0].kategori_aciklama_1) || 'Genel',
          categorySeoUrl: customData.webCategory || null,
          m_kategoriler: diaData.m_kategoriler,

          kdv: pricing.kdvsatis || diaData.kdvsatis || 20,
          originCountry: diaData.menseiulkeadi || '',

          price1: pricing.fiyat1 || 0,
          price2: pricing.fiyat2 || 0,
          price3: pricing.fiyat3 || 0,
          price4: pricing.fiyat4 || 0,
          price10: pricing.fiyat10 || 0,

          seoUrl: customData.seoUrl || null,
          webPrice: customData.webPrice || null,
          webVisible: effVisible !== undefined ? effVisible : true,

          properties: properties,

          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          lastDiaSync: syncInfo.lastDiaSync,
          syncSource: syncInfo.syncSource || 'dia_api',
          xmlSource: syncInfo.xmlSource || diaData.ekalan9 || null
        };
      }),
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('WebProducts get error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürünler getirilirken hata oluştu'
    });
  }
});
router.post('/images/reorder-labels', authenticateAdmin, async (req, res) => {
  try {
    const { reorderLabelImagesForAllProducts } = require('../../../utils/productImages');
    const result = await reorderLabelImagesForAllProducts(WebProduct);
    res.json({
      success: true,
      data: result,
      message: `${result.updated} üründe görsel sıralaması güncellendi (${result.scanned} ürün tarandı)`
    });
  } catch (error) {
    console.error('Reorder label images error:', error);
    res.status(500).json({ success: false, message: 'Görsel sıralaması oluşturulamadı' });
  }
});

router.get('/:id', maybeAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const webProduct = await WebProduct.findOne({ _key: id, sites: req.site })
      .select({
        _key: 1,
        'diaData.aciklama': 1,
        'diaData.stokkartkodu': 1,
        'diaData.barkodu': 1,
        'diaData.anabarkod': 1,
        'diaData.marka': 1,
        'diaData.gercek_stok': 1,
        'diaData.durum': 1,
        'diaData.menseiulkeadi': 1,
        'diaData.m_birimler': 1,
        'diaData.m_kategoriler': 1,
        'diaData.m_resimler': 1,
        'diaData.m_urunOzellikleri': 1,
        'diaData.ekalan1': 1,
        'diaData.ekalan2': 1,
        'diaData.ekalan3': 1,
        'diaData.ekalan4': 1,
        'diaData.ekalan5': 1,
        'customData': 1,
        'syncInfo.webStatus': 1,
        'syncInfo.diaStatus': 1,
        'syncInfo.lastDiaSync': 1,
        createdAt: 1,
        updatedAt: 1
      })
      .lean();
    if (!webProduct) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    const { diaData = {}, customData = {}, syncInfo = {} } = webProduct;

    const siteData = customData.siteData?.[req.site] || {};
    if (siteData.seoTitle !== undefined) customData.seoTitle = siteData.seoTitle;
    if (siteData.seoDescription !== undefined) customData.seoDescription = siteData.seoDescription;
    if (siteData.shortDescription !== undefined) customData.shortDescription = siteData.shortDescription;
    if (siteData.webVisible !== undefined) customData.webVisible = siteData.webVisible;
    if (siteData.webOrder !== undefined) customData.webOrder = siteData.webOrder;
    const siteDescription = customData.siteDescriptions?.[req.site];
    if (siteDescription) customData.customDescription = siteDescription;

    let images = [];

    if (customData.customImages && customData.customImages.length > 0) {
      images = customData.customImages
        .sort((a, b) => a.order - b.order)
        .map(img => img.url)
        .filter(Boolean);
    } else if (diaData.m_resimler && diaData.m_resimler.length > 0) {
      images = diaData.m_resimler
        .sort((a, b) => parseInt(a.order_id || 0) - parseInt(b.order_id || 0))
        .map(img => img.aws_url)
        .filter(Boolean);
    }

    const featuredImage = customData.featuredImage ||
      images[0] ||
      '/images/urun/gorsel-bulunamadi.jpg';

    const properties = (diaData.m_urunOzellikleri || [])
      .filter(prop => prop.ozellikadi && prop.detayaciklama)
      .sort((a, b) => parseInt(a.ozellisirano || 0) - parseInt(b.ozellisirano || 0))
      .reduce((acc, prop) => {
        acc[prop.ozellikadi] = prop.detayaciklama;
        return acc;
      }, {});
    const pricing = diaData.m_birimler && diaData.m_birimler[0] ? diaData.m_birimler[0] : {};
    const displayPrice = customData.webPrice ||
      pricing.fiyat1 ||
      0;
    const mainCategory = (diaData.m_kategoriler && diaData.m_kategoriler[0] &&
      diaData.m_kategoriler[0].kategori_aciklama_1) || 'Genel';
    let webStatus = 'Pasif';
    if (syncInfo.webStatus === 'active' && customData.webVisible) {
      webStatus = 'Yayında';
    } else if (syncInfo.webStatus === 'draft') {
      webStatus = 'Taslak';
    } else if (!customData.webVisible) {
      webStatus = 'Gizli';
    }
    const mapped = {
      id: webProduct._key,
      name: diaData.aciklama || diaData.aciklama || customData.seoTitle || 'Ürün',
      sku: diaData.stokkartkodu || '',
      barcode: diaData.barkodu || diaData.anabarkod || '',
      brand: diaData.marka || '',

      category: customData.webCategory || mainCategory,
      categorySeoUrl: customData.webCategory || null,
      subcategory: customData.webSubCategory || null,

      stock: (diaData.gercek_stok || 0) > 0,
      qty: diaData.gercek_stok || 0,
      status: diaData.durum === 'A' ? 'Aktif' : 'Pasif',
      webStatus: webStatus,

      price: displayPrice,
      webPrice: customData.webPrice || null,
      originalPrice: customData.originalPrice || null,
      discount: customData.webDiscount || 0,
      discountType: customData.discountType || 'percentage',

      price1: pricing.fiyat1 || 0,
      price2: pricing.fiyat2 || 0,
      price3: pricing.fiyat3 || 0,
      price4: pricing.fiyat4 || 0,
      price10: pricing.fiyat10 || 0,

      seoTitle: customData.seoTitle || diaData.aciklama || '',
      seoDescription: customData.seoDescription || diaData.aciklama || '',
      seoUrl: customData.seoUrl || null,
      seoKeywords: customData.seoKeywords || [],
      focusKeyword: customData.focusKeyword || '',

      image: featuredImage,
      images: images,
      customImages: customData.customImages || [],
      videos: customData.videos || [],

      delivery: customData.delivery || 'same_day',

      description: customData.customDescription || null,
      shortDescription: customData.shortDescription || null,

      webVisible: customData.webVisible !== undefined ? customData.webVisible : true,
      webOrder: customData.webOrder || 0,
      webTags: customData.webTags || [],

      minOrderQuantity: customData.minOrderQuantity || 1,
      maxOrderQuantity: customData.maxOrderQuantity || null,
      stockAlert: customData.stockAlert || 5,

      isNew: customData.isNew || false,
      isBestSeller: customData.isBestSeller || false,
      isFeatured: customData.isFeatured || false,
      hideBrand: customData.hideBrand === true,
      hideProductionDate: customData.hideProductionDate === true,
      hideStock: customData.hideStock === true,
      hideDelivery: customData.hideDelivery === true,

      properties: {
        ...properties,
        m_kategoriler: diaData.m_kategoriler || [],
        ekalan1: diaData.ekalan1 || '',
        ekalan2: diaData.ekalan2 || '',
        ekalan3: diaData.ekalan3 || '',
        ekalan4: diaData.ekalan4 || '',
        ekalan5: diaData.ekalan5 || '',
        originCountry: diaData.menseiulkeadi || ''
      },
      note: '',
      tag: Array.isArray(customData.webTags) ? customData.webTags.join(', ') : '',

      createdAt: webProduct.createdAt,
      updatedAt: webProduct.updatedAt,
      lastDiaSync: syncInfo.lastDiaSync,

      syncStatus: syncInfo.diaStatus || 'unknown'
    };

    return res.json({
      success: true,
      data: mapped
    });

  } catch (error) {
    console.error('WebProduct detail get error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün detayı getirilirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
router.patch('/:id', maybeAuth, [
  body('seoTitle').optional().isLength({ max: 100 }).withMessage('SEO başlığı en fazla 100 karakter olabilir'),
  body('seoDescription').optional().isLength({ max: 160 }).withMessage('SEO açıklaması en fazla 160 karakter olabilir'),
  body('seoUrl').optional().matches(/^[a-z0-9-]*$/).withMessage('SEO URL sadece küçük harf, sayı ve tire içermelidir'),
  body('seoKeywords').optional().isArray().withMessage('SEO anahtar kelimeleri array olmalıdır'),
  body('focusKeyword').optional().isLength({ max: 120 }).withMessage('Odak anahtar kelime en fazla 120 karakter olabilir'),
  body('delivery').optional().isIn(['same_day', 'next_day', 'next_week']).withMessage('Geçersiz teslimat seçeneği'),
  body('webVisible').optional().isBoolean().withMessage('Web görünürlük boolean olmalıdır'),
  body('hideBrand').optional().isBoolean().withMessage('Marka gizleme alanı boolean olmalıdır'),
  body('hideProductionDate').optional().isBoolean().withMessage('Üretim tarihi gizleme alanı boolean olmalıdır'),
  body('hideStock').optional().isBoolean().withMessage('Stok gizleme alanı boolean olmalıdır'),
  body('hideDelivery').optional().isBoolean().withMessage('Kargo bilgisi gizleme alanı boolean olmalıdır'),
  body('webPrice').optional().isFloat({ min: 0 }).withMessage('Web fiyatı 0 veya daha büyük olmalıdır'),
  body('webDiscount').optional().isFloat({ min: 0, max: 100 }).withMessage('İndirim 0-100 arasında olmalıdır'),
  body('minOrderQuantity').optional().isInt({ min: 1 }).withMessage('Minimum sipariş adedi 1 veya daha büyük olmalıdır')
], async (req, res) => {
  try {
    console.log('Product Update Request:', {
      productId: req.params.id,
      body: req.body
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz veri',
        errors: errors.array()
      });
    }

    const productId = String(req.params.id);
    const {
      seoTitle,
      seoDescription,
      seoUrl,
      seoKeywords,
      focusKeyword,

      webVisible,
      webOrder,
      webTags,
      webCategory,
      webSubCategory,

      delivery,

      customDescription,
      shortDescription,

      webPrice,
      originalPrice,
      webDiscount,
      discountType,

      minOrderQuantity,
      maxOrderQuantity,
      stockAlert,

      isNew,
      isBestSeller,
      isFeatured,

      hideBrand,
      hideProductionDate,
      hideStock,

      hideDelivery
    } = req.body;

    const existingProduct = await WebProduct.findOne({ _key: productId, sites: req.site });
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    if (seoUrl && seoUrl !== existingProduct.customData?.seoUrl) {
      const urlExists = await WebProduct.findOne({
        'customData.seoUrl': seoUrl,
        _key: { $ne: productId }
      });

      if (urlExists) {
        return res.status(400).json({
          success: false,
          message: 'Bu SEO URL başka bir ürün tarafından kullanılıyor'
        });
      }
    }

    const updateData = {};
    const siteDataPath = `customData.siteData.${req.site}`;

    if (seoTitle !== undefined) updateData[`${siteDataPath}.seoTitle`] = seoTitle.trim();
    if (seoDescription !== undefined) updateData[`${siteDataPath}.seoDescription`] = seoDescription.trim();
    if (seoUrl !== undefined) updateData['customData.seoUrl'] = seoUrl.trim().toLowerCase();
    if (seoKeywords !== undefined) updateData['customData.seoKeywords'] = seoKeywords;
    if (focusKeyword !== undefined) updateData['customData.focusKeyword'] = String(focusKeyword || '').trim();

    if (webVisible !== undefined) updateData[`${siteDataPath}.webVisible`] = Boolean(webVisible);
    if (webOrder !== undefined) updateData[`${siteDataPath}.webOrder`] = Number(webOrder) || 0;
    if (webTags !== undefined) updateData['customData.webTags'] = Array.isArray(webTags) ? webTags : [];
    if (webCategory !== undefined) updateData['customData.webCategory'] = webCategory;
    if (webSubCategory !== undefined) updateData['customData.webSubCategory'] = webSubCategory;

    if (delivery !== undefined) updateData['customData.delivery'] = delivery;

    if (customDescription !== undefined) updateData[`customData.siteDescriptions.${req.site}`] = customDescription;
    if (shortDescription !== undefined) updateData[`${siteDataPath}.shortDescription`] = shortDescription;

    if (webPrice !== undefined) updateData['customData.webPrice'] = webPrice ? Number(webPrice) : null;
    if (originalPrice !== undefined) updateData['customData.originalPrice'] = originalPrice ? Number(originalPrice) : null;
    if (webDiscount !== undefined) updateData['customData.webDiscount'] = Number(webDiscount) || 0;
    if (discountType !== undefined) updateData['customData.discountType'] = discountType;

    if (minOrderQuantity !== undefined) updateData['customData.minOrderQuantity'] = Number(minOrderQuantity) || 1;
    if (maxOrderQuantity !== undefined) updateData['customData.maxOrderQuantity'] = maxOrderQuantity ? Number(maxOrderQuantity) : null;
    if (stockAlert !== undefined) updateData['customData.stockAlert'] = Number(stockAlert) || 5;

    if (isNew !== undefined) updateData['customData.isNew'] = Boolean(isNew);
    if (isBestSeller !== undefined) updateData['customData.isBestSeller'] = Boolean(isBestSeller);
    if (isFeatured !== undefined) updateData['customData.isFeatured'] = Boolean(isFeatured);
    if (hideBrand !== undefined) updateData['customData.hideBrand'] = Boolean(hideBrand);
    if (hideProductionDate !== undefined) updateData['customData.hideProductionDate'] = Boolean(hideProductionDate);
    if (hideStock !== undefined) updateData['customData.hideStock'] = Boolean(hideStock);
    if (hideDelivery !== undefined) updateData['customData.hideDelivery'] = Boolean(hideDelivery);

    if (req.body.customImages !== undefined) {
      const incoming = Array.isArray(req.body.customImages) ? req.body.customImages : [];
      let images = incoming;

      try {
        const imageMirror = require('../../../services/media/ImageMirrorService');
        const urunAdi = existingProduct?.diaData?.aciklama || existingProduct?.diaData?.stokkartkodu;
        const map = await imageMirror.mirrorMany(incoming.map(img => img && img.url), urunAdi);
        images = incoming.map(img => {
          if (!img || !img.url) return img;
          const local = map[img.url] || imageMirror.findExisting(img.url);
          return local ? { ...img, url: local, sourceUrl: img.sourceUrl || img.url } : img;
        });
      } catch (error) {
        console.error('Görsel aynalama atlandı:', error.message);
      }

      updateData['customData.customImages'] = images;
      if (images.length > 0) {
        updateData['customData.featuredImage'] = images[0].url;
      }
    }

    if (req.body.videos !== undefined) {
      const incoming = Array.isArray(req.body.videos) ? req.body.videos : [];

      const videos = incoming
        .map((video, index) => {
          const url = String(video?.url || '').trim();
          const videoId = extractYoutubeId(url);

          if (!videoId) return null;

          return {
            order: Number.isFinite(video?.order) ? video.order : index,
            url,
            videoId,
            title: String(video?.title || '').trim()
          };
        })
        .filter(Boolean);

      updateData['customData.videos'] = videos;
    }
    updateData['syncInfo.lastWebUpdate'] = new Date();

    if (webVisible === true && existingProduct.syncInfo?.diaStatus === 'synced') {
      updateData['syncInfo.webStatus'] = 'active';
    } else if (webVisible === false) {
      updateData['syncInfo.webStatus'] = 'hidden';
    }

    console.log('Update data:', updateData);

    const updatedProduct = await WebProduct.findOneAndUpdate(
      { _key: productId, sites: req.site },
      { $set: updateData },
      {
        new: true,
        runValidators: true
      }
    ).select({
      _key: 1,
      'customData': 1,
      'syncInfo.webStatus': 1,
      'syncInfo.lastWebUpdate': 1,
      'diaData.aciklama': 1,
      'diaData.stokkartkodu': 1,
      updatedAt: 1
    });

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: 'Ürün güncellenirken hata oluştu'
      });
    }

    try {
      const CacheManager = require('../../../../packages/cache');
      const cache = new CacheManager();
      await cache.invalidateSearchCache();
    } catch (error) {
      console.log('Cache temizleme hatası (önemsiz):', error.message);
    }

    const updatedFieldsCount = Object.keys(updateData).length - 1;

    res.json({
      success: true,
      message: `${updatedFieldsCount} alan başarıyla güncellendi`,
      data: {
        _key: updatedProduct._key,
        name: updatedProduct.customData?.seoTitle || updatedProduct.diaData?.aciklama,
        sku: updatedProduct.diaData?.stokkartkodu,
        customData: updatedProduct.customData,
        webStatus: updatedProduct.syncInfo?.webStatus,
        lastUpdate: updatedProduct.syncInfo?.lastWebUpdate,
        updatedAt: updatedProduct.updatedAt
      },
      toast: {
        type: 'success',
        title: 'Güncelleme Başarılı',
        message: `${updatedProduct.diaData?.aciklama || 'Ürün'} başarıyla güncellendi`
      }
    });

  } catch (error) {
    console.error('WebProduct güncelleme hatası:', error);

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Veri doğrulama hatası',
        errors: validationErrors,
        toast: {
          type: 'error',
          title: 'Doğrulama Hatası',
          message: 'Lütfen form alanlarını kontrol edin'
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ürün güncellenirken hata oluştu',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      toast: {
        type: 'error',
        title: 'Güncelleme Hatası',
        message: 'Ürün güncellenirken bir hata oluştu. Lütfen tekrar deneyin.'
      }
    });
  }
});

router.get('/features/all', maybeAuth, async (req, res) => {
  try {
    const allFeatures = await DiaStock.aggregate([
      {
        $match: {
          durum: 'A',
          b2c_durum: 'E',
          b2c_gonder: 'E',
          'm_kategoriler.kategori_aciklama_1': 'Lastik'
        }
      },
      { $unwind: '$m_urunOzellikleri' },
      {
        $match: {
          'm_urunOzellikleri.ozellikadi': { $exists: true, $ne: null, $ne: '' },
          'm_urunOzellikleri.detayaciklama': { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$m_urunOzellikleri.ozellikadi',
          values: { $addToSet: '$m_urunOzellikleri.detayaciklama' }
        }
      },
      { $project: { name: '$_id', values: 1, _id: 0 } }
    ]);

    res.json({ success: true, data: allFeatures });
  } catch (error) {
    console.error('Features get error:', error);
    res.status(500).json({ success: false, message: 'Özellikler getirilemedi' });
  }
});

router.get('/debug/:id', async (req, res) => {
  try {
    const product = await DiaStock.findOne({ _key: req.params.id }).lean();
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/synchronization', maybeAuth, async (req, res) => {
  try {
    const productId = String(req.params.id);
    const { synchronization } = req.body;

    const product = await WebProduct.findOne({ _key: productId, sites: req.site });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    await WebProduct.findOneAndUpdate(
      { _key: productId },
      {
        $set: {
          'diaData.synced': synchronization === 'Y' ? 'synced' : 'not_synced',
          'syncInfo.lastWebUpdate': new Date()
        }
      }
    );

    res.json({
      success: true,
      message: 'Senkronizasyon güncellendi'
    });

  } catch (error) {
    console.error('Synchronization update error:', error);
    res.status(500).json({
      success: false,
      message: 'Senkronizasyon güncellenirken hata oluştu'
    });
  }
});

module.exports = router;