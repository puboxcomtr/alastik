const express = require('express');
const router = express.Router();
const WebShowcase = require('../../../models/web/settings/WebShowcase');
const WebProduct = require('../../../models/web/catalog/WebProduct');

// Yardımcı fonksiyon - ürünleri _key ile bul
const getProductsByKeys = async (keys) => {
    if (!keys || keys.length === 0) return [];

    const products = await WebProduct.find({ _key: { $in: keys } });
    const productMap = {};
    products.forEach(p => {
        productMap[p._key] = p;
    });
    return productMap;
};

router.get('/', async (req, res) => {
    try {
        const { search, is_active, sort_by = 'order', sort_order = 'asc' } = req.query;

        const filter = {};

        if (search) {
            filter.title = { $regex: search, $options: 'i' };
        }

        if (is_active !== undefined && is_active !== '') {
            filter.isActive = is_active === 'true';
        }

        const sortOptions = {};
        sortOptions[sort_by] = sort_order === 'desc' ? -1 : 1;

        const showcases = await WebShowcase.find(filter).sort(sortOptions);

        // Tüm ürün key'lerini topla
        const allProductKeys = [];
        showcases.forEach(s => {
            s.products.forEach(p => {
                if (p.productId && !allProductKeys.includes(p.productId)) {
                    allProductKeys.push(p.productId);
                }
            });
        });

        // Ürünleri getir
        const productMap = await getProductsByKeys(allProductKeys);

        const formattedShowcases = showcases.map(showcase => ({
            id: showcase._id,
            title: showcase.title,
            order: showcase.order,
            itemsPerRow: showcase.itemsPerRow,
            isActive: showcase.isActive,
            productCount: showcase.products.length,
            products: showcase.products.map(p => {
                const product = productMap[p.productId];
                return {
                    id: p.productId,
                    name: product?.diaData?.aciklama || 'Ürün bulunamadı',
                    sku: product?.diaData?.stokkartkodu || '-',
                    brand: product?.diaData?.marka || '-',
                    stock: product?.diaData?.gercek_stok || 0,
                    order: p.order
                };
            }),
            createdAt: showcase.createdAt,
            updatedAt: showcase.updatedAt
        }));

        res.json({
            success: true,
            data: formattedShowcases,
            meta: {
                total: formattedShowcases.length
            }
        });

    } catch (error) {
        console.error('Vitrin listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Vitrinler yüklenirken hata oluştu',
            error: error.message
        });
    }
});

// Tek vitrin detayı
router.get('/:id', async (req, res) => {
    try {
        const showcase = await WebShowcase.findById(req.params.id);

        if (!showcase) {
            return res.status(404).json({
                success: false,
                message: 'Vitrin bulunamadı'
            });
        }

        // Ürün key'lerini topla
        const productKeys = showcase.products.map(p => p.productId);
        const productMap = await getProductsByKeys(productKeys);

        res.json({
            success: true,
            data: {
                id: showcase._id,
                title: showcase.title,
                order: showcase.order,
                itemsPerRow: showcase.itemsPerRow,
                isActive: showcase.isActive,
                products: showcase.products.map(p => {
                    const product = productMap[p.productId];
                    return {
                        id: p.productId,
                        name: product?.diaData?.aciklama || 'Ürün bulunamadı',
                        sku: product?.diaData?.stokkartkodu || '-',
                        brand: product?.diaData?.marka || '-',
                        stock: product?.diaData?.gercek_stok || 0,
                        image: product?.diaData?.m_resimler?.[0]?.aws_url || null,
                        order: p.order
                    };
                }),
                createdAt: showcase.createdAt,
                updatedAt: showcase.updatedAt
            }
        });

    } catch (error) {
        console.error('Vitrin detay hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Vitrin yüklenirken hata oluştu',
            error: error.message
        });
    }
});

