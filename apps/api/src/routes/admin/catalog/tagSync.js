const express = require('express');
const router = express.Router();
const TireTagSyncService = require('../../../services/plugins/tag/TireTagSyncService');
const { authenticateAdmin } = require('../../../middleware/auth');

const maybeAuth = process.env.DISABLE_AUTH === 'true'
    ? (req, res, next) => next()
    : authenticateAdmin;

router.use(maybeAuth);

let isRunning = false;

router.post('/manual-sync', async (req, res) => {
    if (isRunning) {
        return res.status(409).json({
            success: false,
            message: 'Etiket senkronizasyonu zaten çalışıyor'
        });
    }

    isRunning = true;
    const startTime = Date.now();

    try {
        const { stats } = await TireTagSyncService.sync({
            dryRun: false,
            limit: 0
        });

        const duration = Date.now() - startTime;

        res.json({
            success: true,
            message: 'Etiket senkronizasyonu tamamlandı',
            data: {
                duration: `${duration}ms`,
                stats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Etiket senkronizasyonu başarısız',
            error: error.message
        });
    } finally {
        isRunning = false;
    }
});

router.get('/status', (req, res) => {
    res.json({
        success: true,
        data: { isRunning }
    });
});

module.exports = router;