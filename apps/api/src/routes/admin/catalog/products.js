const express = require('express');
const Product = require('../../../models/Product');
const DiaStock = require('../../../models/DiaStock');
const { authenticateAdmin } = require('../../../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Tüm ürünleri getir (geçici: development'ta public)
const maybeAuth = process.env.NODE_ENV === 'production' ? authenticateAdmin : (req, res, next) => next();


/**
 * Ürün Detay Sayfası
 * Ek Özellikler Alanı
 **/
router.get('/features/all', maybeAuth, async (req, res) => {
  try {
    const allFeatures = await DiaStock.aggregate([
      { $match: { durum: 'A', b2c_durum: 'E', b2c_gonder: 'E' } },
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
    res.status(500).json({ success: false, message: 'Özellikler getirilemedi' });
  }
});

/**
 * Admin Paneli Ürün Detay Sayfası *
**/
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

// Ürün detayı getir (DiaStock üzerinden)
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

    const images = (p.m_resimler || [])
      .sort((a, b) => parseInt(a.order_id || 0) - parseInt(b.order_id || 0))
      .map(img => img.aws_url)
      .filter(Boolean);

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
 * Bu Kısım Silinecek Ürün Ekleme YOK *
**/
// Yeni ürün oluştur
router.post('/', authenticateAdmin, [
  body('name').notEmpty().withMessage('Ürün adı gerekli'),
  body('sku').notEmpty().withMessage('SKU gerekli'),
  body('price').isNumeric().withMessage('Geçerli fiyat gerekli'),
  body('category').notEmpty().withMessage('Kategori gerekli')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(error => error.msg)
      });
    }

    const product = new Product(req.body);
    await product.save();

    res.status(201).json({
      success: true,
      data: product,
      message: 'Ürün başarıyla oluşturuldu'
    });
  } catch (error) {
    console.error('Product create error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün oluşturulurken hata oluştu'
    });
  }
});

// Ürün güncelle
router.put('/:id', authenticateAdmin, [
  body('name').optional().notEmpty().withMessage('Ürün adı boş olamaz'),
  body('price').optional().isNumeric().withMessage('Geçerli fiyat gerekli')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(error => error.msg)
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('category', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    res.json({
      success: true,
      data: product,
      message: 'Ürün başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Product update error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün güncellenirken hata oluştu'
    });
  }
});

// Ürün sil
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Ürün başarıyla silindi'
    });
  } catch (error) {
    console.error('Product delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün silinirken hata oluştu'
    });
  }
});


module.exports = router;