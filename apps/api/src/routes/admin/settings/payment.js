const express = require('express');
const router = express.Router();
const PaymentMethod = require('../../../models/admin/order/PaymentMethod');
const {
    getAllProviders,
    getProviderTemplate,
    validateProviderFields
} = require('../../../config/paymentProviders');


// ============================================
// GET /api/admin/settings/payment/providers
// Provider template'lerini getir
// ============================================
router.get('/providers', async (req, res) => {
    try {
        const { type } = req.query;

        let providers = getAllProviders();

        if (type) {
            providers = { [type]: providers[type] };
        }

        res.json({
            success: true,
            data: providers
        });

    } catch (error) {
        console.error('Provider listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Provider listesi alınamadı',
            error: error.message
        });
    }
});

// ============================================
// GET /api/admin/settings/payment
// Ödeme yöntemlerini listele
// ============================================
router.get('/', async (req, res) => {
    try {
        console.log('🔍 GET / hit')
        const {
            type,
            provider,
            isActive,
            search,
            page = 1,
            limit = 50
        } = req.query;

        // Filtre oluştur
        const filter = { isDeleted: false };

        if (type) filter.type = type;
        if (provider) filter.provider = provider;
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { provider: { $regex: search, $options: 'i' } }
            ];
        }

        // Sayfalama
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Sorgu
        const [methods, total] = await Promise.all([
            PaymentMethod.find(filter)
                .sort({ priority: 1, createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            PaymentMethod.countDocuments(filter)
        ]);

        // İstatistikler
        const stats = await PaymentMethod.aggregate([
            { $match: { isDeleted: false } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: {
                        $sum: { $cond: ['$isActive', 1, 0] }
                    },
                    inactive: {
                        $sum: { $cond: ['$isActive', 0, 1] }
                    },
                    creditCard: {
                        $sum: { $cond: [{ $eq: ['$type', 'credit_card'] }, 1, 0] }
                    },
                    bankTransfer: {
                        $sum: { $cond: [{ $eq: ['$type', 'bank_transfer'] }, 1, 0] }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: methods,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            },
            stats: stats[0] || {
                total: 0,
                active: 0,
                inactive: 0,
                creditCard: 0,
                bankTransfer: 0
            }
        });

    } catch (error) {
        console.error('Ödeme yöntemleri listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ödeme yöntemleri listelenemedi',
            error: error.message
        });
    }
});

// ============================================
// GET /api/admin/settings/payment/:id
// Tek ödeme yöntemi detayı
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const method = await PaymentMethod.findOne({
            _id: req.params.id,
            isDeleted: false
        });

        if (!method) {
            return res.status(404).json({
                success: false,
                message: 'Ödeme yöntemi bulunamadı'
            });
        }

        res.json({
            success: true,
            data: method
        });

    } catch (error) {
        console.error('Ödeme yöntemi detay hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ödeme yöntemi bilgisi alınamadı',
            error: error.message
        });
    }
});

// ============================================
// POST /api/admin/settings/payment
// Yeni ödeme yöntemi ekle
// ============================================
router.post('/', async (req, res) => {
    try {
        const {
            type,
            provider,
            name,
            description,
            priority,
            apiCredentials,
            creditCardSettings,
            bankTransferSettings
        } = req.body;

        const template = getProviderTemplate(type, provider);
        if (!template) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz provider'
            });
        }
        if (type === 'credit_card') {
            const existingProvider = await PaymentMethod.findOne({
                type: 'credit_card',
                provider: provider,
                isDeleted: false
            });

            if (existingProvider) {
                return res.status(400).json({
                    success: false,
                    message: `${template.name} zaten kayıtlı. Kredi kartı entegrasyonunda aynı provider'dan sadece 1 kayıt olabilir.`
                });
            }
        }
        const validation = validateProviderFields(type, provider, apiCredentials);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message,
                errors: validation.errors
            });
        }

        const existingWithPriority = await PaymentMethod.findOne({
            priority,
            isDeleted: false
        });

        if (existingWithPriority) {
            await PaymentMethod.updateMany(
                { priority: { $gte: priority }, isDeleted: false },
                { $inc: { priority: 1 } }
            );
        }

        const newMethod = new PaymentMethod({
            type,
            provider,
            name,
            description,
            priority: priority || 0,
            apiCredentials,
            isActive: false,
            providerMeta: {
                displayName: template.name,
                logo: template.logo,
                color: template.color,
                icon: template.icon
            }
        });

        if (type === 'credit_card' && creditCardSettings) {
            newMethod.creditCardSettings = creditCardSettings;
        }

        if (type === 'bank_transfer' && bankTransferSettings) {
            newMethod.bankTransferSettings = bankTransferSettings;
        }

        await newMethod.save();

        res.status(201).json({
            success: true,
            message: 'Ödeme yöntemi başarıyla eklendi',
            data: newMethod
        });

    } catch (error) {
        console.error('Ödeme yöntemi ekleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ödeme yöntemi eklenemedi',
            error: error.message
        });
    }
});

