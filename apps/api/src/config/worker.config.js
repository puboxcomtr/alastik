// apps/api/src/config/worker.config.js

module.exports = {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || null,
        maxRetriesPerRequest: null,
        enableReadyCheck: false
    },

    sync: {
        fullSync: {
            schedule: process.env.FULL_SYNC_CRON || '0 5 * * *', // 05:00
            batchSize: parseInt(process.env.FULL_SYNC_BATCH) || 100,
            batchDelay: parseInt(process.env.FULL_SYNC_DELAY) || 2000
        },

        lightSync: {
            schedule: process.env.LIGHT_SYNC_CRON || '*/15 * * * *', // 15 dakika (tarih filtreli kart senkronu)
            batchSize: parseInt(process.env.LIGHT_SYNC_BATCH) || 50,
            batchDelay: parseInt(process.env.LIGHT_SYNC_DELAY) || 1000
        },

        stockSync: {
            // Saatlik (:10) tam stok taraması + MASLAK+MERKEZ web stok tazelemesi.
            // Tarama ~60 dk sürüyor; 30 dk aralık turları üst üste bindirip
            // light sync'i kilitte 90 dk bekletiyordu.
            schedule: process.env.STOCK_SYNC_CRON || '10 * * * *'
        }
    },

    worker: {
        concurrency: parseInt(process.env.WORKER_CONCURRENCY) || 1,
        maxMemory: process.env.WORKER_MAX_MEMORY || '512M',
        timeout: parseInt(process.env.WORKER_TIMEOUT) || 14400000, // 4 saat (DIA API yavaş günlerde full sync 1 saati aşabiliyor)
        lightSyncTimeout: parseInt(process.env.LIGHT_SYNC_TIMEOUT) || 5400000 // 90 dakika (tek taramalı fiyat+stok turu DIA yavaşken 45-50 dk sürebiliyor)
    },

    queue: {
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000
            },
            removeOnComplete: 100,
            removeOnFail: 500
        }
    }
};