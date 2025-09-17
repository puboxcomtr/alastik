const express = require('express');
const Product = require('../models/Product');
const DiaStock = require('../models/DiaStock');
const { authenticateAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Tüm ürünleri getir (geçici: development'ta public)
const maybeAuth = process.env.NODE_ENV === 'production' ? authenticateAdmin : (req, res, next) => next();

router.get('/debug/:id', async (req, res) => {
  try {
    const product = await DiaStock.findOne({ _key: req.params.id }).lean()
    res.json(product)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

router.get('/', maybeAuth, async (req, res) => {
  try {
    const { search, category, status } = req.query; // page, limit kaldırıldı

    // Filtreleme kriterleri (Sadece Stokta Olan Ürünler - B2C Gönder ve B2C Durum 'E' olanlar ve İkinci El Ürünleri Hariç Tut.)
    const diaFilter = {
      durum: 'A',
      b2c_durum: 'E',
      b2c_gonder: 'E',
      fiili_stok: { $gt: 0 } // Sadece stokta olan ürünler
    };

    // İkinci El ürünleri hariç tut
    diaFilter['m_urunOzellikleri'] = {
      $not: {
        $elemMatch: {
          ozellikadi: 'Durumu',
          detayaciklama: 'İkinci El'
        }
      }
    };

    if (search) {
      diaFilter.$text = { $search: String(search) };
    }

    // Dia Verilerinin Değişken Tanımları - Tüm ürünleri getir
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
        'm_resimler.order_id': 1, // order_id eklendi
        'm_kategoriler.kategori_aciklama_1': 1,
        createdAt: 1
      })
      .sort({ createdAt: -1 })
      .lean();

    const total = products.length; // products array'inin uzunluğu

    // Dia Verilerinin Eşleştirilmesi
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

        // Default Görsel
        const defaultImage = '/images/urun/gorsel-bulunamadi.jpg';

        // Verilerin Çekildiği Alan
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
      totalRecords: total
    });
  } catch (error) {
    console.error('Products get error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürünler getirilirken hata oluştu'
    });
  }
});

// Ürün detayı getir (DiaStock üzerinden) - development'ta public
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
      'm_resimler.aws_url': 1
    }).lean();

    if (!p) {
      return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
    }

    const mapped = {
      id: Number(p._key) || p._key,
      productName: p.aciklama || p.kodveaciklama || p.stokkartkodu || 'Ürün',
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
      image: (p.m_resimler && p.m_resimler[0] && p.m_resimler[0].aws_url) || '',
      note: p.note || '',
      tag: ''
    };

    return res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('Product get error:', error);
    res.status(500).json({ success: false, message: 'Ürün getirilirken hata oluştu' });
  }
});

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