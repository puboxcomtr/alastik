const express = require('express');
const Product = require('../../../models/Product');
const DiaStock = require('../../../models/DiaStock');
const { authenticateAdmin } = require('../../../middleware/auth');
const { body, validationResult } = require('express-validator');

// @IMPORT Library
const DiaStockService = require('../../../services/DiaStockService');
const { MAIN_DIA_FILTERS } = require('../../../config/diaFilters');
const router = express.Router();

const maybeAuth = process.env.NODE_ENV === 'production' ? authenticateAdmin : (req, res, next) => next();

/**
 * Ürün Listeleme *
 */
router.get('/', maybeAuth, async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 50 } = req.query;
    const diaFilter = {};
    MAIN_DIA_FILTERS.forEach(filter => {
      const { field, operator, value } = filter;

      switch (operator) {
        case '=':
          diaFilter[field] = value;
          break;
        case '>':
          diaFilter[field] = { $gt: parseFloat(value) };
          break;
        case '<':
          diaFilter[field] = { $lt: parseFloat(value) };
          break;
        case '>=':
          diaFilter[field] = { $gte: parseFloat(value) };
          break;
        case '<=':
          diaFilter[field] = { $lte: parseFloat(value) };
          break;
        default:
          diaFilter[field] = value;
      }
    });
    if (search) {
      diaFilter.$text = { $search: String(search) };
    }

    // Pagination uygula
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const products = await DiaStock.find(diaFilter)
      .select({
        _key: 1,
        aciklama: 1,
        fiyat1: 1,
        sontuketicifiyati: 1,
        marka: 1,
        stokkartkodu: 1,
        fiili_stok: 1,
        b2c_gonder: 1,
        kdvsatis: 1,
        ekleyenkullaniciadi: 1,
        kullaniciadi: 1,
        menseiulkeadi: 1,
        urunagaci1: 1,
        note: 1,
        durum: 1,
        'm_urunOzellikleri.ozellikadi': 1,
        'm_urunOzellikleri.detayaciklama': 1,
        'm_urunOzellikleri.ozellisirano': 1,
        'm_birimler.fiyat1': 1,
        'm_birimler.fiyat2': 1,
        'm_birimler.fiyat3': 1,
        'm_birimler.fiyat4': 1,
        'm_birimler.fiyat10': 1,
        'm_resimler.aws_url': 1,
        'm_resimler.order_id': 1,
        'm_kategoriler.kategori_aciklama_1': 1,
        createdAt: 1
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await DiaStock.countDocuments(diaFilter);

    // Response mapping
    res.json({
      success: true,
      data: products.map(p => {
        const images = (p.m_resimler || [])
          .sort((a, b) => parseInt(a.order_id || 0) - parseInt(b.order_id || 0))
          .slice(0, 3);
        const pricing = p.m_birimler && p.m_birimler[0] ? p.m_birimler[0] : {};

        const properties = (p.m_urunOzellikleri || [])
          .filter(prop => prop.ozellikadi && prop.detayaciklama)
          .sort((a, b) => parseInt(a.ozellisirano || 0) - parseInt(b.ozellisirano || 0))
          .reduce((acc, prop) => {
            acc[prop.ozellikadi] = prop.detayaciklama;
            return acc;
          }, {});

        const defaultImage = '/images/urun/gorsel-bulunamadi.jpg';

        return {
          id: p._key,
          name: p.aciklama || p.kodveaciklama || p.stokkartkodu,
          price: p.fiyat1 || p.sontuketicifiyati || 0,
          brand: p.marka || '',
          sku: p.stokkartkodu,
          qty: p.fiili_stok || 0,
          status: p.durum === 'A' ? 'Published' : 'Inactive',
          image: images[0]?.aws_url || defaultImage,
          image2: images[1]?.aws_url || null,
          image3: images[2]?.aws_url || null,
          category: (p.m_kategoriler && p.m_kategoriler[0] && p.m_kategoriler[0].kategori_aciklama_1) || 'Genel',
          kdv: p.kdvsatis || 20,
          addedBy: p.ekleyenkullaniciadi || '',
          updatedBy: p.kullaniciadi || '',
          originCountry: p.menseiulkeadi || '',
          categoryPath: p.urunagaci1 || '',
          note: p.note || '',
          price1: pricing.fiyat1 || p.fiyat1 || 0,
          price2: pricing.fiyat2 || 0,
          price3: pricing.fiyat3 || 0,
          price4: pricing.fiyat4 || 0,
          price10: pricing.fiyat10 || 0,
          properties: properties,
          createdAt: p.createdAt
        };
      }),
      totalRecords: total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Products get error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürünler getirilirken hata oluştu'
    });
  }
});

