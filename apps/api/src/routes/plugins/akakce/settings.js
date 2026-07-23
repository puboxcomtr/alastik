const express = require('express');
const router = express.Router();
const WebAkakceSettings = require('../../../models/plugins/akakce/WebAkakceSettings');

// Ayarları Getir
router.get('/', async (req, res) => {
    try {
        let settings = await WebAkakceSettings.findOne();
        if (!settings) {
            settings = await WebAkakceSettings.create({});
        }
        res.json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Ayarları Güncelle
router.put('/', async (req, res) => {
    try {
        // Salt okunur / sistem alanları istekten ayıklanır
        const { _id, createdAt, updatedAt, __v, lastGenerated, productCount, ...payload } = req.body || {};

        let settings = await WebAkakceSettings.findOne();
        if (!settings) {
            settings = await WebAkakceSettings.create(payload);
        } else {
            settings.set(payload);
            await settings.save();
        }
        res.json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Mevcut fiyat alanlarını getir
router.get('/price-fields', async (req, res) => {
    try {
        const db = require('mongoose').connection.db;
        const product = await db.collection('webproducts').findOne(
            { 'diaData.m_birimler': { $exists: true } },
            { projection: { 'diaData.m_birimler': 1 } }
        );

        if (!product || !product.diaData?.m_birimler?.length) {
            return res.json({ success: true, data: [] });
        }

        const birim = product.diaData.m_birimler[0];
        const fields = Object.keys(birim)
            .filter(k => k.startsWith('fiyat'))
            .map(k => ({ key: k, value: birim[k] }));

        res.json({ success: true, data: fields });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Mevcut metin alanlarını getir
router.get('/text-fields', async (req, res) => {
    try {
        const db = require('mongoose').connection.db;
        const product = await db.collection('webproducts').findOne(
            {
                'customData.customDescription': { $exists: true, $ne: null },
                'diaData.aciklama': { $exists: true }
            },
            { projection: { 'diaData': 1, 'customData': 1 } }
        );

        if (!product) return res.json({ success: true, data: { diaFields: [], customFields: [] } });

        const excludedDiaFields = ['synced', 'durum', 'barkodu', 'menseiulkeadi', 'stokkartkodu', 'marka', 'anabarkod'];
        const diaFields = Object.entries(product.diaData)
            .filter(([k, v]) => typeof v === 'string' && v.length > 0 && !k.startsWith('_') && !excludedDiaFields.includes(k))
            .map(([k, v]) => ({ key: `diaData.${k}`, preview: String(v).substring(0, 60) }));

        const excludedCustomFields = ['seoUrl', 'webCategory', 'webSubCategory', 'discountType', 'delivery', 'seoTitle', 'seoDescription', 'featuredImage', 'shortDescription'];
        const customFields = Object.entries(product.customData)
            .filter(([k, v]) => typeof v === 'string' && v.length > 0 && !excludedCustomFields.includes(k))
            .map(([k, v]) => ({ key: `customData.${k}`, preview: String(v).replace(/<[^>]*>/g, '').trim().substring(0, 60) || k }));

        res.json({ success: true, data: { diaFields, customFields } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
