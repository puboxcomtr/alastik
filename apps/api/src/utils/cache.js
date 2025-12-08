/**
 * Basit In-Memory Cache Sistemi
 * Backend performans optimizasyonu için
 */

class SimpleCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };

    // Her 10 dakikada bir expired entry'leri temizle
    setInterval(() => {
      this.cleanup();
    }, 10 * 60 * 1000);
  }

  /**
   * Cache'e veri ekle
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
   */
  set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });

    this.stats.sets++;
    
    console.log(`💾 [CACHE SET] ${key} (TTL: ${ttlSeconds}s)`);
  }

  /**
   * Cache'den veri al
   * @param {string} key 
   * @returns {any|null}
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      console.log(`❌ [CACHE MISS] ${key}`);
      return null;
    }

    // Expired kontrolü
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      console.log(`⏰ [CACHE EXPIRED] ${key}`);
      return null;
    }

    this.stats.hits++;
    console.log(`✅ [CACHE HIT] ${key}`);
    return entry.value;
  }

  /**
   * Cache'den veri sil
   * @param {string} key 
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      console.log(`🗑️ [CACHE DELETE] ${key}`);
    }
    return deleted;
  }

  /**
   * Pattern'e göre cache'leri sil
   * @param {string} pattern - Regex pattern
   */
  deletePattern(pattern) {
    const regex = new RegExp(pattern);
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    this.stats.deletes += deletedCount;
    
    if (deletedCount > 0) {
      console.log(`🗑️ [CACHE DELETE PATTERN] ${pattern} - ${deletedCount} entries deleted`);
    }

    return deletedCount;
  }

  /**
   * Cache'de key var mı kontrol et
   * @param {string} key 
   */
  has(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Expired kontrolü
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Tüm cache'i temizle
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🧹 [CACHE CLEAR] ${size} entries cleared`);
  }

  /**
   * Expired entry'leri temizle
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 [CACHE CLEANUP] ${cleanedCount} expired entries cleaned`);
    }
  }

  /**
   * Cache istatistikleri
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    let totalSize = 0;

    for (const [key, entry] of this.cache.entries()) {
      totalSize += JSON.stringify(entry.value).length;
      
      if (now > entry.expiresAt) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      entries: {
        total: this.cache.size,
        valid: validEntries,
        expired: expiredEntries
      },
      stats: {
        ...this.stats,
        hitRate: `${hitRate}%`
      },
      memory: {
        sizeBytes: totalSize,
        sizeKB: (totalSize / 1024).toFixed(2),
        sizeMB: (totalSize / 1024 / 1024).toFixed(2)
      }
    };
  }

  /**
   * Cache key'lerini listele
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Cache boyutu
   */
  size() {
    return this.cache.size;
  }
}

// Singleton instance
const cache = new SimpleCache();

/**
 * Cache key generator utilities
 */
const cacheKeys = {
  // Dia stok cache keys
  diaStock: (productIds) => `dia:stock:${productIds.sort().join(',')}`,
  diaStockSingle: (productId) => `dia:stock:single:${productId}`,
  diaStockBySize: (genislik, yanak, cap) => `dia:stock:size:${genislik}x${yanak}R${cap}`,
  
  // Wheelsize cache keys
  wheelsizeSearch: (genislik, yanak, cap, mevsim, page) => 
    `wheelsize:search:${genislik}x${yanak}R${cap}:${mevsim}:page${page}`,
  
  // Vehicle cache keys
  vehicleInfo: (marka, model, yil, modifikasyon) => 
    `vehicle:${marka}:${model}:${yil}:${modifikasyon || 'default'}`,
  
  // Brand/Model cache keys
  brands: () => 'brands:list',
  models: (marka) => `models:${marka}`,
  years: (marka, model) => `years:${marka}:${model}`,
  
  // API response cache keys
  apiResponse: (endpoint, params) => {
    const paramString = JSON.stringify(params || {});
    const hash = require('crypto').createHash('md5').update(paramString).digest('hex');
    return `api:${endpoint}:${hash}`;
  }
};

/**
 * Cache middleware wrapper
 * @param {string} keyGenerator - Cache key generator function
 * @param {number} ttlSeconds - TTL in seconds
 */
function withCache(keyGenerator, ttlSeconds = 300) {
  return function(req, res, next) {
    const cacheKey = typeof keyGenerator === 'function' 
      ? keyGenerator(req) 
      : keyGenerator;

    // Cache'den kontrol et
    const cached = cache.get(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    // Response'u intercept et
    const originalSend = res.json;
    res.json = function(data) {
      // Başarılı response'ları cache'le
      if (res.statusCode === 200 && data.basarili) {
        cache.set(cacheKey, data, ttlSeconds);
      }
      
      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Async function cache wrapper
 * @param {string} cacheKey 
 * @param {Function} asyncFunction 
 * @param {number} ttlSeconds 
 */
async function cachedFunction(cacheKey, asyncFunction, ttlSeconds = 300) {
  // Cache'den kontrol et
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  try {
    // Function'ı çalıştır
    const result = await asyncFunction();
    
    // Sonucu cache'le
    cache.set(cacheKey, result, ttlSeconds);
    
    return result;
  } catch (error) {
    console.error(`❌ [CACHE ERROR] ${cacheKey}:`, error.message);
    throw error;
  }
}

module.exports = {
  cache,
  cacheKeys,
  withCache,
  cachedFunction
};