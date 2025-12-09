#!/usr/bin/env node
/**
 * Merkezi Sunucu Veritabanı İlk Kurulum Scripti
 * Bu script ilk çalışmada gerekli veritabanlarını oluşturur
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
  info: (msg, data) => console.log(`✅ ${msg}`, data || ''),
  error: (msg, error) => console.error(`❌ ${msg}`, error || ''),
  warn: (msg, data) => console.warn(`⚠️  ${msg}`, data || ''),
  success: (msg, data) => console.log(`🎉 ${msg}`, data || '')
};

async function initMongoDB() {
  logger.info('MongoDB veritabanı kurulumu başlatılıyor...');
  
  try {
    const uri = `mongodb://${DB_USER}:${DB_PASSWORD}@${SERVER_HOST}:27017/alastik_db?authSource=admin`;
    const client = new MongoClient(uri);
    
    await client.connect();
    logger.info('MongoDB bağlantısı kuruldu');
    
    // Ana veritabanını oluştur
    const adminDb = client.db('admin');
    const db = client.db('alastik_db');
    
    // Veritabanının varlığını kontrol et
    const dbList = await adminDb.admin().listDatabases();
    const dbExists = dbList.databases.some(database => database.name === 'alastik_db');
    
    if (!dbExists) {
      // Koleksiyonları oluştur
      await db.createCollection('products');
      await db.createCollection('categories');
      await db.createCollection('inventory');
      await db.createCollection('diastocks');
      await db.createCollection('adminusers');
      await db.createCollection('users');
      await db.createCollection('orders');
      await db.createCollection('carts');
      
      logger.success('MongoDB alastik_db veritabanı ve koleksiyonları oluşturuldu');
    } else {
      logger.info('MongoDB alastik_db veritabanı zaten mevcut');
    }
    
    // İndeksleri oluştur
    await createMongoIndexes(db);
    
    await client.close();
    logger.success('MongoDB kurulumu tamamlandı');
    
  } catch (error) {
    logger.error('MongoDB kurulum hatası:', error.message);
    throw error;
  }
}

async function createMongoIndexes(db) {
  logger.info('MongoDB indeksleri oluşturuluyor...');
  
  try {
    // Products koleksiyonu indeksleri
    await db.collection('products').createIndexes([
      { key: { 'ebat.genislik': 1, 'ebat.yanak': 1, 'ebat.cap': 1 } },
      { key: { 'marka': 1 } },
      { key: { 'kategori': 1 } },
      { key: { 'fiyat': 1 } },
      { key: { 'stokDurumu': 1 } },
      { key: { 'aktif': 1 } }
    ]);
    
    // Categories koleksiyonu indeksleri
    await db.collection('categories').createIndexes([
      { key: { 'adi': 1 }, unique: true },
      { key: { 'aktif': 1 } }
    ]);
    
    // Inventory koleksiyonu indeksleri
    await db.collection('inventory').createIndexes([
      { key: { 'urunId': 1 } },
      { key: { 'stokMiktari': 1 } }
    ]);
    
    // DiaStocks koleksiyonu indeksleri
    await db.collection('diastocks').createIndexes([
      { key: { 'StokKodu': 1 }, unique: true },
      { key: { 'Ebat1': 1, 'Ebat2': 1, 'Ebat3': 1 } },
      { key: { 'Marka': 1 } },
      { key: { 'GuncellemeTarihi': 1 } }
    ]);
    
    // AdminUsers koleksiyonu indeksleri
    await db.collection('adminusers').createIndexes([
      { key: { 'email': 1 }, unique: true },
      { key: { 'kullaniciAdi': 1 }, unique: true }
    ]);
    
    // Users koleksiyonu indeksleri
    await db.collection('users').createIndexes([
      { key: { 'email': 1 }, unique: true },
      { key: { 'telefon': 1 } }
    ]);
    
    logger.success('MongoDB indeksleri oluşturuldu');
  } catch (error) {
    logger.error('MongoDB indeks oluşturma hatası:', error.message);
  }
}

async function initPostgreSQL() {
  logger.info('PostgreSQL veritabanı kurulumu başlatılıyor...');
  
  try {
    // Önce postgres veritabanına bağlan
    const postgresClient = new Client({
      host: SERVER_HOST,
      port: 5432,
      user: DB_USER,
      password: DB_PASSWORD,
      database: 'postgres'
    });
    
    await postgresClient.connect();
    logger.info('PostgreSQL bağlantısı kuruldu');
    
    // alastik_admin veritabanının varlığını kontrol et
    const dbCheckResult = await postgresClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'alastik_admin'"
    );
    
    if (dbCheckResult.rows.length === 0) {
      // Veritabanını oluştur
      await postgresClient.query('CREATE DATABASE alastik_admin');
      logger.success('PostgreSQL alastik_admin veritabanı oluşturuldu');
    } else {
      logger.info('PostgreSQL alastik_admin veritabanı zaten mevcut');
    }
    
    await postgresClient.end();
    
    // Şimdi alastik_admin veritabanına bağlan ve tabloları oluştur
    const adminClient = new Client({
      host: SERVER_HOST,
      port: 5432,
      user: DB_USER,
      password: DB_PASSWORD,
      database: 'alastik_admin'
    });
    
    await adminClient.connect();
    
    // Tabloları oluştur (Prisma şemasına göre)
    await createPostgreSQLTables(adminClient);
    
    await adminClient.end();
    logger.success('PostgreSQL kurulumu tamamlandı');
    
  } catch (error) {
    logger.error('PostgreSQL kurulum hatası:', error.message);
    throw error;
  }
}

async function createPostgreSQLTables(client) {
  logger.info('PostgreSQL tabloları oluşturuluyor...');
  
  try {
    // User tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS "User" (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE,
        "emailVerified" TIMESTAMPTZ,
        image TEXT,
        password TEXT,
        role TEXT DEFAULT 'user',
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Account tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Account" (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        type TEXT NOT NULL,
        provider TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at INTEGER,
        token_type TEXT,
        scope TEXT,
        id_token TEXT,
        session_state TEXT,
        FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE,
        UNIQUE(provider, "providerAccountId")
      )
    `);
    
    // Session tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Session" (
        id TEXT PRIMARY KEY,
        "sessionToken" TEXT UNIQUE NOT NULL,
        "userId" TEXT NOT NULL,
        expires TIMESTAMPTZ NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
      )
    `);
    
    // VerificationToken tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS "VerificationToken" (
        identifier TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires TIMESTAMPTZ NOT NULL,
        UNIQUE(identifier, token)
      )
    `);
    
    // İndeksleri oluştur
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_email ON "User"(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_account_user_id ON "Account"("userId")');
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_user_id ON "Session"("userId")');
    await client.query('CREATE INDEX IF NOT EXISTS idx_session_token ON "Session"("sessionToken")');
    
    logger.success('PostgreSQL tabloları oluşturuldu');
  } catch (error) {
    logger.error('PostgreSQL tablo oluşturma hatası:', error.message);
  }
}

async function initRedis() {
  logger.info('Redis bağlantısı test ediliyor...');
  
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
    
    await redis.connect();
    
    // Test anahtarı oluştur
    await redis.set('alastik:init:test', 'Redis connection successful', 'EX', 60);
    const testValue = await redis.get('alastik:init:test');
    
    if (testValue === 'Redis connection successful') {
      logger.success('Redis bağlantısı başarılı');
    } else {
      throw new Error('Redis test anahtarı okunamadı');
    }
    
    // Cache namespace'lerini hazırla
    await redis.set('alastik:cache:initialized', new Date().toISOString(), 'EX', 86400);
    
    await redis.disconnect();
    logger.success('Redis kurulumu tamamlandı');
    
  } catch (error) {
    logger.error('Redis kurulum hatası:', error.message);
    throw error;
  }
}

async function main() {
  logger.info('🚀 Alastik B2C - Merkezi Sunucu Veritabanı Kurulumu Başlatılıyor...');
  logger.info(`📍 Sunucu: ${SERVER_HOST}`);
  logger.info(`👤 Kullanıcı: ${DB_USER}`);
  
  try {
    // MongoDB kurulumu
    await initMongoDB();
    
    // PostgreSQL kurulumu
    await initPostgreSQL();
    
    // Redis test
    await initRedis();
    
    logger.success('🎉 Tüm veritabanları başarıyla kuruldu!');
    logger.info('💡 Artık uygulamayı çalıştırabilirsiniz.');
    
  } catch (error) {
    logger.error('❌ Kurulum sırasında hata oluştu:', error.message);
    process.exit(1);
  }
}

// Script çalıştırma
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, initMongoDB, initPostgreSQL, initRedis };