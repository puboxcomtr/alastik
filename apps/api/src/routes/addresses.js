const express = require('express');
const router = express.Router();
const Address = require('../models/admin/user/Address');
const { authenticate: auth } = require('../middleware/auth');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

router.get('/', auth, async (req, res) => {
  try {
    const addresses = await Address.find({ 
      userId: req.userId,
      isActive: true 
    }).sort({ isDefault: -1, createdAt: -1 });

    logger.info(`Adresler getirildi - UserId: ${req.userId}, Adet: ${addresses.length}`);

    res.json({
      success: true,
      data: addresses
    });
  } catch (error) {
    logger.error('Adresler getirilemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Adresler yüklenirken hata oluştu'
    });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.userId,
      isActive: true
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Adres bulunamadı'
      });
    }

    res.json({
      success: true,
      data: address
    });
  } catch (error) {
    logger.error('Adres getirilemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Adres yüklenirken hata oluştu'
    });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const addressData = {
      ...req.body,
      userId: req.userId
    };

    const addressCount = await Address.countDocuments({ 
      userId: req.userId,
      isActive: true 
    });
    
    if (addressCount >= 10) {
      return res.status(400).json({
        success: false,
        message: 'Maksimum 10 adres ekleyebilirsiniz'
      });
    }

    const address = new Address(addressData);
    await address.save();

    logger.info(`Yeni adres eklendi - UserId: ${req.userId}, AddressId: ${address._id}`);

    res.status(201).json({
      success: true,
      message: 'Adres başarıyla eklendi',
      data: address
    });
  } catch (error) {
    logger.error('Adres eklenemedi:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Geçersiz adres bilgileri',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Adres eklenirken hata oluştu'
    });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.userId,
      isActive: true
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Adres bulunamadı'
      });
    }

    delete req.body.userId;
    
    if (req.body.isDefault === true) {
      await Address.updateMany(
        { userId: req.userId, _id: { $ne: req.params.id } },
        { isDefault: false }
      );
    }

    Object.assign(address, req.body);
    await address.save();

    logger.info(`Adres güncellendi - UserId: ${req.userId}, AddressId: ${address._id}`);

    res.json({
      success: true,
      message: 'Adres başarıyla güncellendi',
      data: address
    });
  } catch (error) {
    logger.error('Adres güncellenemedi:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Geçersiz adres bilgileri',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Adres güncellenirken hata oluştu'
    });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.userId,
      isActive: true
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Adres bulunamadı'
      });
    }

    address.isActive = false;
    await address.save();

    if (address.isDefault) {
      const newDefaultAddress = await Address.findOne({
        userId: req.userId,
        isActive: true
      }).sort({ createdAt: -1 });

      if (newDefaultAddress) {
        newDefaultAddress.isDefault = true;
        await newDefaultAddress.save();
      }
    }

    logger.info(`Adres silindi - UserId: ${req.userId}, AddressId: ${address._id}`);

    res.json({
      success: true,
      message: 'Adres başarıyla silindi'
    });
  } catch (error) {
    logger.error('Adres silinemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Adres silinirken hata oluştu'
    });
  }
});

router.post('/:id/set-default', auth, async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      userId: req.userId,
      isActive: true
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Adres bulunamadı'
      });
    }

    await Address.updateMany(
      { userId: req.userId, _id: { $ne: req.params.id } },
      { isDefault: false }
    );

    address.isDefault = true;
    await address.save();

    logger.info(`Varsayılan adres değiştirildi - UserId: ${req.userId}, AddressId: ${address._id}`);

    res.json({
      success: true,
      message: 'Varsayılan adres başarıyla değiştirildi',
      data: address
    });
  } catch (error) {
    logger.error('Varsayılan adres değiştirilemedi:', error);
    res.status(500).json({
      success: false,
      message: 'Varsayılan adres değiştirilirken hata oluştu'
    });
  }
});

const cityCache = { data: null, expiresAt: 0 };

router.get('/data/cities', async (req, res) => {
  try {
    const now = Date.now();
    if (cityCache.data && cityCache.expiresAt > now) {
      return res.json({ success: true, data: cityCache.data });
    }

    const response = await fetch('https://turkiyeapi.dev/api/v1/provinces', { timeout: 10000 }).catch(() => null);
    if (!response || !response.ok) throw new Error('Upstream provinces fetch failed');
    const payload = await response.json();
    const provinces = Array.isArray(payload?.data) ? payload.data : [];

    const cities = provinces.map((p) => ({
      id: String(p?.plateNumber ?? p?.id ?? '').toString().padStart(2, '0'),
      name: p?.name || p?.province || 'Bilinmeyen'
    }))
    .filter(c => c.id && c.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    cityCache.data = cities;
    cityCache.expiresAt = now + 6 * 60 * 60 * 1000;

    return res.json({ success: true, data: cities });
  } catch (err) {
    logger.warn('Cities upstream error, using fallback list', { error: String(err) });
    return res.json({
      success: true,
      data: [
        { id: '34', name: 'İstanbul' },
        { id: '06', name: 'Ankara' },
        { id: '35', name: 'İzmir' }
      ]
    });
  }
});

const districtCache = new Map();

router.get('/data/districts/:cityId', async (req, res) => {
  const cityId = String(req.params.cityId || '').padStart(2, '0');
  try {
    const cached = districtCache.get(cityId);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return res.json({ success: true, data: cached.data });
    }

    const response = await fetch(`https://turkiyeapi.dev/api/v1/provinces/${parseInt(cityId, 10)}`, { timeout: 10000 }).catch(() => null);
    if (!response || !response.ok) throw new Error('Upstream province detail fetch failed');
    const payload = await response.json();
    const province = payload?.data;
    const districts = Array.isArray(province?.districts) ? province.districts : [];

    const data = districts
      .map((d) => ({ name: d?.name || d?.district || '' }))
      .filter(d => d.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    districtCache.set(cityId, { data, expiresAt: now + 6 * 60 * 60 * 1000 });

    return res.json({ success: true, data });
  } catch (err) {
    logger.warn('Districts upstream error, using fallback list', { cityId, error: String(err) });
    return res.json({ success: true, data: [] });
  }
});

module.exports = router;
