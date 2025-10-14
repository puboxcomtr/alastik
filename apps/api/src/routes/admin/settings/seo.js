const express = require('express');
const router = express.Router();
const SeoSettings = require('../../../models/SeoSettings');
router.get('/', async (req, res) => {
    try {
        let settings = await SeoSettings.findOne();
        if (!settings) {
            settings = await SeoSettings.create({
                homepage: { title: '', description: '', keywords: '' },
                category: {
                    titleTemplate: '{kategori-adi}',
                    descriptionTemplate: '{kategori-aciklamasi}',
                    keywordsTemplate: '{kategori-adi}'
                },
                brand: {
                    titleTemplate: '{marka-adi}',
                    descriptionTemplate: '{marka-aciklamasi}',
                    keywordsTemplate: '{marka-adi}'
                },
                product: {
                    titleTemplate: '{urun-adi}',
                    descriptionTemplate: '{urun-aciklamasi}',
                    keywordsTemplate: '{urun-adi}, {marka-adi}'
                }
            });
        }

        res.json({
            success: true,
            data: settings
        });

    } catch (error) {
        console.error('SEO ayarları getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'SEO ayarları getirilemedi'
        });
    }
});
router.put('/', async (req, res) => {
    try {
        const { homepage, category, brand, product } = req.body;

        let settings = await SeoSettings.findOne();

        if (!settings) {
            settings = await SeoSettings.create({
                homepage,
                category,
                brand,
                product
            });
        } else {
            if (homepage) settings.homepage = homepage;
            if (category) settings.category = category;
            if (brand) settings.brand = brand;
            if (product) settings.product = product;

            await settings.save();
        }
        res.json({
            success: true,
            data: settings,
            message: 'SEO ayarları kaydedildi'
        });

    } catch (error) {
        console.error('SEO ayarları güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'SEO ayarları güncellenemedi'
        });
    }
});
module.exports = router;