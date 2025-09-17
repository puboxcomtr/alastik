const Redis = require('ioredis');
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

async function testRedisConnection() {
  logger.info('=== Redis Bağlantı Testi Başlatılıyor ===');
  
  try {
    // Redis bağlantı konfigürasyonu
    const redisConfig = {
      host: process.env.REDIS_HOST || '217.195.202.170',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || '34gm4191M.',
      db: 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      family: 4,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    };
    
    logger.info('Redis Konfigürasyonu:', {
      host: redisConfig.host,
      port: redisConfig.port,
      hasPassword: !!redisConfig.password,
      db: redisConfig.db
    });
    
    logger.info('Redis bağlantısı kuruluyor...');
    
    // Redis bağlantısı oluştur
    const redis = new Redis(redisConfig);
    
    // Bağlantı event'leri
    redis.on('connect', () => {
      logger.info('✅ Redis bağlantısı kuruldu');
    });
    
    redis.on('ready', () => {
      logger.info('✅ Redis hazır');
    });
    
    redis.on('error', (err) => {
      logger.error('❌ Redis bağlantı hatası:', {
        message: err.message,
        code: err.code,
        errno: err.errno,
        syscall: err.syscall,
        address: err.address,
        port: err.port
      });
    });
    
    redis.on('close', () => {
      logger.info('🔐 Redis bağlantısı kapatıldı');
    });
    
    // Bağlantıyı test et
    const startTime = Date.now();
    await redis.connect();
    const connectionTime = Date.now() - startTime;
    
    logger.info('✅ Redis bağlantısı başarılı!', {
      connectionTime: `${connectionTime}ms`,
      status: redis.status
    });
    
    // Ping testi
    const pingResult = await redis.ping();
    logger.info('✅ Ping testi:', pingResult);
    
    // Redis info
    const info = await redis.info();
    const infoLines = info.split('\r\n');
    const serverInfo = {};
    
    infoLines.forEach(line => {
      if (line.includes(':') && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        serverInfo[key] = value;
      }
    });
    
    logger.info('📊 Redis Sunucu Bilgileri:', {
      version: serverInfo.redis_version,
      mode: serverInfo.redis_mode,
      os: serverInfo.os,
      arch: serverInfo.arch_bits,
      uptime: `${Math.floor(serverInfo.uptime_in_seconds / 3600)} saat`,
      connectedClients: serverInfo.connected_clients,
      usedMemory: serverInfo.used_memory_human,
      maxMemory: serverInfo.maxmemory_human || 'Sınırsız'
    });
    
    // Test verisi yazma/okuma
    const testKey = 'connection_test';
    const testValue = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'Redis bağlantı testi'
    };
    
    await redis.set(testKey, JSON.stringify(testValue), 'EX', 60); // 60 saniye TTL
    logger.info('✅ Test verisi yazıldı');
    
    const retrievedValue = await redis.get(testKey);
    const parsedValue = JSON.parse(retrievedValue);
    logger.info('✅ Test verisi okundu:', parsedValue);
    
    // TTL kontrolü
    const ttl = await redis.ttl(testKey);
    logger.info('✅ TTL kontrolü:', `${ttl} saniye`);
    
    // Test verisini sil
    await redis.del(testKey);
    logger.info('✅ Test verisi silindi');
    
    // Performans testi
    logger.info('🚀 Performans testi başlatılıyor...');
    const perfStartTime = Date.now();
    
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(redis.set(`perf_test_${i}`, `value_${i}`));
    }
    
    await Promise.all(promises);
    const writeTime = Date.now() - perfStartTime;
    
    const readStartTime = Date.now();
    const readPromises = [];
    for (let i = 0; i < 100; i++) {
      readPromises.push(redis.get(`perf_test_${i}`));
    }
    
    await Promise.all(readPromises);
    const readTime = Date.now() - readStartTime;
    
    // Performans test verilerini temizle
    const delPromises = [];
    for (let i = 0; i < 100; i++) {
      delPromises.push(redis.del(`perf_test_${i}`));
    }
    await Promise.all(delPromises);
    
    logger.info('📈 Performans Test Sonuçları:', {
      writeTime: `${writeTime}ms (100 adet)`,
      readTime: `${readTime}ms (100 adet)`,
      avgWriteTime: `${(writeTime / 100).toFixed(2)}ms`,
      avgReadTime: `${(readTime / 100).toFixed(2)}ms`
    });
    
    logger.info('🎉 Redis bağlantı testi başarıyla tamamlandı!');
    
    // Bağlantıyı kapat
    await redis.disconnect();
    
  } catch (error) {
    logger.error('❌ Redis bağlantı hatası:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    
    if (error.code === 'ECONNREFUSED') {
      logger.error('💡 Çözüm önerileri:');
      logger.error('   - Redis servisinin çalıştığından emin olun');
      logger.error('   - IP adresinin doğru olduğunu kontrol edin');
      logger.error('   - Firewall ayarlarını kontrol edin');
      logger.error('   - Port 6379\'nin açık olduğunu kontrol edin');
    }
    
    if (error.code === 'ENOTFOUND') {
      logger.error('💡 DNS çözümleme hatası:');
      logger.error('   - IP adresinin doğru olduğunu kontrol edin');
      logger.error('   - İnternet bağlantınızı kontrol edin');
    }
    
    if (error.code === 'ECONNRESET') {
      logger.error('💡 Bağlantı sıfırlama hatası:');
      logger.error('   - Redis sunucusunun düzgün çalıştığını kontrol edin');
      logger.error('   - Ağ bağlantısını kontrol edin');
    }
    
    process.exit(1);
  }
}

// Test'i çalıştır
if (require.main === module) {
  testRedisConnection();
}

module.exports = testRedisConnection; 