// Yeni vitrin oluştur
router.post('/', async (req, res) => {
    try {
        const { title, order, itemsPerRow, isActive, products } = req.body;

        if (!title || title.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Vitrin başlığı zorunludur'
            });
        }

        // Ürünleri formatla
        let formattedProducts = [];

        if (products && Array.isArray(products) && products.length > 0) {
            formattedProducts = products.map((productId, index) => ({
                productId: String(productId),
                order: index
            }));
        }

        const showcase = new WebShowcase({
            title: title.trim(),
            order: parseInt(order) || 0,
            itemsPerRow: parseInt(itemsPerRow) || 4,
            isActive: isActive !== false,
            products: formattedProducts
        });

        await showcase.save();

        res.status(201).json({
            success: true,
            message: 'Vitrin başarıyla oluşturuldu',
            data: {
                id: showcase._id,
                title: showcase.title
            }
        });

    } catch (error) {
        console.error('Vitrin oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Vitrin oluşturulurken hata oluştu',
            error: error.message
        });
    }
});

// Vitrin güncelle
router.put('/:id', async (req, res) => {
    try {
        const { title, order, itemsPerRow, isActive, products } = req.body;

        console.log('Güncelleme isteği:', { id: req.params.id, title, order, itemsPerRow, isActive, products });

        const showcase = await WebShowcase.findById(req.params.id);

        if (!showcase) {
            return res.status(404).json({
                success: false,
                message: 'Vitrin bulunamadı'
            });
        }

        if (title !== undefined) showcase.title = title.trim();
        if (order !== undefined) showcase.order = parseInt(order) || 0;
        if (itemsPerRow !== undefined) showcase.itemsPerRow = parseInt(itemsPerRow) || 4;
        if (isActive !== undefined) showcase.isActive = isActive;

        if (products !== undefined && Array.isArray(products)) {
            showcase.products = products.map((productId, index) => ({
                productId: String(productId),
                order: index
            }));
        }

        console.log('Kaydedilecek showcase:', showcase);

        await showcase.save();

        console.log('Başarıyla kaydedildi');

        res.json({
            success: true,
            message: 'Vitrin başarıyla güncellendi',
            data: {
                id: showcase._id,
                title: showcase.title
            }
        });

    } catch (error) {
        console.error('Vitrin güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Vitrin güncellenirken hata oluştu',
            error: error.message
        });
    }
});

// Vitrin sil
router.delete('/:id', async (req, res) => {
    try {
        const showcase = await WebShowcase.findByIdAndDelete(req.params.id);

        if (!showcase) {
            return res.status(404).json({
                success: false,
                message: 'Vitrin bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Vitrin başarıyla silindi'
        });

    } catch (error) {
        console.error('Vitrin silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Vitrin silinirken hata oluştu',
            error: error.message
        });
    }
});

// Vitrin durumunu değiştir (hızlı toggle)
router.patch('/:id/toggle', async (req, res) => {
    try {
        const showcase = await WebShowcase.findById(req.params.id);

        if (!showcase) {
            return res.status(404).json({
                success: false,
                message: 'Vitrin bulunamadı'
            });
        }

        showcase.isActive = !showcase.isActive;
        await showcase.save();

        res.json({
            success: true,
            message: showcase.isActive ? 'Vitrin aktif edildi' : 'Vitrin pasif edildi',
            data: {
                id: showcase._id,
                isActive: showcase.isActive
            }
        });

    } catch (error) {
        console.error('Vitrin toggle hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Vitrin durumu değiştirilirken hata oluştu',
            error: error.message
        });
    }
});

