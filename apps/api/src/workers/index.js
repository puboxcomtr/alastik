// apps/api/src/workers/index.js

const path = require('path');
const mongoose = require('mongoose');

// Environment yükle — API ile aynı modül; seçilen dosyada eksik olan anahtarlar
// diğerinden tamamlanır. Daha önce burası koşulsuz .env.production yüklüyordu ve
// o dosyada MONGODB_URI olmadığı için worker günlerce çöküp durmuştu.
require('../config/env').yukle();

const DiaWorker = require('./DiaWorker');

// Winston logger
const winston = require('winston');
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.simple()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/worker-startup.log' })
    ]
});

let worker = null;

/**
 * MongoDB bağlantısı
 */
async function connectDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE) || 15,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            family: 4
        });

        logger.info('✅ MongoDB bağlantısı başarılı (Worker)');
    } catch (error) {
        logger.error('❌ MongoDB bağlantı hatası:', error);
        process.exit(1);
    }
}

/**
 * Worker başlat
 */
async function startWorker() {
    try {
        logger.info('🚀 DIA Worker başlatılıyor...');

        // MongoDB bağlan
        await connectDatabase();

        // Worker oluştur
        worker = new DiaWorker();

        // Zamanlanmış job'ları ayarla
        await worker.setupScheduledJobs();

        logger.info('✅ DIA Worker başarıyla başlatıldı');
        logger.info('📅 Full Sync: Her gün 05:00');
        logger.info('📅 Light Sync: Her 15 dakikada bir');

    } catch (error) {
        logger.error('❌ Worker başlatma hatası:', error);
        process.exit(1);
    }
}

/**
 * Graceful shutdown
 */
async function shutdown(signal) {
    logger.info(`\n${signal} sinyali alındı, worker kapatılıyor...`);

    const shutdownTimeoutMs = parseInt(process.env.WORKER_SHUTDOWN_TIMEOUT) || 60000;

    // Zorla kapatma timer'ı — hiçbir koşulda asılı kalmasın
    const forceExitTimer = setTimeout(() => {
        logger.error(`⏱️ Shutdown ${shutdownTimeoutMs}ms içinde tamamlanmadı, zorla kapatılıyor`);
        process.exit(1);
    }, shutdownTimeoutMs + 5000);

    try {
        if (worker) {
            await worker.gracefulShutdown(shutdownTimeoutMs);
        }
        await mongoose.connection.close();
        clearTimeout(forceExitTimer);
        logger.info('✅ Worker başarıyla kapatıldı');
        process.exit(0);

    } catch (error) {
        clearTimeout(forceExitTimer);
        logger.error('❌ Shutdown hatası:', error);
        process.exit(1);
    }
}

// Sinyal handler'ları
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Hata yakalama
process.on('unhandledRejection', (reason, promise) => {
    logger.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('❌ Uncaught Exception:', error);
    shutdown('UNCAUGHT_EXCEPTION');
});

// Worker'ı başlat
startWorker();