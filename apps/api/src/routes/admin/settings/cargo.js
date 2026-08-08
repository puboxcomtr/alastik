const express = require('express');
const router = express.Router();
const Cargo = require('../../../models/admin/settings/Cargo');
const XmlShippingPriceUpdaterService = require('../../../services/web/cargo/XmlShippingPriceUpdaterService');

// XML kargo değişince ürünlerin kargo dahil fiyatlarını güncelle (fire-and-forget)
const triggerShippingUpdate = (cargo) => {
    if (cargo?.productType !== 'xml_integration') return;
    XmlShippingPriceUpdaterService.updateAll(cargo.site)
        .then(r => console.log('[Cargo] Kargo dahil fiyatlar güncellendi:', r.updated))
        .catch(e => console.error('[Cargo] Fiyat güncelleme hatası:', e.message));
};

// Liste
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search = '',
            isActive,
            sortBy = 'webOrder',
            sortOrder = 'desc'
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Yalnızca seçili sitenin kargoları
        const filter = { site: req.site };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } }
            ];
        }

        if (isActive !== undefined && isActive !== '') {
            filter.isActive = isActive === 'true';
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [cargos, total] = await Promise.all([
            Cargo.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
            Cargo.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: cargos,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Cargo list error:', error);
        res.status(500).json({
            success: false,
            message: 'Kargo listesi alınırken hata oluştu'
        });
    }
});

// Tekil
router.get('/:id', async (req, res) => {
    try {
        const cargo = await Cargo.findOne({ _id: req.params.id, site: req.site }).lean();

        if (!cargo) {
            return res.status(404).json({
                success: false,
                message: 'Kargo firması bulunamadı'
            });
        }

        res.json({ success: true, data: cargo });
    } catch (error) {
        console.error('Cargo detail error:', error);
        res.status(500).json({
            success: false,
            message: 'Kargo detayı alınırken hata oluştu'
        });
    }
});

// Ekle
router.post('/', async (req, res) => {
    try {
        const {
            name,
            code,
            logo,
            isActive,
            webOrder,
            memberGroups,
            productType,
            paymentType,
            fixedPrice,
            freeShippingThreshold,
            freeShippingDesiLimit
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Kargo adı zorunludur'
            });
        }

        if (!code || !code.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Kargo kodu zorunludur'
            });
        }

        if (!Array.isArray(memberGroups) || memberGroups.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'En az bir üye grubu seçilmelidir'
            });
        }

        if (!['dia_api', 'xml_integration'].includes(productType)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir ürün tipi seçiniz'
            });
        }

        if (!['sender', 'receiver'].includes(paymentType)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir ödeme tipi seçiniz'
            });
        }

        if (fixedPrice === undefined || Number(fixedPrice) < 0) {
            return res.status(400).json({
                success: false,
                message: 'Sabit fiyat zorunludur'
            });
        }

        if (freeShippingThreshold === undefined || Number(freeShippingThreshold) < 0) {
            return res.status(400).json({
                success: false,
                message: 'Ücretsiz kargo tutarı zorunludur'
            });
        }

        if (freeShippingDesiLimit === undefined || Number(freeShippingDesiLimit) < 0) {
            return res.status(400).json({
                success: false,
                message: 'Ücretsiz kargo desi limiti zorunludur'
            });
        }

        const existing = await Cargo.findOne({ code: code.toLowerCase(), site: req.site });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Bu kargo kodu zaten kullanılıyor'
            });
        }

        const cargo = await Cargo.create({
            site: req.site,
            name: name.trim(),
            code: code.toLowerCase().trim(),
            logo: logo || '',
            isActive: isActive !== false,
            webOrder: Number(webOrder) || 0,
            memberGroups,
            productType,
            paymentType,
            fixedPrice: Number(fixedPrice) || 0,
            freeShippingThreshold: Number(freeShippingThreshold) || 0,
            freeShippingDesiLimit: Number(freeShippingDesiLimit) || 0
        });

        triggerShippingUpdate(cargo);
        res.status(201).json({
            success: true,
            message: 'Kargo firması başarıyla eklendi',
            data: cargo
        });
    } catch (error) {
        console.error('Cargo create error:', error);
        res.status(500).json({
            success: false,
            message: 'Kargo firması eklenirken hata oluştu'
        });
    }
});

