const axios = require('axios');
const { performance } = require('perf_hooks');
const winston = require('winston');

// Test configuration
const config = {
  apiUrl: process.env.API_URL || 'http://localhost:3082',
  concurrent: 10,
  totalRequests: 100,
  timeout: 30000
};

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/performance-test.log' }),
    new winston.transports.Console()
  ]
});

class PerformanceTest {
  constructor() {
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTime: 0,
      averageTime: 0,
      minTime: Infinity,
      maxTime: 0,
      errors: []
    };
  }

  async runTest() {
    logger.info('Performans testi başlatılıyor...', config);
    
    try {
      // 1. API Health Check
      await this.testHealthCheck();
      
      // 2. DIA Stock List Performance
      await this.testDiaStockList();
      
      // 3. DIA Stock Search Performance
      await this.testDiaStockSearch();
      
      // 4. DIA Stock Single Item Performance
      await this.testDiaStockSingle();
      
      // 5. Cache Performance
      await this.testCachePerformance();
      
      // 6. Concurrent Request Performance
      await this.testConcurrentRequests();
      
      // 7. Memory Usage Test
      await this.testMemoryUsage();
      
      // Results
      this.generateReport();
      
    } catch (error) {
      logger.error('Performans testi hatası:', error);
      throw error;
    }
  }

  async testHealthCheck() {
    logger.info('Health check testi...');
    const startTime = performance.now();
    
    try {
      const response = await axios.get(`${config.apiUrl}/health`, {
        timeout: config.timeout
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      logger.info('Health check başarılı', {
        duration: `${duration.toFixed(2)}ms`,
        status: response.status
      });
      
      return { success: true, duration };
    } catch (error) {
      logger.error('Health check hatası:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testDiaStockList() {
    logger.info('DIA Stock List performans testi...');
    
    const testCases = [
      { name: 'Default List', params: {} },
      { name: 'With Brand Filter', params: { marka: 'HANKOOK' } },
      { name: 'With Stock Filter', params: { stok_durumu: 'in_stock' } },
      { name: 'With Search', params: { search: 'lastik' } },
      { name: 'Large Page', params: { limit: 100 } },
      { name: 'Sorted by Price', params: { sort: 'fiyat_desc' } }
    ];

    const results = [];
    
    for (const testCase of testCases) {
      const startTime = performance.now();
      
      try {
        const response = await axios.get(`${config.apiUrl}/api/dia-stock`, {
          params: testCase.params,
          timeout: config.timeout
        });
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        results.push({
          name: testCase.name,
          success: true,
          duration: duration,
          recordCount: response.data.stocks?.length || 0,
          totalRecords: response.data.pagination?.total || 0
        });
        
        logger.info(`${testCase.name} - ${duration.toFixed(2)}ms - ${response.data.stocks?.length || 0} records`);
        
      } catch (error) {
        results.push({
          name: testCase.name,
          success: false,
          error: error.message
        });
        
        logger.error(`${testCase.name} hatası:`, error.message);
      }
    }
    
    return results;
  }

  async testDiaStockSearch() {
    logger.info('DIA Stock Search performans testi...');
    
    const searchQueries = [
      'lastik',
      'HANKOOK',
      '185/65R14',
      'yaz',
      'otomobil'
    ];

    const results = [];
    
    for (const query of searchQueries) {
      const startTime = performance.now();
      
      try {
        const response = await axios.get(`${config.apiUrl}/api/dia-stock/search`, {
          params: { q: query },
          timeout: config.timeout
        });
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        results.push({
          query,
          success: true,
          duration: duration,
          resultCount: response.data.stocks?.length || 0
        });
        
        logger.info(`Search "${query}" - ${duration.toFixed(2)}ms - ${response.data.stocks?.length || 0} results`);
        
      } catch (error) {
        results.push({
          query,
          success: false,
          error: error.message
        });
        
        logger.error(`Search "${query}" hatası:`, error.message);
      }
    }
    
    return results;
  }

  async testDiaStockSingle() {
    logger.info('DIA Stock Single Item performans testi...');
    
    // İlk olarak bir liste al ve rastgele bir item seç
    try {
      const listResponse = await axios.get(`${config.apiUrl}/api/dia-stock`, {
        params: { limit: 10 },
        timeout: config.timeout
      });
      
      const stocks = listResponse.data.stocks;
      if (!stocks || stocks.length === 0) {
        logger.warn('Test için stok bulunamadı');
        return { success: false, error: 'No stocks found' };
      }
      
      const randomStock = stocks[Math.floor(Math.random() * stocks.length)];
      const startTime = performance.now();
      
      const response = await axios.get(`${config.apiUrl}/api/dia-stock/${randomStock._key}`, {
        timeout: config.timeout
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      logger.info(`Single item fetch - ${duration.toFixed(2)}ms - ${randomStock._key}`);
      
      return {
        success: true,
        duration: duration,
        _key: randomStock._key,
        found: response.status === 200
      };
      
    } catch (error) {
      logger.error('Single item test hatası:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testCachePerformance() {
    logger.info('Cache performans testi...');
    
    const testUrl = `${config.apiUrl}/api/dia-stock`;
    const testParams = { limit: 20, marka: 'HANKOOK' };
    
    const results = [];
    
    // İlk request (cache miss)
    const startTime1 = performance.now();
    await axios.get(testUrl, { params: testParams, timeout: config.timeout });
    const endTime1 = performance.now();
    const duration1 = endTime1 - startTime1;
    
    results.push({
      type: 'Cache Miss',
      duration: duration1
    });
    
    // İkinci request (cache hit)
    const startTime2 = performance.now();
    await axios.get(testUrl, { params: testParams, timeout: config.timeout });
    const endTime2 = performance.now();
    const duration2 = endTime2 - startTime2;
    
    results.push({
      type: 'Cache Hit',
      duration: duration2
    });
    
    const improvement = ((duration1 - duration2) / duration1) * 100;
    
    logger.info(`Cache performance - Miss: ${duration1.toFixed(2)}ms, Hit: ${duration2.toFixed(2)}ms, Improvement: ${improvement.toFixed(2)}%`);
    
    return results;
  }

  async testConcurrentRequests() {
    logger.info('Concurrent requests testi...');
    
    const promises = [];
    const startTime = performance.now();
    
    for (let i = 0; i < config.concurrent; i++) {
      promises.push(
        axios.get(`${config.apiUrl}/api/dia-stock`, {
          params: { page: i + 1, limit: 10 },
          timeout: config.timeout
        })
      );
    }
    
    try {
      const responses = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      logger.info(`Concurrent requests - ${config.concurrent} requests in ${duration.toFixed(2)}ms`);
      
      return {
        success: true,
        duration: duration,
        requestCount: config.concurrent,
        avgPerRequest: duration / config.concurrent
      };
      
    } catch (error) {
      logger.error('Concurrent requests hatası:', error.message);
      return { success: false, error: error.message };
    }
  }

  async testMemoryUsage() {
    logger.info('Memory usage testi...');
    
    const promises = [];
    const startMemory = process.memoryUsage();
    
    // Çoklu request ile memory kullanımını test et
    for (let i = 0; i < 50; i++) {
      promises.push(
        axios.get(`${config.apiUrl}/api/dia-stock`, {
          params: { limit: 50 },
          timeout: config.timeout
        })
      );
    }
    
    try {
      await Promise.all(promises);
      const endMemory = process.memoryUsage();
      
      const memoryDiff = {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        external: endMemory.external - startMemory.external
      };
      
      logger.info('Memory usage difference:', memoryDiff);
      
      return {
        success: true,
        startMemory,
        endMemory,
        memoryDiff
      };
      
    } catch (error) {
      logger.error('Memory usage test hatası:', error.message);
      return { success: false, error: error.message };
    }
  }

  generateReport() {
    logger.info('Performans raporu oluşturuluyor...');
    
    const report = {
      timestamp: new Date().toISOString(),
      config: config,
      results: this.results,
      recommendations: this.getRecommendations()
    };
    
    console.log('\n=== PERFORMANS TEST RAPORU ===');
    console.log(JSON.stringify(report, null, 2));
    
    return report;
  }

  getRecommendations() {
    const recommendations = [];
    
    if (this.results.averageTime > 1000) {
      recommendations.push('Ortalama yanıt süresi yüksek, cache stratejisini gözden geçirin');
    }
    
    if (this.results.failedRequests > 0) {
      recommendations.push('Başarısız requestler var, hata yönetimini gözden geçirin');
    }
    
    if (this.results.maxTime > 5000) {
      recommendations.push('Maksimum yanıt süresi çok yüksek, timeout değerlerini kontrol edin');
    }
    
    return recommendations;
  }
}

// Test çalıştırma
if (require.main === module) {
  const test = new PerformanceTest();
  test.runTest().catch(console.error);
}

module.exports = PerformanceTest; 