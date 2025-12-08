const express = require('express');
const router = express.Router();
const ActivityLog = require('../../../models/admin/user/ActivityLog');
const { authenticateAdmin, getClientIP } = require('../../../middleware/auth');

// Tüm route'lar admin authentication gerektirir
router.use(authenticateAdmin);

/**
 * @route   GET /api/admin/activity-logs
 * @desc    İşlem kayıtları listesi
 * @access  Private
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            userId,
            action,
            module,
            status,
            startDate,
            endDate,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        // Filtreler
        const filter = {};

        if (userId) {
            filter.user = userId;
        }

        if (action) {
            filter.action = action;
        }

        if (module) {
            filter.module = module;
        }

        if (status) {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate);
            }
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

        // Query
        const logs = await ActivityLog.find(filter)
            .populate('user', 'firstName lastName email username')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await ActivityLog.countDocuments(filter);

        // İstatistikler
        const stats = {
            total: await ActivityLog.countDocuments(),
            today: await ActivityLog.countDocuments({
                createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            }),
            success: await ActivityLog.countDocuments({ status: 'success' }),
            failed: await ActivityLog.countDocuments({ status: 'failed' })
        };

        // Modül bazlı istatistikler
        const moduleStats = await ActivityLog.aggregate([
            { $group: { _id: '$module', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            success: true,
            data: {
                logs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                },
                stats,
                moduleStats
            }
        });

    } catch (error) {
        console.error('Get activity logs error:', error);
        res.status(500).json({
            success: false,
            message: 'İşlem kayıtları alınırken bir hata oluştu'
        });
    }
});

/**
 * @route   GET /api/admin/activity-logs/:id
 * @desc    İşlem kaydı detayı
 * @access  Private
 */
router.get('/:id', async (req, res) => {
    try {
        const log = await ActivityLog.findById(req.params.id)
            .populate('user', 'firstName lastName email username');

        if (!log) {
            return res.status(404).json({
                success: false,
                message: 'İşlem kaydı bulunamadı'
            });
        }

        res.json({
            success: true,
            data: { log }
        });

    } catch (error) {
        console.error('Get activity log error:', error);
        res.status(500).json({
            success: false,
            message: 'İşlem kaydı alınırken bir hata oluştu'
        });
    }
});

/**
 * @route   GET /api/admin/activity-logs/user/:userId
 * @desc    Kullanıcıya ait işlem kayıtları
 * @access  Private
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const logs = await ActivityLog.getUserActivities(
            req.params.userId,
            parseInt(limit)
        );

        res.json({
            success: true,
            data: { logs }
        });

    } catch (error) {
        console.error('Get user activity logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Kullanıcı işlem kayıtları alınırken bir hata oluştu'
        });
    }
});

/**
 * @route   DELETE /api/admin/activity-logs/cleanup
 * @desc    Eski kayıtları temizle
 * @access  Private (Super Admin)
 */
router.delete('/cleanup', async (req, res) => {
    try {
        const { days = 90 } = req.body;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

        const result = await ActivityLog.deleteMany({
            createdAt: { $lt: cutoffDate }
        });

        res.json({
            success: true,
            message: `${result.deletedCount} adet eski kayıt silindi`,
            data: {
                deletedCount: result.deletedCount,
                cutoffDate
            }
        });

    } catch (error) {
        console.error('Cleanup activity logs error:', error);
        res.status(500).json({
            success: false,
            message: 'Kayıtlar temizlenirken bir hata oluştu'
        });
    }
});

module.exports = router;