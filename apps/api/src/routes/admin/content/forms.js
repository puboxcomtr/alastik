const express = require('express');
const router = express.Router();
const Form = require('../../../models/Form');

// GET /api/admin/forms
router.get('/', async (req, res) => {
    try {
        const { search, status, formType, startDate, endDate } = req.query;
        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { subject: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } }
            ];
        }

        if (status) {
            query.status = status;
        }

        if (formType) {
            query.formType = formType;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const forms = await Form.find(query)
            .sort({ createdAt: -1 })
            .lean();

        // İstatistikler
        const stats = {
            total: await Form.countDocuments(),
            new: await Form.countDocuments({ status: 'new' }),
            read: await Form.countDocuments({ status: 'read' }),
            replied: await Form.countDocuments({ status: 'replied' }),
            archived: await Form.countDocuments({ status: 'archived' })
        };

        res.json({
            success: true,
            data: forms,
            stats
        });

    } catch (error) {
        console.error('Form listesi hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Formlar listelenemedi'
        });
    }
});

// GET /api/admin/forms/:id
router.get('/:id', async (req, res) => {
    try {
        const form = await Form.findById(req.params.id);

        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form bulunamadı'
            });
        }

        // Okundu olarak işaretle
        if (form.status === 'new') {
            form.status = 'read';
            form.readAt = new Date();
            await form.save();
        }

        res.json({
            success: true,
            data: form
        });

    } catch (error) {
        console.error('Form detay hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Form detayı alınamadı'
        });
    }
});

// PUT /api/admin/forms/:id
router.put('/:id', async (req, res) => {
    try {
        const { status, adminNotes } = req.body;

        const updateData = {};
        if (status) updateData.status = status;
        if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

        const form = await Form.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Form güncellendi',
            data: form
        });

    } catch (error) {
        console.error('Form güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Form güncellenemedi'
        });
    }
});

// DELETE /api/admin/forms/:id
router.delete('/:id', async (req, res) => {
    try {
        const form = await Form.findByIdAndDelete(req.params.id);

        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'Form bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Form silindi'
        });

    } catch (error) {
        console.error('Form silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Form silinemedi'
        });
    }
});

module.exports = router;