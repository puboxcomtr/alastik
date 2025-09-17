#!/usr/bin/env node
/**
 * Merkezi Sunucu Bağlantı Test Scripti
 * Tüm veritabanı bağlantılarını test eder
 */

const { MongoClient } = require('mongodb');
const { Client } = require('pg');
const Redis = require('ioredis');
require('dotenv').config();

// Sunucu bilgileri
const SERVER_HOST = '217.195.202.170';
const DB_USER = 'alastik';
const DB_PASSWORD = '34gm4191M.';

const logger = {
  info: (msg, data) => console.log(`ℹ️  ${msg}`, data || ''),
  error: (msg, error) => console.error(`❌ ${msg}`, error || ''),
  success: (msg, data) => console.log(`✅ ${msg}`, data || ''),
  test: (msg) => console.log(`🧪 ${msg}`)
};

async function testMongoDB() {
  logger.test('MongoDB bağlantısı test ediliyor...');
  
  try {
    const uri = `mongodb://${DB_USER}:${DB_PASSWORD}@${SERVER_HOST}:27017/alastik_db?authSource=admin`;
    const client = new MongoClient(uri);
    
    const startTime = Date.now();
    await client.connect();
    const connectionTime = Date.now() - startTime;
    
    // Basit bir sorgu çalıştır
    const db = client.db('alastik_db');
    const collections = await db.listCollections().toArray();
    
    await client.close();
    
    logger.success(`MongoDB bağlantısı başarılı (${connectionTime}ms)`);
    logger.info(`Toplam koleksiyon sayısı: ${collections.length}`);
    
    return true;
  } catch (error) {
    logger.error('MongoDB bağlantı hatası:', error.message);
    return false;
  }
}

async function testPostgreSQL() {
  logger.test('PostgreSQL bağlantısı test ediliyor...');
  
  try {
    const client = new Client({
      host: SERVER_HOST,
      port: 5432,
      user: DB_USER,
      password: DB_PASSWORD,
      database: 'alastik_admin'
    });
    
    const startTime = Date.now();
    await client.connect();
    const connectionTime = Date.now() - startTime;
    
    // Basit bir sorgu çalıştır
    const result = await client.query('SELECT current_database(), version()');
    const dbInfo = result.rows[0];
    
    // Tabloları listele
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    await client.end();
    
    logger.success(`PostgreSQL bağlantısı başarılı (${connectionTime}ms)`);
    logger.info(`Veritabanı: ${dbInfo.current_database}`);
    logger.info(`Toplam tablo sayısı: ${tablesResult.rows.length}`);
    
    return true;
  } catch (error) {
    logger.error('PostgreSQL bağlantı hatası:', error.message);
    return false;
  }
}

async function testRedis() {
  logger.test('Redis bağlantısı test ediliyor...');
  
  try {
    const redis = new Redis({
      host: SERVER_HOST,
      port: 6379,
      password: DB_PASSWORD,
      db: 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      family: 4,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });
    
    const startTime = Date.now();
    await redis.connect();
    const connectionTime = Date.now() - startTime;
    
    // Redis bilgilerini al
    const info = await redis.info('server');
    const memory = await redis.info('memory');
    
    // Test anahtarı oluştur ve oku
    const testKey = `test:${Date.now()}`;
    await redis.set(testKey, 'test-value', 'EX', 10);
    const testValue = await redis.get(testKey);
    await redis.del(testKey);
    
    await redis.disconnect();
    
    logger.success(`Redis bağlantısı başarılı (${connectionTime}ms)`);
    logger.info(`Test anahtarı: ${testValue === 'test-value' ? 'Başarılı' : 'Başarısız'}`);
    
    // Redis sürümünü çıkar
    const serverInfo = info.split('\r\n').find(line => line.startsWith('redis_version:'));
    if (serverInfo) {
      logger.info(`Redis sürümü: ${serverInfo.split(':')[1]}`);
    }
    
    return true;
  } catch (error) {
    logger.error('Redis bağlantı hatası:', error.message);
    return false;
  }
}

async function testAllConnections() {
  logger.info('🚀 Alastik B2C - Merkezi Sunucu Bağlantı Testi');
  logger.info(`📍 Sunucu: ${SERVER_HOST}`);
  logger.info(`👤 Kullanıcı: ${DB_USER}`);
  logger.info('─'.repeat(50));
  
  const results = {
    mongodb: false,
    postgresql: false,
    redis: false
  };
  
  try {
    // Tüm testleri paralel çalıştır
    const [mongoResult, postgresResult, redisResult] = await Promise.allSettled([
      testMongoDB(),
      testPostgreSQL(),
      testRedis()
    ]);
    
    results.mongodb = mongoResult.status === 'fulfilled' && mongoResult.value;
    results.postgresql = postgresResult.status === 'fulfilled' && postgresResult.value;
    results.redis = redisResult.status === 'fulfilled' && redisResult.value;
    
    logger.info('─'.repeat(50));
    logger.info('📊 Test Sonuçları:');
    logger.info(`   MongoDB:    ${results.mongodb ? '✅ Başarılı' : '❌ Başarısız'}`);
    logger.info(`   PostgreSQL: ${results.postgresql ? '✅ Başarılı' : '❌ Başarısız'}`);
    logger.info(`   Redis:      ${results.redis ? '✅ Başarılı' : '❌ Başarısız'}`);
    
    const successCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;
    
    if (successCount === totalCount) {
      logger.success(`🎉 Tüm bağlantılar başarılı! (${successCount}/${totalCount})`);
      process.exit(0);
    } else {
      logger.error(`⚠️  Bazı bağlantılar başarısız! (${successCount}/${totalCount})`);
      process.exit(1);
    }
    
  } catch (error) {
    logger.error('Test sırasında beklenmeyen hata:', error.message);
    process.exit(1);
  }
}

// Script çalıştırma
if (require.main === module) {
  testAllConnections().catch(console.error);
}

module.exports = { testMongoDB, testPostgreSQL, testRedis, testAllConnections };