// ============================================
// PUT /api/admin/settings/payment/:id
// Ödeme yöntemi güncelle
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const {
            name,
            description,
            priority,
            apiCredentials,
            creditCardSettings,
            bankTransferSettings
        } = req.body;

        const method = await PaymentMethod.findOne({
            _id: req.params.id,
            isDeleted: false
        });

        if (!method) {
            return res.status(404).json({
                success: false,
                message: 'Ödeme yöntemi bulunamadı'
            });
        }

        // Validation
        if (apiCredentials) {
            const validation = validateProviderFields(method.type, method.provider, apiCredentials);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.message,
                    errors: validation.errors
                });
            }
        }

        // Güncelle
        if (name) method.name = name;
        if (description !== undefined) method.description = description;
        if (priority !== undefined) method.priority = priority;
        if (apiCredentials) method.apiCredentials = apiCredentials;

        if (creditCardSettings && method.type === 'credit_card') {
            method.creditCardSettings = { ...method.creditCardSettings, ...creditCardSettings };
        }

        if (bankTransferSettings && method.type === 'bank_transfer') {
            method.bankTransferSettings = { ...method.bankTransferSettings, ...bankTransferSettings };
        }

        await method.save();

        res.json({
            success: true,
            message: 'Ödeme yöntemi güncellendi',
            data: method
        });

    } catch (error) {
        console.error('Ödeme yöntemi güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ödeme yöntemi güncellenemedi',
            error: error.message
        });
    }
});

// ============================================
// PATCH /api/admin/settings/payment/:id/toggle
// Aktif/Pasif değiştir
// ============================================
router.patch('/:id/toggle', async (req, res) => {
    try {
        const method = await PaymentMethod.findOne({
            _id: req.params.id,
            isDeleted: false
        });

        if (!method) {
            return res.status(404).json({
                success: false,
                message: 'Ödeme yöntemi bulunamadı'
            });
        }

        method.isActive = !method.isActive;
        await method.save();

        res.json({
            success: true,
            message: `Ödeme yöntemi ${method.isActive ? 'aktif' : 'pasif'} edildi`,
            data: method
        });

    } catch (error) {
        console.error('Durum değiştirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Durum değiştirilemedi',
            error: error.message
        });
    }
});

// ============================================
// DELETE /api/admin/settings/payment/:id
// Ödeme yöntemini arşivle (soft delete)
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const method = await PaymentMethod.findOne({
            _id: req.params.id,
            isDeleted: false
        });

        if (!method) {
            return res.status(404).json({
                success: false,
                message: 'Ödeme yöntemi bulunamadı'
            });
        }

        method.isDeleted = true;
        method.deletedAt = new Date();
        method.isActive = false;

        await method.save();

        res.json({
            success: true,
            message: 'Ödeme yöntemi arşivlendi',
            data: method
        });

    } catch (error) {
        console.error('Ödeme yöntemi silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ödeme yöntemi silinemedi',
            error: error.message
        });
    }
});

module.exports = router;