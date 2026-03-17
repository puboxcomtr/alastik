// apps/api/src/routes/web/catalog/tags.js

const express = require('express');
const router = express.Router();

const WebTag = require('../../../models/web/catalog/WebTag');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const { MAIN_DIA_FILTERS } = require('../../../config/diaFilters');
const Setting = require('../../../models/admin/settings/Setting');

/**
 * GET /api/tags/tire-size
 * Lastik ebatına göre etiket seoUrl'ini bul
 */
router.get('/tire-size', async (req, res) => {
    try {
        const { width, aspectRatio, diameter } = req.query;

        if (!width || !aspectRatio || !diameter) {
            return res.status(400).json({
                success: false,
                message: 'width, aspectRatio ve diameter parametreleri gerekli'
            });
        }

        const seoUrl = `${width}-${aspectRatio}-r${diameter}-lastik-fiyatlari`.toLowerCase();

        let tag = await WebTag.findOne({
            seoUrl: seoUrl,
            type: 'tire_size',
            isActive: true
        });

        if (!tag) {
            tag = await WebTag.findOne({
                seoUrl: { $regex: new RegExp(`^${width}-${aspectRatio}-r${diameter}-`, 'i') },
                type: 'tire_size',
                isActive: true
            });
        }

        if (!tag) {
            return res.json({
                success: true,
                data: null,
                message: 'Bu ebat için etiket bulunamadı'
            });
        }

        res.json({
            success: true,
            data: {
                seoUrl: tag.seoUrl,
                title: tag.title,
                productCount: tag.productCount || 0
            }
        });

    } catch (error) {
        console.error('[Tags API] tire-size error:', error);
        res.status(500).json({
            success: false,
            message: 'Etiket aranırken hata oluştu'
        });
    }
});

/**
 * GET /api/tags/rim-pcd?pcd=5X112
 * PCD ile jant etiketi getir
 */
router.get('/rim-pcd', async (req, res) => {
    try {
        const { pcd } = req.query;

        if (!pcd) {
            return res.status(400).json({
                success: false,
                message: 'PCD parametresi gerekli'
            });
        }

        // URL formatına çevir: 5X114.3 -> 5-1143-jant-fiyatlari
        const urlPcd = pcd.toLowerCase().replace('x', '-').replace('.', '');
        const seoUrl = `${urlPcd}-jant-fiyatlari`;

        const tag = await WebTag.findOne({
            seoUrl: seoUrl,
            type: 'rim_pcd',
            isActive: true
        }).lean();

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Jant etiketi bulunamadı'
            });
        }

        res.json({
            success: true,
            data: {
                seoUrl: tag.seoUrl,
                title: tag.title,
                type: tag.type,
                pcd: tag.pcd,
                productCount: tag.productCount
            }
        });

    } catch (error) {
        console.error('[Tags API] rim-pcd error:', error);
        res.status(500).json({
            success: false,
            message: 'Etiket alınırken hata oluştu'
        });
    }
});

/**
 * GET /api/tags/:slug
 * Slug ile tag getir
 */
router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const tag = await WebTag.findOne({
            seoUrl: slug,
            isActive: true
        });

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Etiket bulunamadı'
            });
        }

        res.json({
            success: true,
            data: tag
        });

    } catch (error) {
        console.error('[Tags API] getBySlug error:', error);
        res.status(500).json({
            success: false,
            message: 'Etiket getirilirken hata oluştu'
        });
    }
});

/**
 * GET /api/tags/:slug/products
 * Tag'e ait ürünleri getir (filtreleme destekli)
 */
