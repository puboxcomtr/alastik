
const express = require('express');
const { applySitePricingMany, salePriceExpr, sortPriceExpr, pricedCondition, priceRangeCondition } = require('../../../utils/sitePricing');
const router = express.Router();

const WebTag = require('../../../models/web/catalog/WebTag');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const { MAIN_DIA_FILTERS, getSiteVisibilityFilter } = require('../../../config/diaFilters');
const Setting = require('../../../models/admin/settings/Setting');

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
            site: req.site,
            seoUrl: seoUrl,
            type: 'tire_size',
            isActive: true
        });

        if (!tag) {
            tag = await WebTag.findOne({
                site: req.site,
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

router.get('/rim-pcd', async (req, res) => {
    try {
        const { pcd } = req.query;

        if (!pcd) {
            return res.status(400).json({
                success: false,
                message: 'PCD parametresi gerekli'
            });
        }

        const urlPcd = pcd.toLowerCase().replace('x', '-').replace('.', '');
        const seoUrl = `${urlPcd}-jant-fiyatlari`;

        const tag = await WebTag.findOne({
            site: req.site,
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

router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const tag = await WebTag.findOne({
            site: req.site,
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

router.get('/:slug/products', async (req, res) => {
    try {
        const { slug } = req.params;
        const { page = 1, limit = 12, marka, arac, oem, mevsim, ozellik, yukEndeksi, hizEndeksi, uretim, fiyatMin, fiyatMax, sortBy, sortOrder, durum } = req.query;

        const tag = await WebTag.findOne({
            site: req.site,
            seoUrl: slug,
            isActive: true
        });

        if (!tag) {
            return res.status(404).json({
                success: false,
                message: 'Etiket bulunamadı'
            });
        }

        if (!tag.products || tag.products.length === 0) {
            return res.json({
                success: true,
                data: {
                    products: [],
                    counts: { sifir: 0, ikinciEl: 0 },
                    pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalProducts: 0,
                        limit: parseInt(limit)
                    }
                }
            });
        }

        const filter = {
            _key: { $in: tag.products },
            'diaData.durum': 'A',
            'syncInfo.diaStatus': 'synced',
            ...(req.site ? { sites: req.site } : {}),
            $and: [getSiteVisibilityFilter(req.site)]
        };

        MAIN_DIA_FILTERS.forEach(f => {
            const fieldPath = `diaData.${f.field}`;
            if (f.operator === '=') {
                filter[fieldPath] = f.value;
            }
        });
        const hidePricelessSetting = await Setting.findOne({ key: 'hidePricelessProducts', group: 'showcase', site: req.site }).lean();
        if (hidePricelessSetting?.value === true) {
            Object.assign(filter, pricedCondition(req.site));
        }

        const andConditions = [];

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
            const mevsimList = mevsim.split(',').map(m => m.trim()).filter(Boolean);
            if (mevsimList.length > 0) {
                const mevsimRegexList = mevsimList.map(m => new RegExp(`^${m}$`, 'i'));
                andConditions.push({
                    'diaData.ozelkod1kodu': { $in: mevsimRegexList }
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
            const priceCondition = priceRangeCondition(req.site, fiyatMin, fiyatMax);

            andConditions.push(priceCondition);
        }

        if (arac && arac !== 'all') {
            andConditions.push({
                'diaData.ozelkod2kodu': arac
            });
        }

        if (andConditions.length > 0) {
            filter['$and'] = [...filter['$and'], ...andConditions];
        }

        const secondHandCondition = {
            'diaData.m_kategoriler': { $elemMatch: { kategori_aciklama_1: { $regex: '^İkinci El' } } }
        };
        const brandNewCondition = {
            'diaData.m_kategoriler': { $not: { $elemMatch: { kategori_aciklama_1: { $regex: '^İkinci El' } } } }
        };

        const [sifirCount, ikinciElCount] = await Promise.all([
            WebProduct.countDocuments({ ...filter, $and: [...filter['$and'], brandNewCondition] }),
            WebProduct.countDocuments({ ...filter, $and: [...filter['$and'], secondHandCondition] })
        ]);

        filter['$and'] = [...filter['$and'], durum === 'ikinci-el' ? secondHandCondition : brandNewCondition];

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const totalProducts = durum === 'ikinci-el' ? ikinciElCount : sifirCount;
        const totalPages = Math.ceil(totalProducts / limitNum);

        const aggregatePipeline = [{ $match: filter }];

        if (sortBy === 'price') {
            aggregatePipeline.push({
                $addFields: {
                    _hasStock: { $gt: [{ $ifNull: ['$diaData.gercek_stok', 0] }, 0] },
                    _sortPrice: sortPriceExpr(req.site)
                }
            });
            aggregatePipeline.push({
                $addFields: {
                    sortPriority: { $cond: ['$_hasStock', 1, 2] }
                }
            });
            aggregatePipeline.push({
                $sort: { sortPriority: 1, 'diaData.gercek_stok': -1, 'createdAt': -1 }
            });
        } else {
            aggregatePipeline.push({
                $addFields: {
                    _isXml: { $eq: ['$syncInfo.syncSource', 'xml_integration'] },
                    _hasStock: { $gt: [{ $ifNull: ['$diaData.gercek_stok', 0] }, 0] }
                }
            });
            aggregatePipeline.push({
                $addFields: {
                    sortPriority: {
                        $switch: {
                            branches: [
                                { case: { $and: ['$_hasStock', { $not: '$_isXml' }] }, then: 1 },
                                { case: { $and: ['$_hasStock', '$_isXml'] }, then: 2 },
                                { case: { $and: [{ $not: '$_hasStock' }, { $not: '$_isXml' }] }, then: 3 }
                            ],
                            default: 4
                        }
                    }
                }
            });
            aggregatePipeline.push({
                $sort: { sortPriority: 1, 'diaData.gercek_stok': -1 }
            });
        }

        aggregatePipeline.push(
            { $skip: skip },
            { $limit: limitNum },
            { $project: { _key: 1, customData: 1, diaData: 1, syncInfo: 1 } }
        );

        const products = await WebProduct.aggregate(aggregatePipeline);

        applySitePricingMany(products, req.site);

        for (const product of products) {
            const siteDescription = product.customData?.siteDescriptions?.[req.site];
            if (siteDescription) product.customData.customDescription = siteDescription;
        }

        res.json({
            success: true,
            data: {
                products,
                counts: { sifir: sifirCount, ikinciEl: ikinciElCount },
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