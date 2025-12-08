// apps/api/src/routes/web/catalog/products.js
const express = require('express');
const router = express.Router();
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const { MAIN_DIA_FILTERS } = require('../../../config/diaFilters');

/**
 * DIA filtrelerini MongoDB match formatına çevir
 */
function buildBaseFilter() {
    const filter = {
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

    return filter;
}

router.get('/filter', async (req, res) => {
    try {
        const {
            category,
            genislik,
            yukseklik,
            cap,
            arac,
            marka,
            oem,
            mevsim,
            ozellik,
            yukEndeksi,
            hizEndeksi,
            uretim,
            fiyatMin,
            fiyatMax,
            limit
        } = req.query;

        const pageNum = parseInt(req.query.page) || 1;
        const limitNum = parseInt(limit) || 25;
        const filter = buildBaseFilter();
        if (category) {
            const webCategory = await WebCategory.findOne({
                slug: category,
                webVisible: true
            }).lean();

            if (webCategory && webCategory.diaCategory) {
                const diaLevel = webCategory.diaLevel || 'kategori_aciklama_2';
                filter['diaData.m_kategoriler'] = {
                    $elemMatch: {
                        [diaLevel]: webCategory.diaCategory
                    }
                };
            }
        }
        const andConditions = [];

        if (genislik) {
            andConditions.push({
                'diaData.m_urunOzellikleri': {
                    $elemMatch: {
                        ozellikadi: 'Genişlik',
                        detayaciklama: genislik
                    }
                }
            });
        }

        if (yukseklik) {
            andConditions.push({
                'diaData.m_urunOzellikleri': {
                    $elemMatch: {
                        ozellikadi: 'Yanak',
                        detayaciklama: yukseklik
                    }
                }
            });
        }

        if (cap) {
            andConditions.push({
                'diaData.m_urunOzellikleri': {
                    $elemMatch: {
                        ozellikadi: 'Jant Çapı',
                        detayaciklama: { $regex: new RegExp(`^R?${cap}C?$|^${cap}\\s*İnç$`, 'i') }
                    }
                }
            });
        }
        if (arac && arac !== 'all') {
            andConditions.push({
                'diaData.ozelkod2kodu': arac
            });
        }
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
        if (andConditions.length > 0) {
            filter['$and'] = andConditions;
        }

        const skip = (pageNum - 1) * limitNum;
        const totalProducts = await WebProduct.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limitNum);

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
                    productsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            }
        });
    } catch (error) {
        console.error('Product filter error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;