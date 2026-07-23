// apps/api/src/routes/web/catalog/products.js
const express = require('express');
const router = express.Router();
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const WebBrand = require('../../../models/web/catalog/WebBrand');
const WebWheelSize = require('../../../models/web/catalog/WebWheelSize');
const WebOrder = require('../../../models/web/order/WebOrder');
const ChampionshipTire = require('../../../models/admin/catalog/ChampionshipTire');
const { getProductListFilters, MAIN_DIA_FILTERS } = require('../../../config/diaFilters');
const Setting = require('../../../models/admin/settings/Setting');
/**
 * GET /api/products/similar-by-order/:orderNumber
 * Sipariş edilen lastiklerin: Aynı ebat + Farklı mevsim + Stokta olan benzer ürünleri
 */
router.get('/similar-by-order/:orderNumber', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const limit = parseInt(req.query.limit) || 8;

        // Siparişi bul
        const order = await WebOrder.findOne({ orderNumber }).lean();
        if (!order || !order.items || order.items.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // Sipariş edilen ürünlerin keylerini al
        const orderedKeys = order.items.map(i => String(i.productKey)).filter(Boolean);

        // Sipariş ürünlerinin DIA verilerini çek (ebat + mevsim bilgisi için)
        const orderedProducts = await WebProduct.find(
            { _key: { $in: orderedKeys } },
            { _key: 1, 'diaData.m_urunOzellikleri': 1, 'diaData.ozelkod1kodu': 1 }
        ).lean();

        // Her ürün için ebat + mevsim çıkar
        const orConditions = [];
        for (const p of orderedProducts) {
            const ozellikler = p.diaData?.m_urunOzellikleri || [];
            const genislik = ozellikler.find(o => o.ozellikadi === 'Genişlik')?.detayaciklama;
            const yanak = ozellikler.find(o => o.ozellikadi === 'Yanak')?.detayaciklama;
            const jant = ozellikler.find(o => o.ozellikadi === 'Jant Çapı')?.detayaciklama;
            const mevsim = p.diaData?.ozelkod1kodu;

            if (!genislik || !yanak || !jant) continue;

            orConditions.push({
                $and: [
                    { 'diaData.m_urunOzellikleri': { $elemMatch: { ozellikadi: 'Genişlik', detayaciklama: genislik } } },
                    { 'diaData.m_urunOzellikleri': { $elemMatch: { ozellikadi: 'Yanak', detayaciklama: yanak } } },
                    { 'diaData.m_urunOzellikleri': { $elemMatch: { ozellikadi: 'Jant Çapı', detayaciklama: jant } } },
                    // Farklı mevsim: sipariş mevsimi hariç (case-insensitive)
                    ...(mevsim ? [{ 'diaData.ozelkod1kodu': { $not: new RegExp(`^${mevsim}$`, 'i') } }] : [])
                ]
            });
        }

        if (orConditions.length === 0) {
            return res.json({ success: true, data: [] });
        }

        // Base filter
        const filter = {
            'syncInfo.diaStatus': 'synced',
            'customData.webVisible': true,
            'diaData.durum': 'A',
            'diaData.gercek_stok': { $gt: 0 },
            _key: { $nin: orderedKeys },
            $or: orConditions
        };

        // Merkezi DIA filtrelerini uygula
        MAIN_DIA_FILTERS.forEach(f => {
            if (f.operator === '=') {
                filter[`diaData.${f.field}`] = f.value;
            }
        });

        const products = await WebProduct.aggregate([
            { $match: filter },
            { $sample: { size: limit } },
            { $project: { _key: 1, customData: 1, diaData: 1 } }
        ]);

        res.json({ success: true, data: products });
    } catch (error) {
        console.error('[Similar API] error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});
router.get('/filter', async (req, res) => {
    try {
        const {
            category,
            // Lastik parametreleri
            genislik,
            yukseklik,
            yanak,
            cap,
            jant,
            oem,
            mevsim,
            ozellik,
            yukEndeksi,
            hizEndeksi,
            uretim,
            ozelkod5,
            // Jant parametreleri
            jantCap,
            jantGenisligi,
            bijon,
            bijonSayisi,
            gobekCapi,
            et,
            renk,
            // Ortak parametreler
            arac,
            marka,
            fiyatMin,
            fiyatMax,
            limit,
            // Sıralama parametreleri
            sortBy,
            sortOrder
        } = req.query;

        const pageNum = parseInt(req.query.page) || 1;
        const limitNum = parseInt(limit) || 25;
        const filter = getProductListFilters();

        console.log('=== SORTING DEBUG ===');
        console.log('sortBy:', sortBy);
        console.log('sortOrder:', sortOrder);
        console.log('====================');

        // ==========================================
        // ÜRÜN TİPİ TESPİTİ (kategorideki ürünlerden ozelkod7kodu)
        // ==========================================
        let productType = null;
        let webCategory = null;
        let webCategories = [];
        let isMultiCategory = false;
        let virtualSeasonFilter = null; // yaz-lastikleri / kis-lastikleri / 4-mevsim-lastikler için

        // Mevsim slug → ozelkod1kodu eşlemesi (virtual kategoriler)
        const seasonSlugMap = {
            'yaz-lastikleri': 'Yaz',
            'kis-lastikleri': 'Kış',
            '4-mevsim-lastikler': '4 Mevsim'
        };
        // 5 araç tipi ana kategorisi (virtual multi-category için)
        const vehicleCategorySlugs = [
            'otomobil-lastikleri',
            'elektrikli-arac-lastikleri',
            'suv-lastikleri',
            'ticari-arac-lastikleri',
            'agir-vasita-lastikleri'
        ];

        if (category) {
            const categorySlugs = category.split(',').map(s => s.trim()).filter(Boolean);

            // Tek slug mevsim kategorisi ise → 5 araç tipini multi-category olarak aç + mevsim filtresi uygula
            if (categorySlugs.length === 1 && seasonSlugMap[categorySlugs[0]]) {
                virtualSeasonFilter = seasonSlugMap[categorySlugs[0]];
                isMultiCategory = true;
                webCategories = await WebCategory.find({
                    slug: { $in: vehicleCategorySlugs },
                    webVisible: true
                }).lean();
            } else if (categorySlugs.length > 1) {
                isMultiCategory = true;
                webCategories = await WebCategory.find({
                    slug: { $in: categorySlugs },
                    webVisible: true
                }).lean();
                // Multi-category: productType tespiti yapılmaz, her kategorinin ozelkod7kodu farklı olabilir
            } else {
                webCategory = await WebCategory.findOne({
                    slug: categorySlugs[0],
                    webVisible: true
                }).lean();

                if (webCategory && webCategory.diaCategory) {
                    const diaLevel = webCategory.diaLevel || 'kategori_aciklama_2';
                    const sampleProduct = await WebProduct.findOne({
                        'diaData.m_kategoriler': {
                            $elemMatch: {
                                [diaLevel]: webCategory.diaCategory
                            }
                        },
                        'diaData.ozelkod7kodu': { $exists: true, $ne: '' }
                    }).select('diaData.ozelkod7kodu').lean();

                    if (sampleProduct?.diaData?.ozelkod7kodu) {
                        productType = sampleProduct.diaData.ozelkod7kodu;
                    }
                }
            }
        }

        if ((jantCap || bijon) && !isMultiCategory) {
            productType = 'JANT';
        }
        if (productType && !isMultiCategory) {
            filter['diaData.ozelkod7kodu'] = productType;
        }

        const isJantCategory = productType === 'JANT';

        const hidePricelessSetting = await Setting.findOne({ key: 'hidePricelessProducts', group: 'showcase' }).lean();
        if (hidePricelessSetting?.value === true) {
            filter['diaData.m_birimler.0.fiyat4'] = { $gt: 0 };
        }

        const andConditions = [];
        if (webCategory?.diaCategory) {
            const diaLevel = webCategory.diaLevel || 'kategori_aciklama_2';
            andConditions.push({
                'diaData.m_kategoriler': {
                    $elemMatch: {
                        [diaLevel]: webCategory.diaCategory
                    }
                }
            });
        } else if (webCategories.length > 0) {
            const orClauses = webCategories
                .filter(c => c.diaCategory)
                .map(c => ({
                    'diaData.m_kategoriler': {
                        $elemMatch: {
                            [c.diaLevel || 'kategori_aciklama_2']: c.diaCategory
                        }
                    }
                }));
            if (orClauses.length > 0) {
                andConditions.push({ $or: orClauses });
            }
        }
        // ==========================================
        // LASTİK FİLTRELERİ
        // ==========================================
        if (!isJantCategory) {
            // Genişlik filtresi
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

            // Yanak filtresi
            const yanakValue = yanak || yukseklik;
            if (yanakValue) {
                andConditions.push({
                    'diaData.m_urunOzellikleri': {
                        $elemMatch: {
                            ozellikadi: 'Yanak',
                            detayaciklama: yanakValue
                        }
                    }
                });
            }

            // Jant çapı filtresi
            const jantValue = jant || cap;
            if (jantValue) {
                andConditions.push({
                    'diaData.m_urunOzellikleri': {
                        $elemMatch: {
                            ozellikadi: 'Jant Çapı',
                            detayaciklama: { $regex: new RegExp(`^R?${jantValue}C?$|^${jantValue}\\s*İnç$`, 'i') }
                        }
                    }
                });
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
            // Mevsim filtresi (kullanıcı seçimi virtualSeasonFilter'ı override eder)
            if (mevsim) {
                const mevsimList = mevsim.split(',').map(m => m.trim()).filter(Boolean);
                if (mevsimList.length > 0) {
                    andConditions.push({
                        'diaData.ozelkod1kodu': {
                            $in: mevsimList.map(m => new RegExp(`^${m}$`, 'i'))
                        }
                    });
                }
            } else if (virtualSeasonFilter) {
                andConditions.push({
                    'diaData.ozelkod1kodu': virtualSeasonFilter
                });
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

            // Yük Endeksi filtresi
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

            // Hız Endeksi filtresi
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

            // Üretim tarihi filtresi
            if (uretim) {
                const uretimList = uretim.split(',').map(u => u.trim()).filter(Boolean);
                if (uretimList.length > 0) {
                    andConditions.push({ 'diaData.ekalan5': { $in: uretimList } });
                }
            }
        }

        // ==========================================
        // JANT FİLTRELERİ (m_urunOzellikleri üzerinden)
        // ==========================================
        if (isJantCategory) {
            const pushRimFilter = (ozellikadi, value) => {
                if (!value) return;
                andConditions.push({
                    'diaData.m_urunOzellikleri': {
                        $elemMatch: {
                            ozellikadi,
                            detayaciklama: value
                        }
                    }
                });
            };

            const jantCapValue = jantCap || jant || cap;
            if (jantCapValue) {
                const jantCapNumeric = String(jantCapValue).replace(/[^\d]/g, '');
                andConditions.push({
                    'diaData.m_urunOzellikleri': {
                        $elemMatch: {
                            ozellikadi: 'Jant Çapı',
                            detayaciklama: { $regex: new RegExp(`^${jantCapNumeric}\\s*İnç$`, 'i') }
                        }
                    }
                });
            }

            pushRimFilter('Jant Genişliği', jantGenisligi);
            pushRimFilter('Bijon Sayısı', bijonSayisi);
            pushRimFilter('Bijon Aralığı', bijon);
            pushRimFilter('Göbek Çapı', gobekCapi);
            pushRimFilter('ET', et);
            pushRimFilter('Renk', renk);
        }

        // ==========================================
        // ORTAK FİLTRELER
        // ==========================================
        // Araç tipi filtresi
        if (arac && arac !== 'all') {
            andConditions.push({
                'diaData.ozelkod2kodu': arac
            });
        }

        // Marka filtresi
        if (marka) {
            const markaList = marka.split(',').map(m => m.trim()).filter(Boolean);
            if (markaList.length > 0) {
                andConditions.push({
                    'diaData.marka': { $in: markaList }
                });
            }
        }
        if (ozelkod5) {
            andConditions.push({
                'diaData.ozelkod5kodu': ozelkod5
            });
        }

        // Fiyat filtresi
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

        // Sıralama mantığı:
        // - Default (sortBy yok): 4 katmanlı (Bizim Stoklu > XML Stoklu > Bizim Stoksuz > XML Stoksuz)
        // - sortBy belirtildiyse: 4 katman tamamen iptal, sadece kullanıcı seçimine göre sırala
        // - Fiyat sıralamasında frontend ile aynı mantık: shippingIncludedPrice > webPrice > fiyat4
        const aggregatePipeline = [{ $match: filter }];

        if (sortBy === 'price') {
            // Fiyata göre — 2 katman: önce stoklular, sonra stoksuzlar
            aggregatePipeline.push({
                $addFields: {
                    _hasStock: { $gt: [{ $ifNull: ['$diaData.gercek_stok', 0] }, 0] },
                    _sortPrice: {
                        $let: {
                            vars: {
                                shipPrice: { $ifNull: ['$customData.shippingIncludedPrice', 0] },
                                webPrice: { $ifNull: ['$customData.webPrice', 0] },
                                fiyat4: { $ifNull: [{ $arrayElemAt: ['$diaData.m_birimler.fiyat4', 0] }, 0] }
                            },
                            in: {
                                $cond: [
                                    { $gt: ['$$shipPrice', 0] },
                                    '$$shipPrice',
                                    { $cond: [{ $gt: ['$$webPrice', 0] }, '$$webPrice', '$$fiyat4'] }
                                ]
                            }
                        }
                    }
                }
            });
            aggregatePipeline.push({
                $addFields: {
                    sortPriority: { $cond: ['$_hasStock', 1, 2] }
                }
            });
            aggregatePipeline.push({
                $sort: { sortPriority: 1, _sortPrice: sortOrder === 'asc' ? 1 : -1 }
            });
        } else if (sortBy === 'sales') {
            aggregatePipeline.push({ $sort: { 'customData.salesCount': -1, 'diaData.gercek_stok': -1 } });
        } else if (sortBy === 'rating') {
            aggregatePipeline.push({ $sort: { 'customData.reviewStats.averageRating': -1, 'customData.reviewStats.reviewCount': -1 } });
        } else if (sortBy === 'reviews') {
            aggregatePipeline.push({ $sort: { 'customData.reviewStats.reviewCount': -1, 'customData.reviewStats.averageRating': -1 } });
        } else {
            // Default 4 katmanlı sıralama
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
                $sort: { sortPriority: 1, 'diaData.gercek_stok': -1, 'createdAt': -1 }
            });
        }

        aggregatePipeline.push(
            { $skip: skip },
            { $limit: limitNum },
            { $project: { _key: 1, customData: 1, diaData: 1 } }
        );

        const products = await WebProduct.aggregate(aggregatePipeline);

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
router.get('/championships/:productKey', async (req, res) => {
    try {
        const championships = await ChampionshipTire.find({
            productKey: req.params.productKey
        }).select('name rank').lean();

        res.json({ success: true, data: championships });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Şampiyonluk bilgisi alınamadı' });
    }
});
router.get('/:slug/wheelsize', async (req, res) => {
    try {
        const product = await WebProduct.findOne({
            $or: [
                { 'customData.seoUrl': req.params.slug },
                { '_key': req.params.slug }
            ]
        }).select('_key');

        if (!product) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
        }

        const wheelSizeDoc = await WebWheelSize.findOne({
            productKeys: product._key
        }).lean();

        if (!wheelSizeDoc) {
            return res.json({ success: true, data: null });
        }

        const wheelSize = {
            patternSlug: wheelSizeDoc.patternSlug,
            patternName: wheelSizeDoc.patternName,
            brandSlug: wheelSizeDoc.brandSlug,
            weThink: wheelSizeDoc.wheelsizeData?.ratings?.weThink || [],
            ratings: {
                score: wheelSizeDoc.wheelsizeData?.ratings?.score || null,
                popularity: wheelSizeDoc.wheelsizeData?.ratings?.popularity || null,
                tags: wheelSizeDoc.wheelsizeData?.ratings?.tags || []
            },
            buyNotBuy: wheelSizeDoc.wheelsizeData?.buyNotBuy || null,
            materials: wheelSizeDoc.wheelsizeData?.materials || [] // EKLE
        };

        res.json({ success: true, data: wheelSize });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        const product = await WebProduct.findOne({
            $or: [
                { 'customData.seoUrl': slug },
                { '_key': slug }
            ],
            ...getProductListFilters()
        }).lean();

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }

        // Marka customName kontrolü
        const marka = product.diaData?.marka;
        if (marka) {
            const webBrand = await WebBrand.findOne({
                diaBrand: { $regex: new RegExp(`^${marka}$`, 'i') }
            }).select('customName name').lean();

            if (webBrand && webBrand.customName) {
                product.customData = product.customData || {};
                product.customData.brandDisplayName = webBrand.customName;
                if (product.diaData?.aciklama) {
                    product.diaData.aciklama = product.diaData.aciklama.replace(
                        new RegExp(marka, 'gi'),
                        webBrand.customName
                    );
                }
            }
        }

        res.json({
            success: true,
            data: product
        });

    } catch (error) {
        console.error('Ürün detay hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ürün yüklenirken hata oluştu'
        });
    }
});
module.exports = router;