const express = require('express');
const router = express.Router();
const Queue = require('bull');
const workerConfig = require('../../config/worker.config');
const DiaStockService = require('../../services/plugins/dia/DiaStockService');
const diaStockService = new DiaStockService();

const fullSyncQueue = new Queue('dia-full-sync', {
    redis: workerConfig.redis
});

const lightSyncQueue = new Queue('dia-light-sync', {
    redis: workerConfig.redis
});

router.get('/sync/status', async (req, res) => {
    try {
        const [fullSyncCounts, lightSyncCounts] = await Promise.all([
            fullSyncQueue.getJobCounts(),
            lightSyncQueue.getJobCounts()
        ]);

        const lastFullJobs = await fullSyncQueue.getCompleted(0, 0);
        const lastLightJobs = await lightSyncQueue.getCompleted(0, 0);

        res.json({
            success: true,
            data: {
                fullSync: {
                    ...fullSyncCounts,
                    lastSync: lastFullJobs[0] ? {
                        completedAt: lastFullJobs[0].finishedOn,
                        result: lastFullJobs[0].returnvalue
                    } : null
                },
                lightSync: {
                    ...lightSyncCounts,
                    lastSync: lastLightJobs[0] ? {
                        completedAt: lastLightJobs[0].finishedOn,
                        result: lastLightJobs[0].returnvalue
                    } : null
                },
                schedule: {
                    fullSync: workerConfig.sync.fullSync.schedule,
                    lightSync: workerConfig.sync.lightSync.schedule
                }
            }
        });
    } catch (error) {
        console.error('Sync status error:', error);
        res.status(500).json({ success: false, message: 'Sync durumu alınamadı', error: error.message });
    }
});

router.post('/full-sync', async (req, res) => {
    try {
        const activeCounts = await fullSyncQueue.getJobCounts();
        if (activeCounts.active > 0 || activeCounts.waiting > 0) {
            return res.json({ success: false, message: 'Senkronizasyon zaten devam ediyor' });
        }

        const job = await fullSyncQueue.add(
            'manual-full-sync',
            { type: 'manual', triggeredBy: 'admin', triggeredAt: new Date().toISOString() },
            { timeout: workerConfig.worker.timeout }
        );

        res.json({
            success: true,
            message: 'Full sync başlatıldı (Worker üzerinden)',
            data: { jobId: job.id, type: 'full', status: 'queued' }
        });
    } catch (error) {
        console.error('Full sync trigger error:', error);
        res.status(500).json({ success: false, message: 'Full sync başlatılamadı', error: error.message });
    }
});

router.post('/light-sync', async (req, res) => {
    try {
        const activeCounts = await lightSyncQueue.getJobCounts();
        if (activeCounts.active > 0 || activeCounts.waiting > 0) {
            return res.json({ success: false, message: 'Light sync zaten devam ediyor' });
        }

        const job = await lightSyncQueue.add(
            'manual-light-sync',
            { type: 'manual', triggeredBy: 'admin', triggeredAt: new Date().toISOString() },
            { timeout: workerConfig.worker.lightSyncTimeout }
        );

        res.json({
            success: true,
            message: 'Light sync başlatıldı (Fiyat + Stok)',
            data: { jobId: job.id, type: 'light', status: 'queued' }
        });
    } catch (error) {
        console.error('Light sync trigger error:', error);
        res.status(500).json({ success: false, message: 'Light sync başlatılamadı', error: error.message });
    }
});

router.post('/sync/prices-and-stocks', async (req, res) => {
    try {
        const activeCounts = await lightSyncQueue.getJobCounts();
        if (activeCounts.active > 0 || activeCounts.waiting > 0) {
            return res.json({ success: false, message: 'Light sync zaten devam ediyor' });
        }

        const fullActiveCounts = await fullSyncQueue.getJobCounts();
        if (fullActiveCounts.active > 0 || fullActiveCounts.waiting > 0) {
            return res.json({ success: false, message: 'Full sync devam ediyor, lütfen bekleyin' });
        }

        const job = await lightSyncQueue.add(
            'manual-light-sync',
            { type: 'manual', triggeredBy: 'admin', triggeredAt: new Date().toISOString() },
            { timeout: workerConfig.worker.lightSyncTimeout }
        );

        res.json({
            success: true,
            message: 'Fiyat ve stok güncelleme başlatıldı',
            data: { jobId: job.id, type: 'light', status: 'queued' }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/sync/job/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { type = 'full' } = req.query;

        const queue = type === 'full' ? fullSyncQueue : lightSyncQueue;
        const job = await queue.getJob(jobId);

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job bulunamadı' });
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
                finishedOn: job.finishedOn,
                failedReason: job.failedReason || null
            }
        });
    } catch (error) {
        console.error('Job status error:', error);
        res.status(500).json({ success: false, message: 'Job durumu alınamadı', error: error.message });
    }
});

router.get('/sync/job/:jobId/progress', async (req, res) => {
    try {
        const { jobId } = req.params;
        const { type = 'full' } = req.query;

        const queue = type === 'full' ? fullSyncQueue : lightSyncQueue;
        const job = await queue.getJob(jobId);

        if (!job) {
            return res.status(404).json({ success: false, message: 'Job bulunamadı' });
        }

        const state = await job.getState();
        const progress = job._progress || {};
        const result = job.returnvalue;

        res.json({
            success: true,
            data: {
                jobId: job.id,
                state,
                progress: typeof progress === 'object' ? progress : { percent: progress || 0 },
                result: state === 'completed' ? result : null,
                failedReason: job.failedReason || null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/sync/stats', async (req, res) => {
    try {
        const WebProduct = require('../../models/web/catalog/WebProduct');
        const WebCategory = require('../../models/web/catalog/WebCategory');
        const WebBrand = require('../../models/web/catalog/WebBrand');
        const DiaStock = require('../../models/plugins/DiaStock');

        const [
            syncedProducts,
            totalDiaProducts,
            syncedCategories,
            syncedBrands,
            lastSyncedProduct
        ] = await Promise.all([
            WebProduct.countDocuments({ 'syncInfo.diaStatus': 'synced' }),
            DiaStock.countDocuments({ 'syncInfo.syncStatus': 'synced' }),
            WebCategory.countDocuments({ 'syncInfo.syncStatus': 'synced' }),
            WebBrand.countDocuments({ 'syncInfo.syncStatus': 'synced' }),
            WebProduct.findOne({ 'syncInfo.diaStatus': 'synced' })
                .sort({ 'syncInfo.lastDiaSync': -1 })
                .select('syncInfo.lastDiaSync')
                .lean()
        ]);

        const unsyncedProducts = totalDiaProducts - syncedProducts;

        res.json({
            success: true,
            data: {
                syncedProducts,
                totalDiaProducts,
                unsyncedProducts: unsyncedProducts > 0 ? unsyncedProducts : 0,
                syncedCategories,
                syncedBrands,
                lastSyncDate: lastSyncedProduct?.syncInfo?.lastDiaSync || null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/sync/images', async (req, res) => {
    try {
        const result = await diaStockService.syncImagesToWebProducts();
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;