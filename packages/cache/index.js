const Redis = require('ioredis');

class CacheManager {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || '217.195.202.170',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || '34gm4191M.',
      db: 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      // Performans optimizasyonları
      family: 4,
      keepAlive: 30000,
      connectTimeout: 15000,
      commandTimeout: 10000,
      // Reconnection ayarları
      retryDelayOnClusterDown: 300,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
      // Connection pool ayarları
      enableOfflineQueue: true,
      // Timeout ayarları
      lazyConnect: true,
      autoResubscribe: true,
      autoResendUnfulfilledCommands: true,
    });

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
      // Sadece kritik hataları logla
      if (err.code !== 'ECONNRESET' && err.code !== 'ETIMEDOUT') {
        console.error('Redis error details:', {
          code: err.code,
          errno: err.errno,
          syscall: err.syscall
        });
      }
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    this.redis.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });

    this.redis.on('close', () => {
      console.log('Redis connection closed');
    });
  }

  // Generic helpers
  async deletePattern(pattern = '*') {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    return keys.length;
  }

  async clear() {
    return await this.redis.flushdb();
  }

  async getStats() {
    return await this.getCacheMetrics();
  }

  // Ürün cache stratejisi
  async cacheProduct(productId, productData, ttl = 3600) {
    const key = `product:${productId}`;
    await this.redis.setex(key, ttl, JSON.stringify(productData));
  }

  async getProduct(productId) {
    const key = `product:${productId}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Kategori cache stratejisi
  async cacheCategory(categoryId, categoryData, ttl = 1800) {
    const key = `category:${categoryId}`;
    await this.redis.setex(key, ttl, JSON.stringify(categoryData));
  }

  async getCategory(categoryId) {
    const key = `category:${categoryId}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Arama sonuçları cache
  async cacheSearchResults(searchQuery, filters, results, ttl = 300) {
    const key = `search:${Buffer.from(JSON.stringify({ query: searchQuery, filters })).toString('base64')}`;
    await this.redis.setex(key, ttl, JSON.stringify(results));
  }

  async getSearchResults(searchQuery, filters) {
    const key = `search:${Buffer.from(JSON.stringify({ query: searchQuery, filters })).toString('base64')}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Popüler ürünler cache
  async cachePopularProducts(products, ttl = 7200) {
    await this.redis.setex('popular:products', ttl, JSON.stringify(products));
  }

  async getPopularProducts() {
    const cached = await this.redis.get('popular:products');
    return cached ? JSON.parse(cached) : null;
  }

  // Session cache
  async setSession(sessionId, sessionData, ttl = 86400) {
    const key = `session:${sessionId}`;
    await this.redis.setex(key, ttl, JSON.stringify(sessionData));
  }

  async getSession(sessionId) {
    const key = `session:${sessionId}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Sepet cache
  async cacheCart(userId, cartData, ttl = 3600) {
    const key = `cart:${userId}`;
    await this.redis.setex(key, ttl, JSON.stringify(cartData));
  }

  async getCart(userId) {
    const key = `cart:${userId}`;
    const cached = await this.redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  // Cache invalidation
  async invalidateProduct(productId) {
    await this.redis.del(`product:${productId}`);
  }

  async invalidateCategory(categoryId) {
    await this.redis.del(`category:${categoryId}`);
  }

  async invalidateSearchCache() {
    const keys = await this.redis.keys('search:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // Generic cache operations
  async get(key) {
    return await this.redis.get(key);
  }

  async set(key, value, ttl = 3600) {
    if (ttl) {
      return await this.redis.setex(key, ttl, value);
    } else {
      return await this.redis.set(key, value);
    }
  }

  async del(key) {
    return await this.redis.del(key);
  }

  // Bulk operations
  async mget(keys) {
    return await this.redis.mget(keys);
  }

  async mset(keyValuePairs) {
    return await this.redis.mset(keyValuePairs);
  }

  // DIA Stock specific cache methods
  async cacheDiaStock(key, stockData, ttl = 1800) {
    const cacheKey = `dia-stock:${key}`;
    await this.redis.setex(cacheKey, ttl, JSON.stringify(stockData));
  }

  async getDiaStock(key) {
    const cacheKey = `dia-stock:${key}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheDiaStockList(queryHash, stockList, ttl = 300) {
    const cacheKey = `dia-stock-list:${queryHash}`;
    await this.redis.setex(cacheKey, ttl, JSON.stringify(stockList));
  }

  async getDiaStockList(queryHash) {
    const cacheKey = `dia-stock-list:${queryHash}`;
    const cached = await this.redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  async cacheDiaStockStats(stats, ttl = 600) {
    await this.redis.setex('dia-stock:stats', ttl, JSON.stringify(stats));
  }

  async getDiaStockStats() {
    const cached = await this.redis.get('dia-stock:stats');
    return cached ? JSON.parse(cached) : null;
  }

  async cacheDiaStockBrands(brands, ttl = 3600) {
    await this.redis.setex('dia-stock:brands', ttl, JSON.stringify(brands));
  }

  async getDiaStockBrands() {
    const cached = await this.redis.get('dia-stock:brands');
    return cached ? JSON.parse(cached) : null;
  }

  async cacheDiaStockCategories(categories, ttl = 3600) {
    await this.redis.setex('dia-stock:categories', ttl, JSON.stringify(categories));
  }

  async getDiaStockCategories() {
    const cached = await this.redis.get('dia-stock:categories');
    return cached ? JSON.parse(cached) : null;
  }

  // Batch caching for DIA stocks
  async cacheDiaStockBatch(stocksMap, ttl = 1800) {
    const pipeline = this.redis.pipeline();
    
    Object.entries(stocksMap).forEach(([key, stock]) => {
      const cacheKey = `dia-stock:${key}`;
      pipeline.setex(cacheKey, ttl, JSON.stringify(stock));
    });
    
    await pipeline.exec();
  }

  async getDiaStockBatch(keys) {
    const cacheKeys = keys.map(key => `dia-stock:${key}`);
    const cached = await this.redis.mget(...cacheKeys);
    
    const result = {};
    cached.forEach((value, index) => {
      if (value) {
        result[keys[index]] = JSON.parse(value);
      }
    });
    
    return result;
  }

  // Advanced cache invalidation
  async invalidateDiaStockCache(pattern = 'dia-stock:*') {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    return keys.length;
  }

  async invalidateDiaStockByBrand(brand) {
    // Bu daha complex bir işlem, tüm stokları kontrol etmek gerekiyor
    // Şimdilik pattern-based invalidation yapıyoruz
    const keys = await this.redis.keys('dia-stock:*');
    const keysToDelete = [];
    
    for (const key of keys) {
      const cached = await this.redis.get(key);
      if (cached) {
        const stock = JSON.parse(cached);
        if (stock.marka === brand) {
          keysToDelete.push(key);
        }
      }
    }
    
    if (keysToDelete.length > 0) {
      await this.redis.del(...keysToDelete);
    }
    
    return keysToDelete.length;
  }

  // Cache warming strategies
  async warmDiaStockCache(popularStocks) {
    const pipeline = this.redis.pipeline();
    
    popularStocks.forEach(stock => {
      const cacheKey = `dia-stock:${stock._key}`;
      pipeline.setex(cacheKey, 3600, JSON.stringify(stock)); // 1 hour
    });
    
    await pipeline.exec();
  }

  // Cache metrics
  async getCacheMetrics() {
    const info = await this.redis.info('memory');
    const keyCount = await this.redis.dbsize();
    
    const diaStockKeys = await this.redis.keys('dia-stock:*');
    const diaStockListKeys = await this.redis.keys('dia-stock-list:*');
    
    return {
      memoryUsage: info,
      totalKeys: keyCount,
      diaStockKeys: diaStockKeys.length,
      diaStockListKeys: diaStockListKeys.length,
      timestamp: new Date()
    };
  }

  // Cache performance optimization
  async optimizeCache() {
    // Expired keys cleanup
    const expiredKeys = [];
    const allKeys = await this.redis.keys('*');
    
    for (const key of allKeys) {
      const ttl = await this.redis.ttl(key);
      if (ttl === -1) { // No TTL set
        expiredKeys.push(key);
      }
    }
    
    if (expiredKeys.length > 0) {
      await this.redis.del(...expiredKeys);
    }
    
    // Memory defragmentation
    await this.redis.memory('purge');
    
    return {
      cleanedKeys: expiredKeys.length,
      timestamp: new Date()
    };
  }

  // Health check
  async ping() {
    return await this.redis.ping();
  }

  async disconnect() {
    await this.redis.disconnect();
  }
}

module.exports = CacheManager; 