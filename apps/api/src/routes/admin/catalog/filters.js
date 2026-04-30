const express = require('express');
const router = express.Router();
const WebProduct = require('../../../models/web/catalog/WebProduct');
const { authenticateAdmin } = require('../../../middleware/auth');

const maybeAuth = process.env.DISABLE_AUTH === 'true'
    ? (req, res, next) => next()
    : authenticateAdmin;

/**
 * Ürün Filtre Seçenekleri
 * GET /api/admin/filters/product-options
 */
router.get('/product-options', maybeAuth, async (req, res) => {
    try {
        const baseFilter = {
            'diaData.durum': 'A',
            'syncInfo.diaStatus': 'synced'
        };

        const ozelkodDistinct = (num) => WebProduct.distinct(`diaData.ozelkod${num}kodu`, {
            ...baseFilter,
            [`diaData.ozelkod${num}kodu`]: { $exists: true, $ne: '', $ne: null }
        });

        const [brands, productTypes, seasons, sizes, mainCategories, widthsAgg, profilesAgg, rimsAgg,
            ozelkod2Values, ozelkod4Values, ozelkod5Values, ozelkod6Values] = await Promise.all([
                WebProduct.distinct('diaData.marka', {
                    ...baseFilter,
                    'diaData.marka': { $exists: true, $ne: '', $ne: null }
                }),
                WebProduct.distinct('diaData.ozelkod7kodu', {
                    ...baseFilter,
                    'diaData.ozelkod7kodu': { $exists: true, $ne: '', $ne: null }
                }),
                WebProduct.distinct('diaData.ozelkod1kodu', {
                    ...baseFilter,
                    'diaData.ozelkod1kodu': { $exists: true, $ne: '', $ne: null }
                }),
                WebProduct.distinct('diaData.ozelkod3kodu', {
                    ...baseFilter,
                    'diaData.ozelkod3kodu': { $exists: true, $ne: '', $ne: null }
                }),
                WebProduct.distinct('diaData.m_kategoriler.kategori_aciklama_1', {
                    ...baseFilter,
                    'diaData.m_kategoriler.kategori_aciklama_1': { $exists: true, $ne: '', $ne: null }
                }),
                WebProduct.aggregate([
                    { $match: baseFilter },
                    { $unwind: '$diaData.m_urunOzellikleri' },
                    { $match: { 'diaData.m_urunOzellikleri.ozellikadi': 'Genişlik', 'diaData.m_urunOzellikleri.detayaciklama': { $ne: '', $ne: null } } },
                    { $group: { _id: '$diaData.m_urunOzellikleri.detayaciklama' } },
                    { $sort: { _id: 1 } }
                ]),
                WebProduct.aggregate([
                    { $match: baseFilter },
                    { $unwind: '$diaData.m_urunOzellikleri' },
                    { $match: { 'diaData.m_urunOzellikleri.ozellikadi': 'Yanak', 'diaData.m_urunOzellikleri.detayaciklama': { $ne: '', $ne: null } } },
                    { $group: { _id: '$diaData.m_urunOzellikleri.detayaciklama' } },
                    { $sort: { _id: 1 } }
                ]),
                WebProduct.aggregate([
                    { $match: baseFilter },
                    { $unwind: '$diaData.m_urunOzellikleri' },
                    { $match: { 'diaData.m_urunOzellikleri.ozellikadi': 'Jant Çapı', 'diaData.m_urunOzellikleri.detayaciklama': { $ne: '', $ne: null } } },
                    { $group: { _id: '$diaData.m_urunOzellikleri.detayaciklama' } },
                    { $sort: { _id: 1 } }
                ]),
                ozelkodDistinct(2),
                ozelkodDistinct(4),
                ozelkodDistinct(5),
                ozelkodDistinct(6)
            ]);

        const widths = new Set();
        const profiles = new Set();
        const rims = new Set();

        sizes.forEach(size => {
            const match = size.match(/^(\d{2,3})\/(\d{2,3})\s?R?(\d{2})/i);
            if (match) {
                widths.add(match[1]);
                profiles.add(match[2]);
                rims.add(match[3]);
            }
        });

        const sortTr = (arr) => arr.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), 'tr'));

        res.json({
            success: true,
            data: {
                brands: sortTr(brands),
                productTypes: sortTr(productTypes),
                seasons: sortTr(seasons),
                sizes: sizes.filter(Boolean).sort(),
                mainCategories: sortTr(mainCategories),
                widths: widthsAgg.map(w => w._id).filter(Boolean).sort((a, b) => Number(a) - Number(b)),
                profiles: profilesAgg.map(p => p._id).filter(Boolean).sort((a, b) => Number(a) - Number(b)),
                rims: rimsAgg.map(r => r._id).filter(Boolean).sort(),
                ozelkod1Values: sortTr(seasons),
                ozelkod2Values: sortTr(ozelkod2Values),
                ozelkod3Values: sizes.filter(Boolean).sort(),
                ozelkod4Values: sortTr(ozelkod4Values),
                ozelkod5Values: sortTr(ozelkod5Values),
                ozelkod6Values: sortTr(ozelkod6Values),
                ozelkod7Values: sortTr(productTypes)
            }
        });
    } catch (error) {
        console.error('Filtre seçenekleri hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Filtre seçenekleri yüklenirken hata oluştu',
            error: error.message
        });
    }
});
/**
 * Ana kategoriye bağlı alt kategoriler
 * GET /api/admin/filters/sub-categories?main_category=Otomobil Lastikleri
 */
router.get('/sub-categories', maybeAuth, async (req, res) => {
    try {
        const { main_category } = req.query;
        if (!main_category) {
            return res.json({ success: true, data: [] });
        }

        const baseFilter = {
            'diaData.durum': 'A',
            'syncInfo.diaStatus': 'synced',
            'diaData.m_kategoriler.kategori_aciklama_1': main_category
        };

        const subCategories = await WebProduct.distinct(
            'diaData.m_kategoriler.kategori_aciklama_2',
            {
                ...baseFilter,
                'diaData.m_kategoriler.kategori_aciklama_2': { $exists: true, $ne: '', $ne: null }
            }
        );

        res.json({
            success: true,
            data: subCategories.filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr'))
        });
    } catch (error) {
        console.error('Alt kategori hatası:', error);
        res.status(500).json({ success: false, message: 'Alt kategoriler yüklenemedi' });
    }
});
module.exports = router;