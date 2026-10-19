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

    this.schedulerStatus = {
      fullSyncRunning: false,
      incrementalSyncRunning: false,
      lastFullSync: null,
      lastIncrementalSync: null,
      nextFullSync: null,
      nextIncrementalSync: null
    };

    this.cronJobs = {};
  }

  start() {
    try {
      this.logger.info('DIA Stock Scheduler başlatılıyor...');

      this.cronJobs.fullSync = cron.schedule('0 5 * * *', async () => {
        await this.runFullSync();
      }, {
        scheduled: true,
        timezone: 'Europe/Istanbul'
      });

      this.cronJobs.cacheCleanup = cron.schedule('*/15 * * * *', async () => {
        await this.cleanupCache();
      }, {
        scheduled: true,
        timezone: 'Europe/Istanbul'
      });

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

  stop() {
    try {
      this.logger.info('Scheduler durduruluyor...');

      Object.keys(this.cronJobs).forEach(jobName => {
        if (this.cronJobs[jobName]) {
          this.cronJobs[jobName].stop();
        }
      });

      this.cronJobs = {};
      this.logger.info('Scheduler başarıyla durduruldu');
    } catch (error) {
      this.logger.error('Scheduler durdurma hatası:', error);
    }
  }

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
      this.logger.info('XML ürünleri DIA sync başlıyor...');
      const XmlDiaMatchService = require('../xml/XmlDiaMatchService');
      const XmlWebProductSyncService = require('../xml/XmlWebProductSyncService');
      const xmlMatchResult = await XmlDiaMatchService.matchAll();
      this.logger.info('XML DIA match tamamlandı', xmlMatchResult);
      const xmlSyncResult = await XmlWebProductSyncService.fullSync();
      this.logger.info('XML web sync tamamlandı', xmlSyncResult);
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

      await this.cache.invalidateSearchCache();

      await this.cache.set('dia-sync:last-full-sync', JSON.stringify({
        timestamp: new Date(),
        result: result,
        duration: duration
      }), 86400);

    } catch (error) {
      this.schedulerStatus.fullSyncRunning = false;
      this.logger.error('Zamanlanmış tam senkronizasyon hatası:', error);

      await this.cache.set('dia-sync:last-full-sync-error', JSON.stringify({
        timestamp: new Date(),
        error: error.message
      }), 86400);
    }
  }

  async runIncrementalSync() {
    if (this.schedulerStatus.incrementalSyncRunning) {
      this.logger.warn('Artımlı senkronizasyon zaten çalışıyor, atlanıyor');
      return;
    }

    try {
      this.schedulerStatus.incrementalSyncRunning = true;
      this.logger.info('Zamanlanmış artımlı senkronizasyon başlatılıyor');

      const startTime = Date.now();
      const lastSyncDate = new Date(Date.now() - 2 * 60 * 60 * 1000);
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

      await this.invalidateRecentCache();

      await this.cache.set('dia-sync:last-incremental-sync', JSON.stringify({
        timestamp: new Date(),
        result: result,
        duration: duration
      }), 3600);

    } catch (error) {
      this.schedulerStatus.incrementalSyncRunning = false;
      this.logger.error('Zamanlanmış artımlı senkronizasyon hatası:', error);
    }
  }

  async cleanupCache() {
    try {
      this.logger.info('Cache temizleme başlatılıyor');

      const keys = await this.cache.redis.keys('dia-stock:*');
      const expiredKeys = [];

      for (const key of keys) {
        const ttl = await this.cache.redis.ttl(key);
        if (ttl === -1) {
          expiredKeys.push(key);
        }
      }

      if (expiredKeys.length > 0) {
        await this.cache.redis.del(...expiredKeys);
        this.logger.info(`${expiredKeys.length} eski cache temizlendi`);
      }

      const memoryInfo = await this.cache.redis.info('memory');
      this.logger.info('Redis memory bilgisi:', memoryInfo.split('\r\n').slice(0, 5).join(', '));

    } catch (error) {
      this.logger.error('Cache temizleme hatası:', error);
    }
  }

  async generateWeeklyReport() {
    try {
      this.logger.info('Haftalık performans raporu oluşturuluyor...');

      const performanceReport = this.diaStockService.generatePerformanceReport();

      await this.cache.set('dia-sync:weekly-performance-report', JSON.stringify({
        timestamp: new Date(),
        report: performanceReport
      }), 7 * 24 * 3600);

      this.logger.info('Haftalık performans raporu oluşturuldu', {
        summary: performanceReport.summary,
        rating: performanceReport.performance.rating,
        recommendationCount: performanceReport.performance.recommendations.length
      });

      this.diaStockService.resetPerformanceMetrics();

    } catch (error) {
      this.logger.error('Haftalık performans raporu hatası:', error);
    }
  }

  updateSchedulerStatus() {
    try {
      const now = new Date();

      const nextFullSync = new Date(now);
      nextFullSync.setDate(now.getDate() + 1);
      nextFullSync.setHours(2, 0, 0, 0);

      const nextIncrementalSync = new Date(now);
      nextIncrementalSync.setHours(now.getHours() + 1, 0, 0, 0);

      this.schedulerStatus.nextFullSync = nextFullSync;
      this.schedulerStatus.nextIncrementalSync = nextIncrementalSync;

      this.cache.set('dia-sync:scheduler-status', JSON.stringify(this.schedulerStatus), 300);

    } catch (error) {
      this.logger.error('Scheduler durumu güncelleme hatası:', error);
    }
  }

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

  getSchedulerStatus() {
    return {
      ...this.schedulerStatus,
      cronJobs: Object.keys(this.cronJobs).map(jobName => ({
        name: jobName,
        running: this.cronJobs[jobName] ? this.cronJobs[jobName].running : false
      }))
    };
  }

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

  removeCustomSchedule(name) {
    try {
      if (this.cronJobs[name]) {
        this.cronJobs[name].stop();
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