// Güncelle
router.put('/:id', async (req, res) => {
    try {
        const {
            name,
            code,
            logo,
            isActive,
            webOrder,
            memberGroups,
            productType,
            paymentType,
            fixedPrice,
            freeShippingThreshold,
            freeShippingDesiLimit
        } = req.body;

        const cargo = await Cargo.findOne({ _id: req.params.id, site: req.site });
        if (!cargo) {
            return res.status(404).json({
                success: false,
                message: 'Kargo firması bulunamadı'
            });
        }

        if (code && code.toLowerCase() !== cargo.code) {
            const existing = await Cargo.findOne({
                code: code.toLowerCase(),
                site: req.site,
                _id: { $ne: cargo._id }
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu kargo kodu zaten kullanılıyor'
                });
            }
            cargo.code = code.toLowerCase().trim();
        }

        if (name !== undefined) cargo.name = name.trim();
        if (logo !== undefined) cargo.logo = logo;
        if (isActive !== undefined) cargo.isActive = Boolean(isActive);
        if (webOrder !== undefined) cargo.webOrder = Number(webOrder) || 0;
        if (Array.isArray(memberGroups)) cargo.memberGroups = memberGroups;

        if (productType !== undefined) {
            if (!['dia_api', 'xml_integration'].includes(productType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Geçerli bir ürün tipi seçiniz'
                });
            }
            cargo.productType = productType;
        }

        if (paymentType !== undefined) {
            if (!['sender', 'receiver'].includes(paymentType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Geçerli bir ödeme tipi seçiniz'
                });
            }
            cargo.paymentType = paymentType;
        }

        if (fixedPrice !== undefined) cargo.fixedPrice = Number(fixedPrice) || 0;
        if (freeShippingThreshold !== undefined) cargo.freeShippingThreshold = Number(freeShippingThreshold) || 0;
        if (freeShippingDesiLimit !== undefined) cargo.freeShippingDesiLimit = Number(freeShippingDesiLimit) || 0;

        if (req.body.desiPricing !== undefined) {
            const { ranges, extraPerDesi } = req.body.desiPricing || {};

            if (Array.isArray(ranges)) {
                for (let i = 0; i < ranges.length; i++) {
                    const r = ranges[i];
                    if (typeof r.min !== 'number' || typeof r.max !== 'number' || typeof r.price !== 'number') {
                        return res.status(400).json({
                            success: false,
                            message: 'Desi aralık verileri geçersiz'
                        });
                    }
                    if (r.max < r.min) {
                        return res.status(400).json({
                            success: false,
                            message: 'Desi aralığı bitiş değeri başlangıçtan küçük olamaz'
                        });
                    }
                    if (i > 0 && r.min < ranges[i - 1].max) {
                        return res.status(400).json({
                            success: false,
                            message: 'Desi aralıkları birbiriyle çakışamaz'
                        });
                    }
                }
                if (!cargo.desiPricing) cargo.desiPricing = { ranges: [], extraPerDesi: 0 };
                cargo.desiPricing.ranges = ranges;
            }

            if (extraPerDesi !== undefined) {
                if (!cargo.desiPricing) cargo.desiPricing = { ranges: [], extraPerDesi: 0 };
                cargo.desiPricing.extraPerDesi = Number(extraPerDesi) || 0;
            }
        }

        await cargo.save();

        triggerShippingUpdate(cargo);

        res.json({
            success: true,
            message: 'Kargo firması güncellendi',
            data: cargo
        });
    } catch (error) {
        console.error('Cargo update error:', error);
        res.status(500).json({
            success: false,
            message: 'Kargo firması güncellenirken hata oluştu'
        });
    }
});

// Durum değiştir
router.patch('/:id/status', async (req, res) => {
    try {
        const cargo = await Cargo.findOne({ _id: req.params.id, site: req.site });
        if (!cargo) {
            return res.status(404).json({
                success: false,
                message: 'Kargo firması bulunamadı'
            });
        }

        cargo.isActive = !cargo.isActive;
        await cargo.save();

        triggerShippingUpdate(cargo);

        res.json({
            success: true,
            message: cargo.isActive ? 'Kargo firması aktifleştirildi' : 'Kargo firması pasifleştirildi',
            data: cargo
        });
    } catch (error) {
        console.error('Cargo status toggle error:', error);
        res.status(500).json({
            success: false,
            message: 'Durum güncellenirken hata oluştu'
        });
    }
});

// Sil
router.delete('/:id', async (req, res) => {
    try {
        const cargo = await Cargo.findOneAndDelete({ _id: req.params.id, site: req.site });

        if (!cargo) {
            return res.status(404).json({
                success: false,
                message: 'Kargo firması bulunamadı'
            });
        }
        triggerShippingUpdate(cargo);
        res.json({
            success: true,
            message: 'Kargo firması silindi'
        });
    } catch (error) {
        console.error('Cargo delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Kargo firması silinirken hata oluştu'
        });
    }
});

module.exports = router;