// Frontend için aktif vitrinleri getir (public)
router.get('/public/active', async (req, res) => {
    try {
        const showcases = await WebShowcase.find({ isActive: true }).sort({ order: 1 });

        // Tüm ürün key'lerini topla
        const allProductKeys = [];
        showcases.forEach(s => {
            s.products.forEach(p => {
                if (p.productId && !allProductKeys.includes(p.productId)) {
                    allProductKeys.push(p.productId);
                }
            });
        });

        // Ürünleri getir
        const productMap = await getProductsByKeys(allProductKeys);

        const formattedShowcases = showcases.map(showcase => ({
            id: showcase._id,
            title: showcase.title,
            itemsPerRow: showcase.itemsPerRow,
            products: showcase.products
                .filter(p => productMap[p.productId])
                .map(p => {
                    const product = productMap[p.productId];
                    return {
                        id: product._key,
                        name: product.diaData?.aciklama || '',
                        sku: product.diaData?.stokkartkodu || '',
                        brand: product.diaData?.marka || '',
                        stock: product.diaData?.gercek_stok || 0,
                        price: product.customData?.webPrice || product.diaData?.m_birimler?.[0]?.fiyat1 || 0,
                        image: product.customData?.featuredImage || product.diaData?.m_resimler?.[0]?.aws_url || null,
                        seoUrl: product.customData?.seoUrl || ''
                    };
                })
        }));

        res.json({
            success: true,
            data: formattedShowcases
        });

    } catch (error) {
        console.error('Public vitrin hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Vitrinler yüklenirken hata oluştu'
        });
    }
});

// Anasayfa vitrinleri - sitesettings'den seçilen vitrinleri getir
router.get('/public/homepage', async (req, res) => {
    try {
        const SiteSetting = require('../../../models/admin/settings/SiteSetting');

        const themeSetting = await SiteSetting.findOne({ key: 'theme' });
        const themeValue = themeSetting?.value || {};

        // 5 vitrin konfigürasyonu
        const showcaseConfigs = [
            {
                key: 'first',
                showcaseId: themeValue.showcaseFirst,
                title: themeValue.showcasenameFirst || '',
                subtitle: themeValue.showcasesubFirst || ''
            },
            {
                key: 'second',
                showcaseId: themeValue.showcaseSecond,
                title: themeValue.showcasenameSecond || '',
                subtitle: themeValue.showcasesubSecond || ''
            },
            {
                key: 'third',
                showcaseId: themeValue.showcaseThird,
                title: themeValue.showcasenameThird || '',
                subtitle: themeValue.showcasesubThird || ''
            },
            {
                key: 'fourth',
                showcaseId: themeValue.showcaseFourth,
                title: themeValue.showcasenameFourth || '',
                subtitle: themeValue.showcasesubFourth || ''
            },
            {
                key: 'fifth',
                showcaseId: themeValue.showcaseFifth,
                title: themeValue.showcasenameFifth || '',
                subtitle: themeValue.showcasesubFifth || ''
            }
        ];

        const showcaseIds = showcaseConfigs
            .filter(c => c.showcaseId && c.showcaseId !== '')
            .map(c => c.showcaseId);

        if (showcaseIds.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const showcases = await WebShowcase.find({
            _id: { $in: showcaseIds },
            isActive: true
        });

        const allProductKeys = [];
        showcases.forEach(s => {
            s.products.forEach(p => {
                if (p.productId && !allProductKeys.includes(p.productId)) {
                    allProductKeys.push(p.productId);
                }
            });
        });

        const productMap = await getProductsByKeys(allProductKeys);

        const result = showcaseConfigs
            .filter(config => config.showcaseId && config.showcaseId !== '')
            .map(config => {
                const showcase = showcases.find(s => s._id.toString() === config.showcaseId);
                if (!showcase) return null;

                return {
                    key: config.key,
                    title: config.title,
                    subtitle: config.subtitle,
                    itemsPerRow: showcase.itemsPerRow,
                    products: showcase.products
                        .filter(p => productMap[p.productId])
                        .sort((a, b) => a.order - b.order)
                        .map(p => {
                            const product = productMap[p.productId];
                            return {
                                _key: product._key,
                                diaData: product.diaData,
                                customData: product.customData,
                                syncInfo: product.syncInfo
                            };
                        })
                };
            })
            .filter(item => item !== null);

        res.json({ success: true, data: result });

    } catch (error) {
        console.error('Anasayfa vitrin hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Vitrinler yüklenirken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;