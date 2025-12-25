// apps/api/src/routes/web/catalog/products.js
const express = require('express');
const router = express.Router();
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const { getProductListFilters } = require('../../../config/diaFilters');


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
            bijon,
            // Ortak parametreler
            arac,
            marka,
            fiyatMin,
            fiyatMax,
            limit
        } = req.query;

        const pageNum = parseInt(req.query.page) || 1;
        const limitNum = parseInt(limit) || 25;
        const filter = getProductListFilters();

        // ==========================================
        // ÜRÜN TİPİ TESPİTİ (kategorideki ürünlerden ozelkod7kodu)
        // ==========================================
        let productType = null;
        let webCategory = null;

        if (category) {
            webCategory = await WebCategory.findOne({
                slug: category,
                webVisible: true
            }).lean();

            if (webCategory && webCategory.diaCategory) {
                const diaLevel = webCategory.diaLevel || 'kategori_aciklama_2';

                // Bu kategorideki bir ürünün ozelkod7kodu değerini al
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

        // Jant parametreleri geldiyse JANT olarak zorla
        if (jantCap || bijon) {
            productType = 'JANT';
        }

        // productType bulunduysa filtre uygula
        if (productType) {
            filter['diaData.ozelkod7kodu'] = productType;
        }

        const isJantCategory = productType === 'JANT';

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

            // OEM filtresi
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

            // Mevsim filtresi
            if (mevsim) {
                const mevsimList = mevsim.split(',').map(m => m.trim().toUpperCase()).filter(Boolean);
                if (mevsimList.length > 0) {
                    andConditions.push({
                        'diaData.ozelkod1kodu': { $in: mevsimList }
                    });
                }
            }

            // Özellik filtresi (XL, Seal, Run Flat)
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
        // JANT FİLTRELERİ
        // ==========================================
        if (isJantCategory) {
            // Jant çapı filtresi - ozelkod4kodu
            const jantCapValue = jantCap || jant || cap;
            if (jantCapValue) {
                andConditions.push({
                    'diaData.ozelkod4kodu': jantCapValue
                });
            }

            // Bijon aralığı filtresi - ozelkod3kodu
            if (bijon) {
                andConditions.push({
                    'diaData.ozelkod3kodu': bijon.toUpperCase()
                });
            }
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