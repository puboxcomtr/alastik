const express = require('express');
const router = express.Router();
const WebTranslation = require('../../../models/web/settings/WebTranslation');

// Tüm aktif çevirileri getir
router.get('/', async (req, res) => {
    try {
        const { category } = req.query;

        const filter = { isActive: true };
        if (category) {
            filter.category = category;
        }

        const translations = await WebTranslation.find(filter)
            .select('key value category')
            .lean();

        // Key-value formatına çevir
        const translationsMap = translations.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {});

        res.json({
            success: true,
            data: translationsMap
        });
    } catch (error) {
        console.error('Translations error:', error);
        res.status(500).json({
            success: false,
            message: 'Çeviriler yüklenirken hata oluştu.'
        });
    }
});

// Kategoriye göre çevirileri getir
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;

        const translations = await WebTranslation.find({
            category,
            isActive: true
        })
            .select('key value')
            .lean();

        const translationsMap = translations.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {});

        res.json({
            success: true,
            data: translationsMap
        });
    } catch (error) {
        console.error('Category translations error:', error);
        res.status(500).json({
            success: false,
            message: 'Çeviriler yüklenirken hata oluştu.'
        });
    }
});

module.exports = router;