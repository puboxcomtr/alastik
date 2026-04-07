// apps/api/src/workers/DiaWorker.js

const Queue = require('bull');
const winston = require('winston');
const workerConfig = require('../config/worker.config');
const DiaStockService = require('../services/plugins/dia/DiaStockService');

class DiaWorker {
    constructor() {
        // Logger
        this.logger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ),
            defaultMeta: { service: 'dia-worker' },
            transports: [
                new winston.transports.File({ filename: 'logs/dia-worker.log' }),
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                })
            ]
        });

        // DIA Service
        this.diaService = new DiaStockService();

        // Sync guard (aynı anda birden fazla sync çalışmasın)
        this.syncLock = {
            fullSync: false,
            lightSync: false
        };

        // Bull Queue'ları oluştur
        const queueSettings = {
            stalledInterval: 1800000,
            maxStalledCount: 0
        };
        this.queues = {
            fullSync: new Queue('dia-full-sync', {
                redis: workerConfig.redis,
                defaultJobOptions: workerConfig.queue.defaultJobOptions,
                settings: queueSettings
            }),

            lightSync: new Queue('dia-light-sync', {
                redis: workerConfig.redis,
                defaultJobOptions: workerConfig.queue.defaultJobOptions,
                settings: queueSettings
            })
        };

        // Process handler'ları ayarla
        this.setupProcessors();

        // Event listener'ları ayarla
        this.setupEventListeners();
    }

    /**
     * Queue processor'larını ayarla
     */
    setupProcessors() {
        console.log('setupProcessors() ÇAĞRILDI!');
        // Full Sync - Scheduled job processor
        this.queues.fullSync.process('scheduled-full-sync', (job) => {
            return this.processFullSync(job);
        });
        // Full Sync - Manual job processor
        this.queues.fullSync.process('manual-full-sync', (job) => {
            return this.processFullSync(job);
        });
        // Light Sync - Scheduled job processor
        this.queues.lightSync.process('scheduled-light-sync', (job) => {
            return this.processLightSync(job);
        });
        // Light Sync - Manual job processor
        this.queues.lightSync.process('manual-light-sync', (job) => {
            return this.processLightSync(job);
        });
        console.log('Processor kayıtları TAMAMLANDI!');
    }
    /**
     * Event listener'ları ayarla
     */
    setupEventListeners() {
        // Full Sync Events
        this.queues.fullSync.on('completed', (job, result) => {
            this.logger.info('Full sync tamamlandı', {
                jobId: job.id,
                duration: result.duration,
                processed: result.processed
            });
        });

        this.queues.fullSync.on('failed', (job, err) => {
            this.logger.error('Full sync başarısız', {
                jobId: job.id,
                error: err.message
            });
        });

        // Light Sync Events
        this.queues.lightSync.on('completed', (job, result) => {
            this.logger.info('Light sync tamamlandı', {
                jobId: job.id,
                duration: result.duration,
                updated: result.updated
            });
        });

        this.queues.lightSync.on('failed', (job, err) => {
            this.logger.error('Light sync başarısız', {
                jobId: job.id,
                error: err.message
            });
        });
    }

    /**
     * Full sync işlemini çalıştır
     */
    async processFullSync(job) {
        const startTime = Date.now();

        if (this.syncLock.fullSync) {
            throw new Error('Full sync zaten çalışıyor');
        }

        this.syncLock.fullSync = true;

        try {
            this.logger.info('Full Senkronizasyon Başladı', {
                jobId: job.id,
                timestamp: new Date().toISOString()
            });

            const progressCallback = (progressData) => {
                try {
                    job.progress(progressData);
                } catch (e) {
                    // Progress güncelleme hatası sessizce geç
                }
            };

            const result = await this.diaService.fullSync(progressCallback);

            await job.progress({ percent: 100, step: 8, totalSteps: 8, message: 'Tamamlandı' });

            const duration = Date.now() - startTime;

            this.logger.info('=== Full Senkronizasyon Tamamlandı ===', {
                jobId: job.id,
                duration: `${duration}ms`,
                result
            });

            return {
                success: true,
                duration: `${duration}ms`,
                ...result
            };

        } catch (error) {
            this.logger.error('Full Senkronizasyon hatası', {
                jobId: job.id,
                error: error.message,
                stack: error.stack
            });
            throw error;

        } finally {
            this.syncLock.fullSync = false;
        }
    }

    /**
     * Light sync işlemini çalıştır (Fiyat + Stok)
     */
    async processLightSync(job) {
        const startTime = Date.now();

        // Full sync çalışıyorsa light sync'i atla
        if (this.syncLock.fullSync) {
            this.logger.info('Full sync çalışıyor, light sync atlanıyor', { jobId: job.id });
            return { success: true, skipped: true, reason: 'fullSync çalışıyor' };
        }

        // Sync guard
        if (this.syncLock.lightSync) {
            this.logger.info('Light sync zaten çalışıyor, atlanıyor', { jobId: job.id });
            return { success: true, skipped: true, reason: 'lightSync zaten çalışıyor' };
        }

        this.syncLock.lightSync = true;

        try {
            this.logger.info('=== LIGHT SYNC BAŞLANGICI (Fiyat + Stok) ===', {
                jobId: job.id,
                timestamp: new Date().toISOString()
            });

            await job.progress(25);

            // 1. Fiyat güncelleme
            const priceResult = await this.diaService.syncOnlyPrices();

            await job.progress(75);

            // 2. Stok güncelleme
            const stockResult = await this.diaService.syncOnlyStocks();

            await job.progress(100);

            const duration = Date.now() - startTime;

            this.logger.info('=== LIGHT SYNC TAMAMLANDI ===', {
                jobId: job.id,
                duration: `${duration}ms`,
                priceUpdated: priceResult.updated,
                stockUpdated: stockResult.updated
            });

            return {
                success: true,
                duration: `${duration}ms`,
                priceResult,
                stockResult
            };

        } catch (error) {
            this.logger.error('Light sync hatası', {
                jobId: job.id,
                error: error.message,
                stack: error.stack
            });
            throw error;

        } finally {
            this.syncLock.lightSync = false;
        }
    }

    /**
     * Zamanlanmış job'ları ayarla
     */
    async setupScheduledJobs() {
        try {
            const DiaSettings = require('../models/plugins/dia/DiaSettings');
            const settings = await DiaSettings.getSettings();

            // DB'den saat ve aralık al
            const fullSyncSaat = settings?.sync?.fullSyncSaat || '05:00';
            const lightSyncAraligi = settings?.sync?.lightSyncAraligi || 15;

            // Saat'i cron formatına çevir (ör: "05:00" -> "0 5 * * *")
            const [saat, dakika] = fullSyncSaat.split(':').map(Number);
            const fullSyncCron = `${dakika || 0} ${saat || 5} * * *`;
            const lightSyncCron = `*/${lightSyncAraligi} * * * *`;

            // Eski repeat job'ları temizle
            const existingFullRepeats = await this.queues.fullSync.getRepeatableJobs();
            for (const job of existingFullRepeats) {
                await this.queues.fullSync.removeRepeatableByKey(job.key);
            }
            const existingLightRepeats = await this.queues.lightSync.getRepeatableJobs();
            for (const job of existingLightRepeats) {
                await this.queues.lightSync.removeRepeatableByKey(job.key);
            }

            // Full Sync
            await this.queues.fullSync.add(
                'scheduled-full-sync',
                { type: 'scheduled' },
                {
                    repeat: { cron: fullSyncCron, tz: 'Europe/Istanbul' },
                    timeout: workerConfig.worker.timeout
                }
            );

            // Light Sync
            await this.queues.lightSync.add(
                'scheduled-light-sync',
                { type: 'scheduled' },
                {
                    repeat: { cron: lightSyncCron, tz: 'Europe/Istanbul' },
                    timeout: workerConfig.worker.lightSyncTimeout
                }
            );

            this.logger.info('Zamanlanmis joblar ayarlandi', {
                fullSync: `${fullSyncCron} (${fullSyncSaat})`,
                lightSync: `${lightSyncCron} (her ${lightSyncAraligi} dk)`
            });

        } catch (error) {
            this.logger.error('Scheduled job ayarlama hatasi:', error);
            throw error;
        }
    }

    /**
     * Manuel sync tetikle
     */
    async triggerManualSync(type = 'light') {
        try {
            if (type === 'full') {
                const job = await this.queues.fullSync.add(
                    'manual-full-sync',
                    { type: 'manual', triggeredBy: 'admin' },
                    { timeout: workerConfig.worker.timeout }
                );
                return { jobId: job.id, type: 'full', status: 'queued' };
            } else {
                const job = await this.queues.lightSync.add(
                    'manual-light-sync',
                    { type: 'manual', triggeredBy: 'admin' },
                    { timeout: workerConfig.worker.lightSyncTimeout }
                );
                return { jobId: job.id, type: 'light', status: 'queued' };
            }
        } catch (error) {
            this.logger.error('Manuel sync tetikleme hatası:', error);
            throw error;
        }
    }

    /**
     * Queue durumunu getir
     */
    async getStatus() {
        try {
            const [fullSyncCounts, lightSyncCounts] = await Promise.all([
                this.queues.fullSync.getJobCounts(),
                this.queues.lightSync.getJobCounts()
            ]);

            return {
                fullSync: {
                    ...fullSyncCounts,
                    isLocked: this.syncLock.fullSync
                },
                lightSync: {
                    ...lightSyncCounts,
                    isLocked: this.syncLock.lightSync
                }
            };
        } catch (error) {
            this.logger.error('Status alma hatası:', error);
            throw error;
        }
    }

    /**
     * Queue'ları temizle
     */
    async cleanQueues() {
        try {
            await Promise.all([
                this.queues.fullSync.clean(24 * 3600 * 1000, 'completed'),
                this.queues.fullSync.clean(7 * 24 * 3600 * 1000, 'failed'),
                this.queues.lightSync.clean(24 * 3600 * 1000, 'completed'),
                this.queues.lightSync.clean(7 * 24 * 3600 * 1000, 'failed')
            ]);

            this.logger.info('Queue\'lar temizlendi');
        } catch (error) {
            this.logger.error('Queue temizleme hatası:', error);
        }
    }

    /**
     * Worker'ı kapat
     */
    async close() {
        try {
            await Promise.all([
                this.queues.fullSync.close(),
                this.queues.lightSync.close()
            ]);

            this.logger.info('DIA Worker kapatıldı');
        } catch (error) {
            this.logger.error('Worker kapatma hatası:', error);
        }
    }
}

module.exports = DiaWorker;