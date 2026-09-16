// apps/api/src/workers/DiaWorker.js

const Queue = require('bull');
const winston = require('winston');
const workerConfig = require('../config/worker.config');
const DiaStockService = require('../services/plugins/dia/DiaStockService');
const { withDiaLock, B2B_LOCK_KEY } = require('../services/plugins/dia/diaLock');
const { syncB2bCari } = require('../services/plugins/dia/b2bCariSync');
const { syncB2bAddresses } = require('../services/plugins/dia/b2bAddress');

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
            lightSync: false,
            stockSync: false
        };

        // Bull Queue'ları oluştur
        const queueSettings = {
            stalledInterval: 1800000,
            maxStalledCount: 2,
            lockDuration: 600000, // uzun CPU bloklarında kilit düşmesin (10 dk)
            lockRenewTime: 60000
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
            }),
            stockSync: new Queue('dia-stock-sync', {
                redis: workerConfig.redis,
                defaultJobOptions: workerConfig.queue.defaultJobOptions,
                settings: queueSettings
            }),
            xmlSync: new Queue('xml-full-sync', {
                redis: workerConfig.redis,
                defaultJobOptions: workerConfig.queue.defaultJobOptions,
                settings: queueSettings
            }),
            tagSync: new Queue('tag-sync', {
                redis: workerConfig.redis,
                defaultJobOptions: workerConfig.queue.defaultJobOptions,
                settings: queueSettings
            }),
            // b2b cari bilgileri (bakiye/limit/segment) DIA'dan Mongo'ya sync
            b2bCariSync: new Queue('b2b-cari-sync', {
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
        // Tüm DIA işleri tek WS oturumunu paylaştığı için (DIA aynı kullanıcıda
        // tek oturuma izin verir), süreçler-arası DIA kilidiyle SIRAYA alınırlar
        // — asla üst üste binmez. Kilit "en iyi çaba"dır (Redis yoksa iş çalışır).
        // Full Sync - Scheduled job processor
        this.queues.fullSync.process('scheduled-full-sync', (job) => {
            return withDiaLock(() => this.processFullSync(job), { label: 'fullSync' });
        });
        // Full Sync - Manual job processor
        this.queues.fullSync.process('manual-full-sync', (job) => {
            return withDiaLock(() => this.processFullSync(job), { label: 'fullSync(manual)' });
        });
        // Light Sync - Scheduled job processor
        this.queues.lightSync.process('scheduled-light-sync', (job) => {
            return withDiaLock(() => this.processLightSync(job), { label: 'lightSync' });
        });
        // Light Sync - Manual job processor
        this.queues.lightSync.process('manual-light-sync', (job) => {
            return withDiaLock(() => this.processLightSync(job), { label: 'lightSync(manual)' });
        });
        // Stok Sync - saatlik tam stok taraması
        this.queues.stockSync.process('scheduled-stock-sync', (job) => {
            return withDiaLock(() => this.processStockSync(job), { label: 'stockSync' });
        });
        this.queues.stockSync.process('manual-stock-sync', (job) => {
            return withDiaLock(() => this.processStockSync(job), { label: 'stockSync(manual)' });
        });
        this.queues.xmlSync.process('manual-xml-sync', (job) => {
            return withDiaLock(() => this.processXmlSync(job), { label: 'xmlSync' });
        });
        this.queues.tagSync.process('scheduled-tag-sync', (job) => {
            return withDiaLock(() => this.processTagSync(job), { label: 'tagSync' });
        });
        this.queues.tagSync.process('manual-tag-sync', (job) => {
            return withDiaLock(() => this.processTagSync(job), { label: 'tagSync(manual)' });
        });
        // b2b cari sync — b2b farklı DIA kullanıcısı (ws_ART_B2B) kullandığı için
        // AYRI kilitte (B2B_LOCK_KEY) çalışır; worker'ın Ws_alastik_B2C senkronlarını
        // beklemez, onları bloklamaz. Kendi içinde (b2b sipariş/adres) sıraya girer.
        this.queues.b2bCariSync.process('scheduled-b2b-cari-sync', (job) => {
            return withDiaLock(() => this.processB2bCariSync(job), { label: 'b2bCariSync', key: B2B_LOCK_KEY, waitMs: 300000 });
        });
        this.queues.b2bCariSync.process('manual-b2b-cari-sync', (job) => {
            return withDiaLock(() => this.processB2bCariSync(job), { label: 'b2bCariSync(manual)', key: B2B_LOCK_KEY, waitMs: 300000 });
        });
        // b2b adres sync (günlük, cari başına çağrı — uzun sürer, gece çalışır)
        this.queues.b2bCariSync.process('scheduled-b2b-address-sync', (job) => {
            return withDiaLock(() => this.processB2bAddressSync(job), { label: 'b2bAddressSync', key: B2B_LOCK_KEY, waitMs: 300000 });
        });
        this.queues.b2bCariSync.process('manual-b2b-address-sync', (job) => {
            return withDiaLock(() => this.processB2bAddressSync(job), { label: 'b2bAddressSync(manual)', key: B2B_LOCK_KEY, waitMs: 300000 });
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

        // Stok Sync Events
        this.queues.stockSync.on('completed', (job, result) => {
            this.logger.info('Stok sync tamamlandı', {
                jobId: job.id,
                duration: result.duration,
                updated: result.updated
            });
        });

        this.queues.stockSync.on('failed', (job, err) => {
            this.logger.error('Stok sync başarısız', {
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
            result.labelImages = await this.reorderLabelImagesSafely('full');

            await job.progress({ percent: 100, step: 9, totalSteps: 9, message: 'Tamamlandı' });
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
     * Senkron sonrası etiket görsel sıralaması; hata senkronu düşürmez, sadece loglanır.
     */
    async reorderLabelImagesSafely(syncType) {
        try {
            return await this.diaService.reorderLabelImages();
        } catch (error) {
            this.logger.error('Etiket görsel sıralaması başarısız', { syncType, error: error.message });
            return { error: error.message };
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
            this.logger.info('=== LIGHT SYNC BAŞLANGICI (Tarih Filtreli Kart Senkronu) ===', {
                jobId: job.id,
                timestamp: new Date().toISOString()
            });

            await job.progress(25);

            // Kontör dostu: yalnızca DIA'da değişen kartlar çekilir (fiyat, ad, görsel, kategori).
            // Stoklar kart tarihini değiştirmediği için ayrı saatlik stok taramasıyla güncellenir.
            const result = await this.diaService.syncChangedCards();
            result.labelImages = await this.reorderLabelImagesSafely('light');

            await job.progress(100);

            const duration = Date.now() - startTime;

            this.logger.info('=== LIGHT SYNC TAMAMLANDI ===', {
                jobId: job.id,
                duration: `${duration}ms`,
                since: result.since,
                processed: result.processed,
                updated: result.updated
            });

            return {
                success: true,
                duration: `${duration}ms`,
                ...result
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
     * b2b cari bilgileri sync (bakiye/limit/segment) — DIA'dan Mongo'ya.
     * b2b DIA kullanıcısı (ws_ART_B2B) ile, ayrı kilitte çalışır.
     */
    async processB2bCariSync(job) {
        const t0 = Date.now();
        this.logger.info('=== B2B CARİ SYNC BAŞLANGICI ===', { jobId: job.id, timestamp: new Date().toISOString() });
        try {
            const r = await syncB2bCari(this.logger);
            this.logger.info('=== B2B CARİ SYNC TAMAMLANDI ===', { ...r, duration: `${Date.now() - t0}ms` });
            return { success: true, ...r };
        } catch (error) {
            this.logger.error('B2B cari sync hatası', { jobId: job.id, error: error.message });
            throw error;
        }
    }

    /** b2b cari adresleri sync (günlük, cari başına çağrı) → WebMember.diaCari.addresses */
    async processB2bAddressSync(job) {
        const t0 = Date.now();
        this.logger.info('=== B2B ADRES SYNC BAŞLANGICI ===', { jobId: job.id, timestamp: new Date().toISOString() });
        try {
            const r = await syncB2bAddresses(this.logger);
            this.logger.info('=== B2B ADRES SYNC TAMAMLANDI ===', { ...r, duration: `${Date.now() - t0}ms` });
            return { success: true, ...r };
        } catch (error) {
            this.logger.error('B2B adres sync hatası', { jobId: job.id, error: error.message });
            throw error;
        }
    }

    /**
     * Saatlik stok senkronu (tam tarama — stok hareketleri kart _date'ini
     * değiştirmediği için tarih filtresiyle yakalanamaz)
     */
    async processStockSync(job) {
        const startTime = Date.now();

        if (this.syncLock.fullSync) {
            this.logger.info('Full sync çalışıyor, stok sync atlanıyor', { jobId: job.id });
            return { success: true, skipped: true, reason: 'fullSync çalışıyor' };
        }
        if (this.syncLock.lightSync) {
            this.logger.info('Light sync çalışıyor, stok sync atlanıyor', { jobId: job.id });
            return { success: true, skipped: true, reason: 'lightSync çalışıyor' };
        }
        if (this.syncLock.stockSync) {
            this.logger.info('Stok sync zaten çalışıyor, atlanıyor', { jobId: job.id });
            return { success: true, skipped: true, reason: 'stockSync zaten çalışıyor' };
        }

        this.syncLock.stockSync = true;

        try {
            this.logger.info('=== STOK SYNC BAŞLANGICI (Saatlik Tam Tarama) ===', {
                jobId: job.id,
                timestamp: new Date().toISOString()
            });

            await job.progress(25);
            const result = await this.diaService.syncOnlyStocks();
            await job.progress(70);
            // Tam MASLAK+MERKEZ tazelemesi: incremental stok sync'in kaçırdığı
            // stok-hareketi (kart _date'i değişmeyen) değişikliklerini yakalar.
            const depotResult = await this.diaService.refreshWebDepotStock();
            this.logger.info('Web stok tazeleme (stockSync içinde)', depotResult);
            await job.progress(100);

            const duration = Date.now() - startTime;
            this.logger.info('=== STOK SYNC TAMAMLANDI ===', {
                jobId: job.id,
                duration: `${duration}ms`,
                updated: result.updated
            });

            return { success: true, duration: `${duration}ms`, ...result };

        } catch (error) {
            this.logger.error('Stok sync hatası', {
                jobId: job.id,
                error: error.message,
                stack: error.stack
            });
            throw error;

        } finally {
            this.syncLock.stockSync = false;
        }
    }
    async processXmlSync(job) {
        const startTime = Date.now();

        if (this.syncLock.fullSync) {
            this.logger.info('Full sync çalışıyor, XML sync atlanıyor', { jobId: job.id });
            return { success: true, skipped: true, reason: 'fullSync çalışıyor' };
        }

        // MongoDB bağlantı kontrolü — bağlı değilse 30 saniyeye kadar bekle
        const mongoose = require('mongoose');
        const waitForConnection = async () => {
            const maxWaitMs = 30000;
            const checkInterval = 500;
            let waited = 0;
            while (mongoose.connection.readyState !== 1 && waited < maxWaitMs) {
                await new Promise(r => setTimeout(r, checkInterval));
                waited += checkInterval;
            }
            return mongoose.connection.readyState === 1;
        };

        const isConnected = await waitForConnection();
        if (!isConnected) {
            this.logger.error('MongoDB bağlantısı kurulamadı, XML sync atlanıyor', {
                jobId: job.id,
                readyState: mongoose.connection.readyState
            });
            throw new Error('MongoDB bağlantısı kurulamadı (30s timeout)');
        }

        try {
            this.logger.info('=== XML FULL SYNC BAŞLANGICI ===', {
                jobId: job.id,
                timestamp: new Date().toISOString()
            });

            const XmlSyncScheduler = require('../services/plugins/xml/XmlSyncScheduler');
            const XmlDiaMatchService = require('../services/plugins/xml/XmlDiaMatchService');
            const XmlWebProductSyncService = require('../services/plugins/xml/XmlWebProductSyncService');
            const WebXml = require('../models/plugins/xml/WebXml');

            // 1. Aktif XML kaynaklarından ürün çek (job.data.site verilmişse sadece o site)
            const jobSite = job.data?.site || null;
            await job.progress({ percent: 10, message: 'XML kaynakları çekiliyor...' });
            const integrations = await WebXml.find({ isActive: true, ...(jobSite ? { site: jobSite } : {}) });
            for (const intg of integrations) {
                try {
                    await XmlSyncScheduler.syncIntegration(intg);
                } catch (err) {
                    this.logger.error(`XML sync hatası: ${intg.name}`, { error: err.message });
                }
            }

            // 2. DIA match — manuel tetiklemede canlı DIA'dan, zamanlanmışta diastocks aynasından okunur
            const useLiveDia = job.data?.type === 'manual';
            await job.progress({ percent: 40, message: 'DIA eşleştirme yapılıyor...' });
            const matchResult = await XmlDiaMatchService.matchAll({ useLiveDia });
            this.logger.info('XML-DIA eşleştirme tamamlandı', matchResult);

            // 3. WebProducts sync (site verilmişse o sitenin kapsamında)
            await job.progress({ percent: 80, message: 'Fiyatlar webproducts\'a aktarılıyor...' });
            const syncResult = await XmlWebProductSyncService.fullSync(jobSite);
            this.logger.info('XML web sync tamamlandı', syncResult);

            await job.progress({ percent: 100, message: 'Tamamlandı' });

            const duration = Date.now() - startTime;
            this.logger.info('=== XML FULL SYNC TAMAMLANDI ===', {
                jobId: job.id,
                duration: `${duration}ms`,
                matchResult,
                syncResult
            });

            return { success: true, duration: `${duration}ms`, matchResult, syncResult };

        } catch (error) {
            this.logger.error('XML full sync hatası', {
                jobId: job.id,
                error: error.message
            });
            throw error;
        }
    }
    /**
     * Tag sync işlemini çalıştır (Lastik etiketleri)
     */
    async processTagSync(job) {
        const startTime = Date.now();

        if (this.syncLock.fullSync) {
            this.logger.info('Full sync çalışıyor, tag sync atlanıyor', { jobId: job.id });
            return { success: true, skipped: true, reason: 'fullSync çalışıyor' };
        }

        try {
            this.logger.info('=== TAG SYNC BAŞLANGICI ===', {
                jobId: job.id,
                timestamp: new Date().toISOString()
            });

            const TireTagSyncService = require('../services/plugins/tag/TireTagSyncService');

            await job.progress({ percent: 10, message: 'Lastik etiketleri senkronize ediliyor...' });

            const { stats } = await TireTagSyncService.sync({
                dryRun: false,
                limit: 0,
                onProgress: ({ processed, total }) => {
                    const percent = Math.min(95, 10 + Math.floor((processed / total) * 85));
                    job.progress({ percent, message: `${processed}/${total} ürün işlendi` }).catch(() => { });
                }
            });

            await job.progress({ percent: 100, message: 'Tamamlandı' });

            const duration = Date.now() - startTime;

            this.logger.info('=== TAG SYNC TAMAMLANDI ===', {
                jobId: job.id,
                duration: `${duration}ms`,
                stats
            });

            return {
                success: true,
                duration: `${duration}ms`,
                stats
            };

        } catch (error) {
            this.logger.error('Tag sync hatası', {
                jobId: job.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
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
            const [fsSaat, fsDakika] = fullSyncSaat.split(':').map(Number);
            const xmlSaat = (fsSaat + 2) % 24;
            const xmlSyncSaat = `${String(xmlSaat).padStart(2, '0')}:${String(fsDakika).padStart(2, '0')}`;

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
            const existingStockRepeats = await this.queues.stockSync.getRepeatableJobs();
            for (const job of existingStockRepeats) {
                await this.queues.stockSync.removeRepeatableByKey(job.key);
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

            // Stok Sync — saatlik tam stok taraması (:10'da, light sync ile çakışmasın)
            const stockSyncCron = workerConfig.sync.stockSync.schedule;
            await this.queues.stockSync.add(
                'scheduled-stock-sync',
                { type: 'scheduled' },
                {
                    repeat: { cron: stockSyncCron, tz: 'Europe/Istanbul' },
                    timeout: workerConfig.worker.lightSyncTimeout
                }
            );

            // b2b Cari Sync — her 30 dk (:05,:35). b2b DIA kullanıcısı (ws_ART_B2B)
            // ile ayrı kilitte; worker'ın Ws_alastik_B2C senkronlarını beklemez.
            const b2bCariCron = process.env.B2B_CARI_SYNC_CRON || '5,35 * * * *';
            const existingB2bRepeats = await this.queues.b2bCariSync.getRepeatableJobs();
            for (const job of existingB2bRepeats) {
                await this.queues.b2bCariSync.removeRepeatableByKey(job.key);
            }
            await this.queues.b2bCariSync.add(
                'scheduled-b2b-cari-sync',
                { type: 'scheduled' },
                {
                    repeat: { cron: b2bCariCron, tz: 'Europe/Istanbul' },
                    timeout: 1800000
                }
            );

            // b2b Adres Sync — günlük (04:00). Cari başına çağrı gerektiği için uzun
            // sürer (~birkaç dk), gece çalışır. Gün içinde /adres eklenince + ilk
            // erişimde lazy doldurmayla zaten güncel kalır.
            const b2bAddressCron = process.env.B2B_ADRES_SYNC_CRON || '0 4 * * *';
            await this.queues.b2bCariSync.add(
                'scheduled-b2b-address-sync',
                { type: 'scheduled' },
                {
                    repeat: { cron: b2bAddressCron, tz: 'Europe/Istanbul' },
                    timeout: 3600000
                }
            );

            const [xmlS, xmlD] = xmlSyncSaat.split(':').map(Number);
            const xmlSyncCron = `${xmlD} ${xmlS} * * *`;

            const existingXmlRepeats = await this.queues.xmlSync.getRepeatableJobs();
            for (const job of existingXmlRepeats) {
                await this.queues.xmlSync.removeRepeatableByKey(job.key);
            }
            await this.queues.xmlSync.add(
                'manual-xml-sync',
                { type: 'scheduled' },
                {
                    repeat: { cron: xmlSyncCron, tz: 'Europe/Istanbul' },
                    timeout: 3600000
                }
            );

            // Tag Sync - XML sync + 1 saat
            const tagSaat = (xmlS + 1) % 24;
            const tagSyncSaat = `${String(tagSaat).padStart(2, '0')}:${String(xmlD).padStart(2, '0')}`;
            const tagSyncCron = `${xmlD} ${tagSaat} * * *`;

            const existingTagRepeats = await this.queues.tagSync.getRepeatableJobs();
            for (const job of existingTagRepeats) {
                await this.queues.tagSync.removeRepeatableByKey(job.key);
            }
            await this.queues.tagSync.add(
                'scheduled-tag-sync',
                { type: 'scheduled' },
                {
                    repeat: { cron: tagSyncCron, tz: 'Europe/Istanbul' },
                    timeout: 1800000
                }
            );

            this.logger.info('Zamanlanmış joblar kuruldu', {
                fullSync: `${fullSyncCron} (${fullSyncSaat})`,
                lightSync: `${lightSyncCron} (her ${lightSyncAraligi} dakika)`,
                xmlSync: `${xmlSyncCron} (${xmlSyncSaat})`,
                tagSync: `${tagSyncCron} (${tagSyncSaat})`
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
            } else if (type === 'tag') {
                const job = await this.queues.tagSync.add(
                    'manual-tag-sync',
                    { type: 'manual', triggeredBy: 'admin' },
                    { timeout: 1800000 }
                );
                return { jobId: job.id, type: 'tag', status: 'queued' };
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
      * Graceful shutdown — çalışan job'un bitmesini bekle, sonra kapat
      */
    async gracefulShutdown(timeoutMs = 60000) {
        try {
            this.logger.info(`Graceful shutdown başladı (timeout: ${timeoutMs}ms)`);

            // 1. Yeni job almayı durdur (tüm queue'lar)
            await Promise.all(Object.values(this.queues).map(q => q.pause(true).catch(() => null)));
            this.logger.info('Tüm queue\'lar pause edildi');

            // 2. Aktif çalışan job var mı kontrol et, bitmesini bekle
            const startedAt = Date.now();
            while (Date.now() - startedAt < timeoutMs) {
                const activeCounts = await Promise.all(
                    Object.values(this.queues).map(q => q.getActiveCount().catch(() => 0))
                );
                const totalActive = activeCounts.reduce((a, b) => a + b, 0);

                if (totalActive === 0) {
                    this.logger.info('Tüm aktif job\'lar tamamlandı');
                    break;
                }

                this.logger.info(`${totalActive} aktif job bekleniyor...`);
                await new Promise(r => setTimeout(r, 2000));
            }

            // 3. Tüm queue'ları kapat
            await this.close();

        } catch (error) {
            this.logger.error('Graceful shutdown hatası:', error);
        }
    }

    /**
     * Worker'ı kapat
     */
    async close() {
        try {
            await Promise.all(Object.values(this.queues).map(q => q.close().catch(() => null)));
            this.logger.info('DIA Worker kapatıldı');
        } catch (error) {
            this.logger.error('Worker kapatma hatası:', error);
        }
    }
}

module.exports = DiaWorker;