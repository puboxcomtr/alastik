// apps/api/src/routes/plugins/dia.js

const express = require('express');
const router = express.Router();
const Queue = require('bull');
const workerConfig = require('../../config/worker.config');

// Bull Queue bağlantıları (sadece client olarak)
const fullSyncQueue = new Queue('dia-full-sync', {
    redis: workerConfig.redis
});

const lightSyncQueue = new Queue('dia-light-sync', {
    redis: workerConfig.redis
});

/**
 * Sync durumunu getir
 */
router.get('/sync/status', async (req, res) => {
    try {
        const [fullSyncCounts, lightSyncCounts] = await Promise.all([
            fullSyncQueue.getJobCounts(),
            lightSyncQueue.getJobCounts()
        ]);

        // Son tamamlanan job'ları al
        const [lastFullSync, lastLightSync] = await Promise.all([
            fullSyncQueue.getCompleted().then(jobs => jobs[0]),
            lightSyncQueue.getCompleted().then(jobs => jobs[0])
        ]);

        // Son sync bilgilerini formatla
        const formatLastSync = async (job) => {
            if (!job) return null;
            const result = await job.finished();
            return {
                completedAt: job.finishedOn,
                result
            };
        };

        const [fullSyncInfo, lightSyncInfo] = await Promise.all([
            formatLastSync(lastFullSync),
            formatLastSync(lastLightSync)
        ]);

        res.json({
            success: true,
            data: {
                fullSync: {
                    ...fullSyncCounts,
                    lastSync: fullSyncInfo
                },
                lightSync: {
                    ...lightSyncCounts,
                    lastSync: lightSyncInfo
                },
                schedule: {
                    fullSync: workerConfig.sync.fullSync.schedule,
                    lightSync: workerConfig.sync.lightSync.schedule
                }
            }
        });

    } catch (error) {
        console.error('Sync status error:', error);
        res.status(500).json({
            success: false,
            message: 'Sync durumu alınamadı',
            error: error.message
        });
    }
});

/**
 * Manuel full sync tetikle
 */
router.post('/sync/full', async (req, res) => {
    try {
        const job = await fullSyncQueue.add(
            'manual-full-sync',
            { type: 'manual', triggeredBy: 'admin', triggeredAt: new Date() },
            { timeout: workerConfig.worker.timeout }
        );

        res.json({
            success: true,
            message: 'Full sync (Ürün + Kategori + Marka) başlatıldı',
            data: {
                jobId: job.id,
                type: 'full',
                status: 'queued'
            }
        });

    } catch (error) {
        console.error('Full sync trigger error:', error);
        res.status(500).json({
            success: false,
            message: 'Full sync başlatılamadı',
            error: error.message
        });
    }
});

/**
 * Manuel light sync tetikle
 */
router.post('/sync/light', async (req, res) => {
    try {
        const job = await lightSyncQueue.add(
            'manual-light-sync',
            { type: 'manual', triggeredBy: 'admin', triggeredAt: new Date() },
            { timeout: workerConfig.worker.lightSyncTimeout }
        );

        res.json({
            success: true,
            message: 'Light sync (Fiyat + Stok) başlatıldı',
            data: {
                jobId: job.id,
                type: 'light',
                status: 'queued'
            }
        });

    } catch (error) {
        console.error('Light sync trigger error:', error);
        res.status(500).json({
            success: false,
            message: 'Light sync başlatılamadı',
            error: error.message
        });
    }
});

/**
 * Belirli bir job'ın durumunu getir
 */
router.get('/sync/job/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { type = 'light' } = req.query;

        const queue = type === 'full' ? fullSyncQueue : lightSyncQueue;
        const job = await queue.getJob(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job bulunamadı'
            });
        }

        const state = await job.getState();
        const progress = job._progress;
        const result = job.returnvalue;

        res.json({
            success: true,
            data: {
                jobId: job.id,
                type,
                state,
                progress,
                result,
                createdAt: job.timestamp,
                processedOn: job.processedOn,
                finishedOn: job.finishedOn
            }
        });

    } catch (error) {
        console.error('Job status error:', error);
        res.status(500).json({
            success: false,
            message: 'Job durumu alınamadı',
            error: error.message
        });
    }
});

module.exports = router;