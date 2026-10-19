const express = require('express');
const router = express.Router();
const PaymentMethod = require('../../../models/admin/order/PaymentMethod');
const NkolayService = require('../../../services/plugins/payment/NKolayService');
const {
    getAllProviders,
    getProviderTemplate,
    validateProviderFields
} = require('../../../config/paymentProviders');

router.get('/providers', async (req, res) => {
    try {
        const { type } = req.query;

        let providers = getAllProviders();

        if (type) {
            providers = { [type]: providers[type] };
        }

        res.set('Cache-Control', 'no-store');
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

        const filter = { isDeleted: false, site: req.site };

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

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [methods, total] = await Promise.all([
            PaymentMethod.find(filter)
                .sort({ priority: 1, createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            PaymentMethod.countDocuments(filter)
        ]);

        const stats = await PaymentMethod.aggregate([
            { $match: { isDeleted: false, site: req.site } },
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

router.get('/:id', async (req, res) => {
    try {
        const method = await PaymentMethod.findOne({
            _id: req.params.id,
            isDeleted: false,
            site: req.site
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
                isDeleted: false,
                site: req.site
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
            isDeleted: false,
            site: req.site
        });

        if (existingWithPriority) {
            await PaymentMethod.updateMany(
                { priority: { $gte: priority }, isDeleted: false, site: req.site },
                { $inc: { priority: 1 } }
            );
        }

        const newMethod = new PaymentMethod({
            site: req.site,
            type,
            provider,
            name,
            description,
            priority: priority || 0,
            apiCredentials,
            isActive: true,
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
            isDeleted: false,
            site: req.site
        });

        if (!method) {
            return res.status(404).json({
                success: false,
                message: 'Ödeme yöntemi bulunamadı'
            });
        }

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

        if (name) method.name = name;
        if (description !== undefined) method.description = description;
        if (priority !== undefined) method.priority = priority;
        if (apiCredentials) method.apiCredentials = apiCredentials;

        if (creditCardSettings && method.type === 'credit_card') {
            if (creditCardSettings.tekCekimAktif === true) {
                const other = await PaymentMethod.findOne({
                    _id: { $ne: method._id }, site: method.site, type: 'credit_card',
                    isDeleted: { $ne: true }, 'creditCardSettings.tekCekimAktif': true
                });
                if (other) {
                    return res.status(400).json({ success: false, message: `Bu site için Tek Çekim zaten "${other.name}" yönteminde aktif. Aynı anda yalnızca 1 yöntem seçilebilir; önce onu kapatın.` });
                }
            }
            if (creditCardSettings.taksitAktif === true) {
                const other = await PaymentMethod.findOne({
                    _id: { $ne: method._id }, site: method.site, type: 'credit_card',
                    isDeleted: { $ne: true }, 'creditCardSettings.taksitAktif': true
                });
                if (other) {
                    return res.status(400).json({ success: false, message: `Bu site için Taksitli zaten "${other.name}" yönteminde aktif. Aynı anda yalnızca 1 yöntem seçilebilir; önce onu kapatın.` });
                }
            }
        }

        if (creditCardSettings && method.type === 'credit_card') {
            method.creditCardSettings = { ...method.creditCardSettings, ...creditCardSettings };
        }

        if (bankTransferSettings && method.type === 'bank_transfer') {
            method.bankTransferSettings = { ...method.bankTransferSettings, ...bankTransferSettings };
        }

        await method.save();

        if (method.provider === 'nkolay') NkolayService.clearCredentials();

        if (method.type === 'credit_card') {
            try { require('../../../services/plugins/payment/creditCardOptions').invalidate(method.site); } catch (_) {  }
        }

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

router.patch('/:id/toggle', async (req, res) => {
    try {
        const method = await PaymentMethod.findOne({
            _id: req.params.id,
            isDeleted: false,
            site: req.site
        });

        if (!method) {
            return res.status(404).json({
                success: false,
                message: 'Ödeme yöntemi bulunamadı'
            });
        }

        method.isActive = !method.isActive;
        await method.save();

        if (method.provider === 'nkolay') NkolayService.clearCredentials();
        if (method.type === 'credit_card') {
            try { require('../../../services/plugins/payment/creditCardOptions').invalidate(method.site); } catch (_) {  }
        }

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

router.delete('/:id', async (req, res) => {
    try {
        const method = await PaymentMethod.findOne({
            _id: req.params.id,
            isDeleted: false,
            site: req.site
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

        if (method.provider === 'nkolay') NkolayService.clearCredentials();

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