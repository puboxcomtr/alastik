const router = require('express').Router();
const mongoose = require('mongoose');
const WebB2BApplication = require('../../../models/web/user/WebB2BApplication');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const STATUS_LABELS = {
    new: 'Yeni',
    reviewed: 'İncelendi',
    approved: 'Onaylandı',
    rejected: 'Reddedildi'
};

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const match = { site: req.site };

        if (req.query.status && STATUS_LABELS[req.query.status]) {
            match.status = req.query.status;
        }
        if (req.query.search?.trim()) {
            const regex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            match.$or = [
                { companyName: regex },
                { firstName: regex },
                { lastName: regex },
                { email: regex },
                { phone: regex },
                { city: regex }
            ];
        }

        const [items, total] = await Promise.all([
            WebB2BApplication.find(match).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            WebB2BApplication.countDocuments(match)
        ]);

        res.json({
            success: true,
            data: items.map(a => ({
                id: a._id,
                companyName: a.companyName || '-',
                contactName: `${a.firstName || ''} ${a.lastName || ''}`.replace(/ \.$/, '').trim(),
                email: a.email,
                phone: a.phone || '-',
                city: a.city,
                district: a.district || '-',
                address: a.address || '',
                taxOffice: a.taxOffice || '-',
                taxNumber: a.taxNumber || '-',
                yearsOfExperience: a.yearsOfExperience || '-',
                monthlySalesVolume: a.monthlySalesVolume || '-',
                brands: a.brands || [],
                wantsBrandedSignage: a.wantsBrandedSignage === true,
                message: a.message || '',
                status: a.status,
                statusLabel: STATUS_LABELS[a.status] || a.status,
                adminNote: a.adminNote || '',
                createdAt: a.createdAt
            })),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), statuses: STATUS_LABELS }
        });
    } catch (error) {
        console.error('Bayi başvuru listesi hatası:', error);
        res.status(500).json({ success: false, message: 'Başvurular yüklenemedi' });
    }
});

router.put('/:id/status', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz başvuru' });
        }
        const { status, adminNote } = req.body || {};
        const update = {};
        if (status !== undefined) {
            if (!STATUS_LABELS[status]) {
                return res.status(400).json({ success: false, message: 'Geçersiz durum' });
            }
            update.status = status;
        }
        if (adminNote !== undefined) update.adminNote = String(adminNote).slice(0, 1000);

        const application = await WebB2BApplication.findOneAndUpdate(
            { _id: req.params.id, site: req.site },
            { $set: update },
            { new: true }
        );
        if (!application) {
            return res.status(404).json({ success: false, message: 'Başvuru bulunamadı' });
        }
        res.json({ success: true, message: 'Başvuru güncellendi', data: { status: application.status } });
    } catch (error) {
        console.error('Bayi başvuru güncelleme hatası:', error);
        res.status(500).json({ success: false, message: 'Başvuru güncellenemedi' });
    }
});

module.exports = router;
