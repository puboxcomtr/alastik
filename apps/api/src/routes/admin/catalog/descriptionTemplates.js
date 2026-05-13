const express = require('express');
const router = express.Router();
const DescriptionTemplate = require('../../../models/web/catalog/DescriptionTemplate');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const { authenticateAdmin } = require('../../../middleware/auth');

const maybeAuth = process.env.DISABLE_AUTH === 'true'
    ? (req, res, next) => next()
    : authenticateAdmin;

/**
 * Şablon Listesi
 */
router.get('/', maybeAuth, async (req, res) => {
    try {
        const { search, page = 1, limit = 50 } = req.query;
        const filter = {};

        if (search && String(search).trim() !== '') {
            filter.name = { $regex: String(search).trim(), $options: 'i' };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await DescriptionTemplate.countDocuments(filter);

        const templates = await DescriptionTemplate.find(filter)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        res.json({
            success: true,
            data: templates.map(t => ({
                id: t._id,
                name: t.name,
                content: t.content,
                models: t.models || [],
                modelCount: (t.models || []).length,
                isActive: t.isActive,
                lastAppliedAt: t.lastAppliedAt,
                appliedCount: t.appliedCount || 0,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt
            })),
            meta: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Şablon listesi hatası:', error);
        res.status(500).json({ success: false, message: 'Şablonlar getirilemedi' });
    }
});

/**
 * Şablon Detay
 */
router.get('/:id', maybeAuth, async (req, res) => {
    try {
        const template = await DescriptionTemplate.findById(req.params.id).lean();
        if (!template) {
            return res.status(404).json({ success: false, message: 'Şablon bulunamadı' });
        }

        res.json({
            success: true,
            data: {
                id: template._id,
                name: template.name,
                content: template.content,
                models: template.models || [],
                isActive: template.isActive,
                lastAppliedAt: template.lastAppliedAt,
                appliedCount: template.appliedCount || 0,
                createdAt: template.createdAt,
                updatedAt: template.updatedAt
            }
        });
    } catch (error) {
        console.error('Şablon detay hatası:', error);
        res.status(500).json({ success: false, message: 'Şablon getirilemedi' });
    }
});

/**
 * Yeni Şablon
 */
router.post('/', maybeAuth, async (req, res) => {
    try {
        const { name, content, models, isActive } = req.body;

        if (!name || String(name).trim() === '') {
            return res.status(400).json({ success: false, message: 'Şablon adı zorunludur' });
        }

        const template = await DescriptionTemplate.create({
            name: String(name).trim(),
            content: content || '',
            models: Array.isArray(models) ? models : [],
            isActive: isActive !== undefined ? Boolean(isActive) : true
        });

        res.json({
            success: true,
            message: 'Şablon oluşturuldu',
            data: { id: template._id }
        });
    } catch (error) {
        console.error('Şablon oluşturma hatası:', error);
        res.status(500).json({ success: false, message: 'Şablon oluşturulamadı' });
    }
});

/**
 * Şablon Güncelleme
 */
router.patch('/:id', maybeAuth, async (req, res) => {
    try {
        const { name, content, models, isActive } = req.body;
        const updateData = {};

        if (name !== undefined) updateData.name = String(name).trim();
        if (content !== undefined) updateData.content = content;
        if (models !== undefined) updateData.models = Array.isArray(models) ? models : [];
        if (isActive !== undefined) updateData.isActive = Boolean(isActive);

        const updated = await DescriptionTemplate.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Şablon bulunamadı' });
        }

        res.json({ success: true, message: 'Şablon güncellendi' });
    } catch (error) {
        console.error('Şablon güncelleme hatası:', error);
        res.status(500).json({ success: false, message: 'Şablon güncellenemedi' });
    }
});

/**
 * Şablon Silme
 */
router.delete('/:id', maybeAuth, async (req, res) => {
    try {
        const deleted = await DescriptionTemplate.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Şablon bulunamadı' });
        }
        res.json({ success: true, message: 'Şablon silindi' });
    } catch (error) {
        console.error('Şablon silme hatası:', error);
        res.status(500).json({ success: false, message: 'Şablon silinemedi' });
    }
});

/**
 * Şablonu Ürünlere Uygula
 * Body: { models: [...], overrideExisting: bool }
 */
router.post('/:id/apply', maybeAuth, async (req, res) => {
    try {
        const template = await DescriptionTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ success: false, message: 'Şablon bulunamadı' });
        }

        const targetModels = Array.isArray(req.body.models) && req.body.models.length > 0
            ? req.body.models
            : template.models;

        if (!targetModels || targetModels.length === 0) {
            return res.status(400).json({ success: false, message: 'Uygulanacak model seçilmedi' });
        }

        const overrideExisting = Boolean(req.body.overrideExisting);

        const filter = {
            'diaData.ozelkod5kodu': { $in: targetModels }
        };

        if (!overrideExisting) {
            filter.$or = [
                { 'customData.customDescription': null },
                { 'customData.customDescription': '' },
                { 'customData.customDescription': { $exists: false } }
            ];
        }

        const result = await WebProduct.updateMany(filter, {
            $set: {
                'customData.customDescription': template.content,
                'syncInfo.lastWebUpdate': new Date()
            }
        });

        template.lastAppliedAt = new Date();
        template.appliedCount = (template.appliedCount || 0) + result.modifiedCount;
        await template.save();

        res.json({
            success: true,
            message: `${result.modifiedCount} ürün güncellendi`,
            data: {
                matched: result.matchedCount,
                modified: result.modifiedCount,
                models: targetModels
            }
        });
    } catch (error) {
        console.error('Şablon uygulama hatası:', error);
        res.status(500).json({ success: false, message: 'Şablon uygulanamadı' });
    }
});