/**
 * Ürün Detay Görüntüleme *
 */
router.get('/:id', maybeAuth, async (req, res) => {
  try {
    const id = String(req.params.id);
    const p = await DiaStock.findOne({ _key: id }).select({
      _key: 1,
      aciklama: 1,
      fiyat1: 1,
      sontuketicifiyati: 1,
      marka: 1,
      stokkartkodu: 1,
      barkodu: 1,
      fiili_stok: 1,
      durum: 1,
      note: 1,
      'm_kategoriler.kategori_aciklama_1': 1,
      'm_resimler.aws_url': 1,
      'm_resimler.order_id': 1,
      'm_urunOzellikleri.ozellikadi': 1,
      'm_urunOzellikleri.detayaciklama': 1,
      'm_urunOzellikleri.ozellisirano': 1
    }).lean();

    if (!p) {
      return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
    }

    // Görselleri sırala ve array yap
    const images = (p.m_resimler || [])
      .sort((a, b) => parseInt(a.order_id || 0) - parseInt(b.order_id || 0))
      .map(img => img.aws_url)
      .filter(Boolean);

    const properties = (p.m_urunOzellikleri || [])
      .filter(prop => prop.ozellikadi && prop.detayaciklama)
      .sort((a, b) => parseInt(a.ozellisirano || 0) - parseInt(b.ozellisirano || 0))
      .reduce((acc, prop) => {
        acc[prop.ozellikadi] = prop.detayaciklama;
        return acc;
      }, {});

    const mapped = {
      id: Number(p._key) || p._key,
      name: p.aciklama || p.kodveaciklama || p.stokkartkodu || 'Ürün',
      category: (p.m_kategoriler && p.m_kategoriler[0] && p.m_kategoriler[0].kategori_aciklama_1) || 'Lastik',
      stock: (p.fiili_stok || 0) > 0,
      qty: p.fiili_stok || 0,
      sku: p.stokkartkodu || '',
      barcode: p.barkodu || '',
      brand: p.marka || '',
      seo_title: p.aciklama || '',
      seo_description: p.aciklama || '',
      seo_url: (p.stokkartkodu || '').toLowerCase(),
      price: p.fiyat1 || p.sontuketicifiyati || 0,
      price2: 0,
      price3: 0,
      price4: 0,
      price5: 0,
      price6: 0,
      status: p.durum === 'A' ? 'Aktif' : 'Pasif',
      image: images[0] || '',
      images: images,
      properties: properties,
      note: p.note || '',
      tag: ''
    };

    return res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Product get error:', error);
    res.status(500).json({ success: false, message: 'Ürün getirilirken hata oluştu' });
  }
});

/**
 * Frontend: ProductFeatures komponenti
 */
router.get('/features/all', maybeAuth, async (req, res) => {
  try {
    const allFeatures = await DiaStock.aggregate([
      {
        $match: {
          durum: 'A',
          b2c_durum: 'E',
          b2c_gonder: 'E',
          'm_kategoriler.kategori_aciklama_1': 'Lastik' // Sadece lastik kategorisi
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



module.exports = router;