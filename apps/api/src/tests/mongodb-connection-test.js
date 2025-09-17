const mongoose = require('mongoose');
const winston = require('winston');

// Test logger
const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

async function testMongoConnection() {
  logger.info('=== MongoDB Bağlantı Testi Başlatılıyor ===');
  
  try {
    // MongoDB bağlantı string'i
    const mongoUri = process.env.MONGODB_URI || 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin';
    
    logger.info('MongoDB URI:', mongoUri);
    logger.info('Bağlantı kuruluyor...');
    
    // Bağlantı ayarları
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
      connectTimeoutMS: 10000
    };
    
    // Bağlantı kur
    const startTime = Date.now();
    await mongoose.connect(mongoUri, options);
    const connectionTime = Date.now() - startTime;
    
    logger.info('✅ MongoDB bağlantısı başarılı!', {
      connectionTime: `${connectionTime}ms`,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      dbName: mongoose.connection.db.databaseName
    });
    
    // Veritabanı durumunu kontrol et
    const adminDb = mongoose.connection.db.admin();
    const dbStats = await adminDb.command({ dbStats: 1 });
    
    logger.info('📊 Veritabanı istatistikleri:', {
      db: dbStats.db,
      collections: dbStats.collections,
      objects: dbStats.objects,
      avgObjSize: dbStats.avgObjSize,
      dataSize: `${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`,
      storageSize: `${(dbStats.storageSize / 1024 / 1024).toFixed(2)} MB`,
      indexes: dbStats.indexes,
      indexSize: `${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`
    });
    
    // Koleksiyonları listele
    const collections = await mongoose.connection.db.listCollections().toArray();
    logger.info('📋 Mevcut koleksiyonlar:', {
      count: collections.length,
      collections: collections.map(c => c.name)
    });
    
    // Basit bir test verisi ekle/oku
    const testCollection = mongoose.connection.db.collection('connection_test');
    const testDoc = {
      test: true,
      timestamp: new Date(),
      message: 'MongoDB bağlantı testi'
    };
    
    await testCollection.insertOne(testDoc);
    logger.info('✅ Test verisi eklendi');
    
    const retrievedDoc = await testCollection.findOne({ test: true });
    logger.info('✅ Test verisi okundu:', retrievedDoc);
    
    // Test verisini temizle
    await testCollection.deleteOne({ test: true });
    logger.info('✅ Test verisi temizlendi');
    
    logger.info('🎉 MongoDB bağlantı testi başarıyla tamamlandı!');
    
  } catch (error) {
    logger.error('❌ MongoDB bağlantı hatası:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    
    if (error.code === 'ECONNREFUSED') {
      logger.error('💡 Çözüm önerileri:');
      logger.error('   - MongoDB servisinin çalıştığından emin olun');
      logger.error('   - IP adresinin doğru olduğunu kontrol edin');
      logger.error('   - Firewall ayarlarını kontrol edin');
      logger.error('   - Port 27017\'nin açık olduğunu kontrol edin');
    }
    
    if (error.code === 'ENOTFOUND') {
      logger.error('💡 DNS çözümleme hatası:');
      logger.error('   - IP adresinin doğru olduğunu kontrol edin');
      logger.error('   - İnternet bağlantınızı kontrol edin');
    }
    
    process.exit(1);
  } finally {
    // Bağlantıyı kapat
    try {
      await mongoose.connection.close();
      logger.info('🔐 MongoDB bağlantısı kapatıldı');
    } catch (error) {
      logger.error('Bağlantı kapatma hatası:', error.message);
    }
  }
}

// Test'i çalıştır
if (require.main === module) {
  testMongoConnection();
}

module.exports = testMongoConnection; 