/**
 * Tüm aktif şablonları toplu uygula
 * Body: { overrideExisting: bool }
 */
router.post('/apply-all', maybeAuth, async (req, res) => {
    try {
        const overrideExisting = Boolean(req.body.overrideExisting);

        const templates = await DescriptionTemplate.find({
            isActive: true,
            'models.0': { $exists: true }
        });

        if (templates.length === 0) {
            return res.json({
                success: true,
                message: 'Uygulanacak aktif şablon bulunamadı',
                data: { totalTemplates: 0, totalModified: 0, results: [] }
            });
        }

        const results = [];
        let totalModified = 0;

        for (const template of templates) {
            try {
                const filter = {
                    'diaData.ozelkod5kodu': { $in: template.models }
                };

                if (!overrideExisting) {
                    filter.$or = [
                        { 'customData.customDescription': null },
                        { 'customData.customDescription': '' },
                        { 'customData.customDescription': { $exists: false } }
                    ];
                }

                const updateResult = await WebProduct.updateMany(filter, {
                    $set: {
                        'customData.customDescription': template.content,
                        'syncInfo.lastWebUpdate': new Date()
                    }
                });

                template.lastAppliedAt = new Date();
                template.appliedCount = (template.appliedCount || 0) + updateResult.modifiedCount;
                await template.save();

                totalModified += updateResult.modifiedCount;

                results.push({
                    templateId: template._id,
                    name: template.name,
                    matched: updateResult.matchedCount,
                    modified: updateResult.modifiedCount
                });
            } catch (err) {
                console.error(`Şablon uygulama hatası (${template.name}):`, err);
                results.push({
                    templateId: template._id,
                    name: template.name,
                    error: err.message
                });
            }
        }

        res.json({
            success: true,
            message: `${templates.length} şablon işlendi, ${totalModified} ürün güncellendi`,
            data: {
                totalTemplates: templates.length,
                totalModified,
                results
            }
        });
    } catch (error) {
        console.error('Toplu şablon uygulama hatası:', error);
        res.status(500).json({ success: false, message: 'Toplu uygulama yapılamadı' });
    }
});

module.exports = router;