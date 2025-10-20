const express = require('express');
const router = express.Router();
const ActivityLog = require('../../../models/ActivityLog');
const { authenticateAdmin, getClientIP } = require('../../../middleware/auth');

// Tüm route'lar admin authentication gerektirir
router.use(authenticateAdmin);

/**
 * @route   GET /api/admin/user/activity-logs
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
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = {
            total: await ActivityLog.countDocuments(),
            today: await ActivityLog.countDocuments({
                createdAt: { $gte: today }
            }),
            success: await ActivityLog.countDocuments({ status: 'success' }),
            failed: await ActivityLog.countDocuments({ status: 'failed' })
        };

        // Modül bazlı istatistikler
        const moduleStats = await ActivityLog.aggregate([
            { $group: { _id: '$module', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Action bazlı istatistikler
        const actionStats = await ActivityLog.aggregate([
            { $group: { _id: '$action', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
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
                moduleStats,
                actionStats
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
 * @route   GET /api/admin/user/activity-logs/:id
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
 * @route   GET /api/admin/user/activity-logs/user/:userId
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
 * @route   GET /api/admin/user/activity-logs/stats/dashboard
 * @desc    Dashboard istatistikleri
 * @access  Private
 */
router.get('/stats/dashboard', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const thisWeek = new Date(today);
        thisWeek.setDate(thisWeek.getDate() - 7);

        const thisMonth = new Date(today);
        thisMonth.setMonth(thisMonth.getMonth() - 1);

        // Zaman bazlı istatistikler
        const timeStats = {
            today: await ActivityLog.countDocuments({ createdAt: { $gte: today } }),
            yesterday: await ActivityLog.countDocuments({
                createdAt: { $gte: yesterday, $lt: today }
            }),
            thisWeek: await ActivityLog.countDocuments({ createdAt: { $gte: thisWeek } }),
            thisMonth: await ActivityLog.countDocuments({ createdAt: { $gte: thisMonth } })
        };

        // Son aktiviteler
        const recentActivities = await ActivityLog.find()
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('user', 'firstName lastName email');

        // En aktif kullanıcılar (son 7 gün)
        const activeUsers = await ActivityLog.aggregate([
            { $match: { createdAt: { $gte: thisWeek } } },
            { $group: { _id: '$user', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'admins',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    count: 1,
                    'user.firstName': 1,
                    'user.lastName': 1,
                    'user.email': 1
                }
            }
        ]);

        // Başarısız işlemler (son 24 saat)
        const failedActions = await ActivityLog.find({
            status: 'failed',
            createdAt: { $gte: today }
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('user', 'firstName lastName email');

        res.json({
            success: true,
            data: {
                timeStats,
                recentActivities,
                activeUsers,
                failedActions
            }
        });

    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Dashboard istatistikleri alınırken bir hata oluştu'
        });
    }
});

/**
 * @route   DELETE /api/admin/user/activity-logs/cleanup
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

        // Activity log
        await ActivityLog.logActivity({
            user: req.adminId,
            action: 'delete',
            module: 'settings',
            details: {
                action: 'Activity logs cleanup',
                deletedCount: result.deletedCount,
                olderThan: `${days} days`
            },
            ipAddress: getClientIP(req),
            userAgent: req.get('user-agent'),
            status: 'success'
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