const cron = require('node-cron');
const winston = require('winston');
const DiaStockService = require('./DiaStockService');
const CacheManager = require('../../../../../../packages/cache');

const { getBasicFilters, logFilterConfig } = require('../../../config/diaFilters');

class DiaStockScheduler {
  constructor() {
    this.diaStockService = new DiaStockService();
    this.cache = new CacheManager();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'dia-stock-scheduler' },
      transports: [
        new winston.transports.File({ filename: 'logs/scheduler.log' }),
        new winston.transports.Console()
      ]
    });

    // Scheduler durumu
    this.schedulerStatus = {
      fullSyncRunning: false,
      incrementalSyncRunning: false,
      lastFullSync: null,
      lastIncrementalSync: null,
      nextFullSync: null,
      nextIncrementalSync: null
    };

    // Cron job'ları
    this.cronJobs = {};
  }

  /**
   * Scheduler'ı başlat
   */
  start() {
    try {
      this.logger.info('DIA Stock Scheduler başlatılıyor...');

      // Günlük tam senkronizasyon - Her gün saat 05:00
      this.cronJobs.fullSync = cron.schedule('0 5 * * *', async () => {
        await this.runFullSync();
      }, {
        scheduled: true,
        timezone: 'Europe/Istanbul'
      });

      // Artımlı senkronizasyon devre dışı bırakıldı - sadece günlük sync
      // this.cronJobs.incrementalSync = cron.schedule('0 8-18 * * 1-6', async () => {
      //   await this.runIncrementalSync();
      // }, {
      //   scheduled: true,
      //   timezone: 'Europe/Istanbul'
      // });

      // 15 dakikada bir cache temizleme
      this.cronJobs.cacheCleanup = cron.schedule('*/15 * * * *', async () => {
        await this.cleanupCache();
      }, {
        scheduled: true,
        timezone: 'Europe/Istanbul'
      });

      // Haftalık performans raporu - Her pazar 20:00
      this.cronJobs.weeklyReport = cron.schedule('0 20 * * 0', async () => {
        await this.generateWeeklyReport();
      }, {
        scheduled: true,
        timezone: 'Europe/Istanbul'
      });
      this.updateSchedulerStatus();

    } catch (error) {
      this.logger.error('Scheduler başlatma hatası:', error);
      throw error;
    }
  }

  /**
   * Scheduler'ı durdur
   */
  stop() {
    try {
      this.logger.info('Scheduler durduruluyor...');

      Object.keys(this.cronJobs).forEach(jobName => {
        if (this.cronJobs[jobName]) {
          this.cronJobs[jobName].stop();
          // node-cron'da destroy() metodu yok, sadece stop() kullanıyoruz
        }
      });

      this.cronJobs = {};
      this.logger.info('Scheduler başarıyla durduruldu');
    } catch (error) {
      this.logger.error('Scheduler durdurma hatası:', error);
    }
  }

  /**
   * Tam senkronizasyon çalıştır
   */
  async runFullSync() {
    if (this.schedulerStatus.fullSyncRunning) {
      this.logger.warn('Tam senkronizasyon zaten çalışıyor, atlanıyor');
      return;
    }

    try {
      this.schedulerStatus.fullSyncRunning = true;
      this.logger.info('Zamanlanmış tam senkronizasyon başlatılıyor');

      const startTime = Date.now();
      const result = await this.diaStockService.fullSync();
      const duration = Date.now() - startTime;

      this.schedulerStatus.lastFullSync = new Date();
      this.schedulerStatus.fullSyncRunning = false;

      this.logger.info('Zamanlanmış tam senkronizasyon tamamlandı', {
        duration: `${duration}ms`,
        processed: result.processed,
        inserted: result.inserted,
        updated: result.updated,
        errors: result.errors.length,
        categories: {
          created: result.categories?.created || 0,
          updated: result.categories?.updated || 0
        }
      });

      // Cache'i temizle
      await this.cache.invalidateSearchCache();

      // Başarı bildirimini cache'e kaydet
      await this.cache.set('dia-sync:last-full-sync', JSON.stringify({
        timestamp: new Date(),
        result: result,
        duration: duration
      }), 86400); // 24 saat

    } catch (error) {
      this.schedulerStatus.fullSyncRunning = false;
      this.logger.error('Zamanlanmış tam senkronizasyon hatası:', error);

      // Hata bildirimini cache'e kaydet
      await this.cache.set('dia-sync:last-full-sync-error', JSON.stringify({
        timestamp: new Date(),
        error: error.message
      }), 86400);
    }
  }

  /**
   * Artımlı senkronizasyon çalıştır
   */
  async runIncrementalSync() {
    if (this.schedulerStatus.incrementalSyncRunning) {
      this.logger.warn('Artımlı senkronizasyon zaten çalışıyor, atlanıyor');
      return;
    }

    try {
      this.schedulerStatus.incrementalSyncRunning = true;
      this.logger.info('Zamanlanmış artımlı senkronizasyon başlatılıyor');

      const startTime = Date.now();
      const lastSyncDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // Son 2 saat
      const result = await this.diaStockService.incrementalSync(lastSyncDate);
      const duration = Date.now() - startTime;

      this.schedulerStatus.lastIncrementalSync = new Date();
      this.schedulerStatus.incrementalSyncRunning = false;

      this.logger.info('Zamanlanmış artımlı senkronizasyon tamamlandı', {
        duration: `${duration}ms`,
        processed: result.processed,
        inserted: result.inserted,
        updated: result.updated,
        errors: result.errors.length
      });

      // Cache'i kısmi temizle
      await this.invalidateRecentCache();

      // Başarı bildirimini cache'e kaydet
      await this.cache.set('dia-sync:last-incremental-sync', JSON.stringify({
        timestamp: new Date(),
        result: result,
        duration: duration
      }), 3600); // 1 saat

    } catch (error) {
      this.schedulerStatus.incrementalSyncRunning = false;
      this.logger.error('Zamanlanmış artımlı senkronizasyon hatası:', error);
    }
  }

  /**
   * Cache temizleme
   */
  async cleanupCache() {
    try {
      this.logger.info('Cache temizleme başlatılıyor');

      // Eski cache'leri temizle
      const keys = await this.cache.redis.keys('dia-stock:*');
      const expiredKeys = [];

      for (const key of keys) {
        const ttl = await this.cache.redis.ttl(key);
        if (ttl === -1) { // TTL yok, süresi dolmuş
          expiredKeys.push(key);
        }
      }

      if (expiredKeys.length > 0) {
        await this.cache.redis.del(...expiredKeys);
        this.logger.info(`${expiredKeys.length} eski cache temizlendi`);
      }

      // Memory kullanımını optimize et
      const memoryInfo = await this.cache.redis.info('memory');
      this.logger.info('Redis memory bilgisi:', memoryInfo.split('\r\n').slice(0, 5).join(', '));

    } catch (error) {
      this.logger.error('Cache temizleme hatası:', error);
    }
  }

  /**
   * Haftalık performans raporu oluştur
   */
  async generateWeeklyReport() {
    try {
      this.logger.info('Haftalık performans raporu oluşturuluyor...');

      const performanceReport = this.diaStockService.generatePerformanceReport();

      // Cache'e kaydet
      await this.cache.set('dia-sync:weekly-performance-report', JSON.stringify({
        timestamp: new Date(),
        report: performanceReport
      }), 7 * 24 * 3600); // 7 gün

      this.logger.info('Haftalık performans raporu oluşturuldu', {
        summary: performanceReport.summary,
        rating: performanceReport.performance.rating,
        recommendationCount: performanceReport.performance.recommendations.length
      });

      // Performans metriklerini sıfırla
      this.diaStockService.resetPerformanceMetrics();

    } catch (error) {
      this.logger.error('Haftalık performans raporu hatası:', error);
    }
  }

  /**
   * Scheduler durumunu güncelle
   */
  updateSchedulerStatus() {
    try {
      // Sonraki çalışma zamanlarını hesapla
      const now = new Date();

      // Sonraki tam senkronizasyon (yarın saat 02:00)
      const nextFullSync = new Date(now);
      nextFullSync.setDate(now.getDate() + 1);
      nextFullSync.setHours(2, 0, 0, 0);

      // Sonraki artımlı senkronizasyon (sonraki saat başı)
      const nextIncrementalSync = new Date(now);
      nextIncrementalSync.setHours(now.getHours() + 1, 0, 0, 0);

      this.schedulerStatus.nextFullSync = nextFullSync;
      this.schedulerStatus.nextIncrementalSync = nextIncrementalSync;

      // Durumu cache'e kaydet
      this.cache.set('dia-sync:scheduler-status', JSON.stringify(this.schedulerStatus), 300);

    } catch (error) {
      this.logger.error('Scheduler durumu güncelleme hatası:', error);
    }
  }

  /**
   * Güncel cache'leri invalidate et
   */
  async invalidateRecentCache() {
    try {
      const patterns = [
        'dia-stock:*',
        'search:*',
        'products:*'
      ];

      for (const pattern of patterns) {
        const keys = await this.cache.redis.keys(pattern);
        if (keys.length > 0) {
          await this.cache.redis.del(...keys);
        }
      }

      this.logger.info('Güncel cache\'ler temizlendi');
    } catch (error) {
      this.logger.error('Cache invalidation hatası:', error);
    }
  }

  /**
   * Manuel senkronizasyon tetikle
   */
  async triggerManualSync(type = 'incremental') {
    try {
      this.logger.info(`Manuel ${type} senkronizasyon tetikleniyor`);

      if (type === 'full') {
        if (this.schedulerStatus.fullSyncRunning) {
          throw new Error('Tam senkronizasyon zaten çalışıyor');
        }
        return await this.runFullSync();
      } else {
        if (this.schedulerStatus.incrementalSyncRunning) {
          throw new Error('Artımlı senkronizasyon zaten çalışıyor');
        }
        return await this.runIncrementalSync();
      }

    } catch (error) {
      this.logger.error('Manuel senkronizasyon hatası:', error);
      throw error;
    }
  }

  /**
   * Scheduler durumunu getir
   */
  getSchedulerStatus() {
    return {
      ...this.schedulerStatus,
      cronJobs: Object.keys(this.cronJobs).map(jobName => ({
        name: jobName,
        running: this.cronJobs[jobName] ? this.cronJobs[jobName].running : false
      }))
    };
  }

  /**
   * Belirli saatlerde çalışacak custom cron job ekle
   */
  addCustomSchedule(name, cronExpression, callback) {
    try {
      if (this.cronJobs[name]) {
        this.logger.warn(`Cron job zaten mevcut: ${name}`);
        return false;
      }

      this.cronJobs[name] = cron.schedule(cronExpression, callback, {
        scheduled: true,
        timezone: 'Europe/Istanbul'
      });

      this.logger.info(`Custom cron job eklendi: ${name}`);
      return true;

    } catch (error) {
      this.logger.error(`Custom cron job ekleme hatası: ${name}`, error);
      return false;
    }
  }

  /**
   * Custom cron job'ı kaldır
   */
  removeCustomSchedule(name) {
    try {
      if (this.cronJobs[name]) {
        this.cronJobs[name].stop();
        // node-cron'da destroy() metodu yok, sadece stop() kullanıyoruz
        delete this.cronJobs[name];
        this.logger.info(`Custom cron job kaldırıldı: ${name}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Custom cron job kaldırma hatası: ${name}`, error);
      return false;
    }
  }
}

module.exports = DiaStockScheduler; 