router.get('/:slug/products', async (req, res) => {
    try {
        const { slug } = req.params;
        const { page = 1, limit = 12, marka, arac, oem, mevsim, ozellik, yukEndeksi, hizEndeksi, uretim, fiyatMin, fiyatMax } = req.query;

        // Tag'i bul
        const tag = await WebTag.findOne({
            seoUrl: slug,
            isActive: true
        });

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Etiket bulunamadı'
            });
        }

        // Ürün key'leri yoksa boş dön
        if (!tag.products || tag.products.length === 0) {
            return res.json({
                success: true,
                data: {
                    products: [],
                    pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalProducts: 0,
                        limit: parseInt(limit)
                    }
                }
            });
        }

        // Base filter
        const filter = {
            _key: { $in: tag.products },
            'diaData.durum': 'A',
            'syncInfo.diaStatus': 'synced',
            'customData.webVisible': true
        };

        // Merkezi DIA filtrelerini uygula
        MAIN_DIA_FILTERS.forEach(f => {
            const fieldPath = `diaData.${f.field}`;
            if (f.operator === '=') {
                filter[fieldPath] = f.value;
            }
        });
        const hidePricelessSetting = await Setting.findOne({ key: 'hidePricelessProducts', group: 'showcase' }).lean();
        if (hidePricelessSetting?.value === true) {
            filter['diaData.m_birimler.0.fiyat4'] = { $gt: 0 };
        }

        // Ek filtreler için $and
        const andConditions = [];

        // Marka filtresi
        if (marka) {
            const markaList = marka.split(',').map(m => m.trim()).filter(Boolean);
            if (markaList.length > 0) {
                andConditions.push({
                    'diaData.marka': { $in: markaList }
                });
            }
        }
        if (oem) {
            const oemList = oem.split(',').map(o => o.trim()).filter(Boolean);
            if (oemList.length > 0) {
                const oemRegexList = oemList.map(slug =>
                    new RegExp(`^${slug.replace(/-/g, '[\\s-]*')}(?:\\s*\\(|$)`, 'i')
                );
                andConditions.push({
                    'diaData.m_urunOzellikleri': {
                        $elemMatch: {
                            'ozellikadi': 'OEM',
                            'detayaciklama': { $in: oemRegexList }
                        }
                    }
                });
            }
        }
        if (mevsim) {
            const mevsimList = mevsim.split(',').map(m => m.trim().toUpperCase()).filter(Boolean);
            if (mevsimList.length > 0) {
                andConditions.push({
                    'diaData.ozelkod1kodu': { $in: mevsimList }
                });
            }
        }
        if (ozellik) {
            const ozellikList = ozellik.split(',').map(o => o.trim()).filter(Boolean);
            ozellikList.forEach(oz => {
                andConditions.push({
                    'diaData.m_urunOzellikleri': {
                        $elemMatch: {
                            'ozellikadi': oz,
                            'detayaciklama': 'Evet'
                        }
                    }
                });
            });
        }
        if (yukEndeksi) {
            andConditions.push({
                'diaData.m_urunOzellikleri': {
                    $elemMatch: {
                        'ozellikadi': 'Yük Endeksi',
                        'detayaciklama': yukEndeksi
                    }
                }
            });
        }
        if (hizEndeksi) {
            andConditions.push({
                'diaData.m_urunOzellikleri': {
                    $elemMatch: {
                        'ozellikadi': 'Hız Endeksi',
                        'detayaciklama': hizEndeksi
                    }
                }
            });
        }
        if (uretim) {
            const uretimList = uretim.split(',').map(u => u.trim()).filter(Boolean);
            if (uretimList.length > 0) {
                andConditions.push({ 'diaData.ekalan5': { $in: uretimList } });
            }
        }
        if (fiyatMin || fiyatMax) {
            const priceCondition = {
                'diaData.m_birimler': {
                    $elemMatch: {
                        'fiyat4': {}
                    }
                }
            };
            if (fiyatMin) {
                priceCondition['diaData.m_birimler'].$elemMatch['fiyat4'].$gte = parseFloat(fiyatMin);
            }
            if (fiyatMax) {
                priceCondition['diaData.m_birimler'].$elemMatch['fiyat4'].$lte = parseFloat(fiyatMax);
            }

            andConditions.push(priceCondition);
        }

        if (arac && arac !== 'all') {
            andConditions.push({
                'diaData.ozelkod2kodu': arac
            });
        }

        // $and koşullarını uygula
        if (andConditions.length > 0) {
            filter['$and'] = andConditions;
        }

        // Pagination hesapla
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Toplam filtrelenmiş ürün sayısı
        const totalProducts = await WebProduct.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limitNum);

        // Ürünleri getir
        const products = await WebProduct.find(filter)
            .select('_key customData diaData')
            .skip(skip)
            .limit(limitNum)
            .lean();

        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalProducts,
                    limit: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            }
        });

    } catch (error) {
        console.error('[Tags API] getProducts error:', error);
        res.status(500).json({
            success: false,
            message: 'Ürünler getirilirken hata oluştu'
        });
    }
});

module.exports = router;