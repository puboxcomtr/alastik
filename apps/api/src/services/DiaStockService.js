const axios = require('axios');
const winston = require('winston');
const DiaStock = require('../models/DiaStock');
const CacheManager = require('../../../../packages/cache');

/* Filter Config */
const { getFiltersForSyncType, logFilterConfig, getBasicFilters, getDiaFields } = require('../config/diaFilters');


class DiaStockService {
  constructor() {
    this.cache = new CacheManager();
    logFilterConfig();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'dia-stock-sync' },
      transports: [
        new winston.transports.File({ filename: 'logs/dia-sync.log' }),
        new winston.transports.Console()
      ]
    });

    // DIA API konfigürasyonu
    this.diaApiConfig = {
      baseURL: process.env.DIA_BASE_URL || 'https://artlastik.ws.dia.com.tr',
      apiKey: process.env.DIA_API_KEY || 'eda23858-0e9b-4a81-b7e2-4c9f03d30078',
      username: process.env.DIA_USERNAME || 'Ws_alastik_B2C',
      password: process.env.DIA_PASSWORD || 'Ws_alastik_B2C',
      firmaKodu: parseInt(process.env.DIA_FIRMA_KODU || '1'),
      donemKodu: parseInt(process.env.DIA_DONEM_KODU || '2'),
      timeout: 600000,
      apiTimeout: 1800000,
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'Accept-Encoding': 'gzip, deflate'
      }
    };

    // Session yönetimi
    this.cachedSessionId = null;
    this.sessionExpireTime = null;

    // Performans ayarları
    this.batchSize = parseInt(process.env.DIA_DB_BATCH_SIZE) || 500;
    this.apiBatchSize = parseInt(process.env.DIA_API_BATCH_SIZE) || 1000;
    this.maxRetries = parseInt(process.env.DIA_MAX_RETRIES) || 3;
    this.retryDelay = parseInt(process.env.DIA_RETRY_DELAY) || 2000;
    this.requestDelay = parseInt(process.env.DIA_REQUEST_DELAY) || 500;
    this.maxConcurrentRequests = 2;
    this.connectionPoolSize = parseInt(process.env.DIA_CONNECTION_POOL_SIZE) || 10;

    // Timeout ayarları
    this.timeouts = {
      login: parseInt(process.env.DIA_LOGIN_TIMEOUT) || 600000, // 10 dakika
      api: parseInt(process.env.DIA_API_TIMEOUT) || 1800000,  // 30 dakika
      batch: parseInt(process.env.DIA_BATCH_TIMEOUT) || 2400000 // 40 dakika
    };

    this.performanceMetrics = {
      totalRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      failedRequests: 0
    };

    this.axiosInstance = axios.create({
      timeout: this.timeouts.api,
      maxRedirects: 5,
      maxContentLength: 100 * 1024 * 1024,
      maxBodyLength: 100 * 1024 * 1024,
      headers: this.diaApiConfig.headers,
      httpAgent: new (require('http').Agent)({
        keepAlive: true,
        maxSockets: this.connectionPoolSize,
        maxFreeSockets: 5,
        timeout: this.timeouts.api
      }),
      httpsAgent: new (require('https').Agent)({
        keepAlive: true,
        maxSockets: this.connectionPoolSize,
        maxFreeSockets: 5,
        timeout: this.timeouts.api,
        rejectUnauthorized: false
      })
    });

    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.updatePerformanceMetrics(response);
        return response;
      },
      (error) => {
        this.performanceMetrics.failedRequests++;
        return Promise.reject(error);
      }
    );
  }

  /**
   * Session'ın geçerli olup olmadığını kontrol et
   */
  isSessionValid() {
    return this.cachedSessionId &&
      this.sessionExpireTime &&
      new Date() < this.sessionExpireTime;
  }

  /**
   * DIA ERP'ye login ol ve session ID al
   */
  async loginAsync() {
    const loginStartTime = Date.now();
    const loginId = `login_${Date.now()}`;

    // Session cache kontrolü
    if (this.isSessionValid()) {
      this.logger.info('=== CACHED SESSION KULLANILIYOR ===', {
        loginId,
        sessionIdMasked: this.cachedSessionId.length > 10 ?
          this.cachedSessionId.substring(0, 10) + '...' :
          this.cachedSessionId,
        expiryTime: this.sessionExpireTime,
        remainingTime: `${Math.round((this.sessionExpireTime - new Date()) / 1000 / 60)} dakika`,
        cacheHit: true
      });
      return this.cachedSessionId;
    }

    try {
      this.logger.info('=== DIA LOGIN İŞLEMİ BAŞLANGICI ===', {
        loginId,
        timestamp: new Date().toISOString(),
        baseUrl: this.diaApiConfig.baseURL,
        username: this.diaApiConfig.username,
        timeout: this.diaApiConfig.timeout,
        cacheHit: false
      });

      const loginRequest = {
        login: {
          username: this.diaApiConfig.username,
          password: this.diaApiConfig.password,
          disconnect_same_user: "True",
          params: {
            apikey: this.diaApiConfig.apiKey
          }
        }
      };

      const requestJson = JSON.stringify(loginRequest);
      const endpoint = `${this.diaApiConfig.baseURL}/api/v3/sis/json`;

      const startTime = new Date();
      const response = await this.axiosInstance.post(endpoint, requestJson, {
        timeout: this.timeouts.login
      });

      const duration = new Date() - startTime;

      if (response.status !== 200) {
        this.logger.error('=== DIA LOGIN HTTP HATASI ===', {
          loginId,
          statusCode: response.status,
          statusText: response.statusText,
          duration: `${duration}ms`
        });
        this.cachedSessionId = null;
        this.sessionExpireTime = null;
        return null;
      }

      const responseBody = response.data;

      // Response'u parse et
      if (responseBody && responseBody.code === "200" && responseBody.msg) {
        this.cachedSessionId = responseBody.msg;
        this.sessionExpireTime = new Date(Date.now() + 60 * 60 * 1000); // 60 dakika

        const totalDuration = Date.now() - loginStartTime;

        this.logger.info('=== DIA LOGIN BAŞARILI ===', {
          loginId,
          timestamp: new Date().toISOString(),
          sessionIdMasked: this.cachedSessionId.length > 10 ?
            this.cachedSessionId.substring(0, 10) + '...' :
            this.cachedSessionId,
          sessionIdLength: this.cachedSessionId.length,
          expiryTime: this.sessionExpireTime,
          validFor: '60 dakika',
          totalDuration: `${totalDuration}ms`,
          apiDuration: `${duration}ms`,
          success: true
        });

        return this.cachedSessionId;
      }

      this.cachedSessionId = null;
      this.sessionExpireTime = null;
      return null;

    } catch (error) {
      const totalDuration = Date.now() - loginStartTime;

      this.logger.error('=== DIA LOGIN EXCEPTION ===', {
        loginId,
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        totalDuration: `${totalDuration}ms`,
        success: false
      });

      this.cachedSessionId = null;
      this.sessionExpireTime = null;
      return null;
    }
  }

  /**
   * DIA ERP'den stok verilerini getir - FİLTRELENMİŞ
   */
  async fetchStockFromDia(params = {}) {
    const requestStartTime = Date.now();

    try {
      const sessionId = await this.loginAsync();
      if (!sessionId) {
        throw new Error('DIA login başarısız');
      }

      // Sadece config'den gelen temel filtreleri kullan
      const configFilters = getBasicFilters();

      const defaultParams = {
        session_id: sessionId,
        firma_kodu: this.diaApiConfig.firmaKodu,
        donem_kodu: this.diaApiConfig.donemKodu,
        filters: configFilters,
        sorts: [{ field: "stokkartkodu", sorttype: "DESC" }],
        params: {
          _key_sis_depo: 0,
          _key_sis_depo_filtre: 0,
          tarih: "2099-12-31"
        },
        limit: this.apiBatchSize,
        offset: 0
      };

      const requestPayload = {
        scf_stokkart_detay_listele: {
          ...defaultParams,
          ...params,
          filters: configFilters.concat(params.filters || []),
          fields: getDiaFields()
        }
      };

      const endpoint = `${this.diaApiConfig.baseURL}/api/v3/scf/json`;

      this.logger.info('=== CONFIG FİLTRELİ DIA STOK API REQUEST ===', {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        endpoint: endpoint,
        configFilters,
        additionalFilters: params.filters || [],
        offset: params.offset || 0,
        limit: params.limit || defaultParams.limit,
        note: 'Sadece config/diaFilters.js temel filtreler kullanılıyor'
      });

      const response = await this.axiosInstance.post(endpoint, requestPayload);

      if (response.data.code !== '200') {
        this.logger.error('DIA API Error Response:', {
          code: response.data.code,
          message: response.data.msg,
          fullResponse: response.data
        });
        throw new Error(`DIA API Error: ${response.data.msg || 'Unknown error'}`);
      }

      // DIA'dan dönen tüm veriyi direkt döndür - MANUEL FİLTRELEME KALDIRILDI
      let stockData = response.data.result || [];

      this.logger.info('=== CONFIG FİLTRE SONUÇLARI (MANUEL FİLTRE KALDIRILDI) ===', {
        receivedCount: stockData.length,
        actualFieldCount: stockData.length > 0 ? Object.keys(stockData[0]).length : 0,
        requestedFieldCount: getDiaFields().length,
        note: 'Tüm manuel filtreleme kaldırıldı - DIA API filtreleri yeterli',
        configFiltersUsed: configFilters.length,
        sampleData: stockData.length > 0 ? {
          _key: stockData[0]._key,
          stokkartkodu: stockData[0].stokkartkodu,
          aciklama: stockData[0].aciklama,
          durum: stockData[0].durum,
          ozelkod11kodu: stockData[0].ozelkod11kodu
        } : null
      });

      return stockData;

    } catch (error) {
      const totalDuration = Date.now() - requestStartTime;
      if (error.message.includes('INVALID_SESSION')) {
        this.logger.info('Invalid session hatası, session temizleniyor ve tekrar deneniyor...');
        this.cachedSessionId = null;
        this.sessionExpireTime = null;
        try {
          const newSessionId = await this.loginAsync();
          if (newSessionId) {
            this.logger.info('Session yenilendi, işlem tekrar ediliyor');
            return this.fetchStockFromDia(params);
          }
        } catch (retryError) {
          this.logger.error('Session yenileme başarısız:', retryError.message);
        }
      }
      this.logger.error('=== CONFIG FİLTRELİ DIA STOK API HATASI ===', {
        timestamp: new Date().toISOString(),
        totalDuration: `${totalDuration}ms`,
        error: error.message,
        stack: error.stack,
        offset: params.offset || 0,
        endpoint: `${this.diaApiConfig.baseURL}/api/v3/scf/json`,
        success: false
      });
      throw error;
    }
  }
  /**
   * Batch halinde stok verilerini getir *
   */
  async fetchAllStockFromDia(batchSize = null) {
    const operationStartTime = Date.now();
    const operationId = `batch_${Date.now()}`;
    const effectiveBatchSize = batchSize || this.apiBatchSize;

    try {
      let allStockData = [];
      let offset = 0;
      let hasMore = true;
      let batchCount = 0;
      let totalApiTime = 0;
      const maxRecords = 50000;
      const maxBatches = 20;

      this.logger.info('=== TOPLU STOK ÇEKME İŞLEMİ BAŞLANGICI ===', {
        operationId,
        timestamp: new Date().toISOString(),
        batchSize: effectiveBatchSize,
        maxRecords,
        maxBatches,
        requestDelay: this.requestDelay
      });

      while (hasMore && batchCount < maxBatches) {
        batchCount++;
        const batchStartTime = Date.now();

        const params = {
          limit: effectiveBatchSize,
          offset: offset
        };

        let batchData = [];
        let retryCount = 0;
        let batchSuccess = false;

        // Retry mekanizması
        while (!batchSuccess && retryCount < this.maxRetries) {
          try {
            if (retryCount > 0) {
              await this.sleep(this.retryDelay * retryCount);
            }

            batchData = await this.fetchStockFromDia(params);
            batchSuccess = true;

          } catch (error) {
            retryCount++;
            this.logger.warn(`Batch ${batchCount} hatası, retry ${retryCount}/${this.maxRetries}`, {
              error: error.message,
              willRetry: retryCount < this.maxRetries
            });

            if (retryCount >= this.maxRetries) {
              throw error;
            }
          }
        }

        const batchEndTime = Date.now();
        const batchDuration = batchEndTime - batchStartTime;
        totalApiTime += batchDuration;

        if (batchData.length === 0) {
          this.logger.info('Batch boş döndü, işlem sonlandırılıyor');
          hasMore = false;
          break;
        }

        allStockData = allStockData.concat(batchData);
        offset += effectiveBatchSize;

        // Memory kontrolü
        if (allStockData.length >= maxRecords) {
          this.logger.warn('Maksimum kayıt sayısına ulaşıldı', {
            totalRecords: allStockData.length,
            maxRecords
          });
          hasMore = false;
          break;
        }

        // Rate limiting
        if (this.requestDelay > 0 && hasMore) {
          await this.sleep(this.requestDelay);
        }
      }

      const operationEndTime = Date.now();
      const totalOperationTime = operationEndTime - operationStartTime;

      this.logger.info('=== TOPLU STOK ÇEKME İŞLEMİ TAMAMLANDI ===', {
        operationId,
        success: true,
        totalRecords: allStockData.length,
        totalBatches: batchCount,
        totalOperationTime: `${totalOperationTime}ms`
      });

      return allStockData;

    } catch (error) {
      this.logger.error('=== TOPLU STOK ÇEKME HATASI ===', {
        operationId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stok verilerini MongoDB'ye senkronize et *
   */
  async syncStockToDatabase(stockData) {
    if (!stockData || stockData.length === 0) {
      this.logger.warn('Senkronize edilecek stok verisi yok');
      return { success: true, processed: 0, errors: [] };
    }

    try {
      this.logger.info('Veritabanı senkronizasyonu başlatılıyor', {
        totalRecords: stockData.length
      });

      const result = {
        success: true,
        processed: 0,
        inserted: 0,
        updated: 0,
        errors: []
      };

      // Batch'lere böl
      for (let i = 0; i < stockData.length; i += this.batchSize) {
        const batch = stockData.slice(i, i + this.batchSize);

        try {
          const batchResult = await this.processBatch(batch);

          result.processed += batchResult.processed;
          result.inserted += batchResult.inserted;
          result.updated += batchResult.updated;
          result.errors = result.errors.concat(batchResult.errors);

        } catch (error) {
          this.logger.error('Batch işleme hatası', {
            batchIndex: Math.floor(i / this.batchSize) + 1,
            error: error.message
          });

          result.errors.push({
            batch: Math.floor(i / this.batchSize) + 1,
            error: error.message
          });
        }
      }

      // Cache'i temizle
      await this.invalidateCache();

      this.logger.info('Veritabanı senkronizasyonu tamamlandı', result);
      return result;

    } catch (error) {
      this.logger.error('Veritabanı senkronizasyonu hatası', { error: error.message });
      throw error;
    }
  }
  /**
   * Batch verilerini işle - FİLTRE KONTROLÜ İLE *
   */
  async processBatch(batch) {
    const bulkOperations = [];
    const errors = [];
    let filteredOutCount = 0;

    for (const item of batch) {
      try {
        if (!item._key) {
          errors.push({
            item: item.stokkartkodu || 'Unknown',
            error: 'Missing _key field'
          });
          continue;
        }

        // DIA verisini temizle ve dönüştür
        const cleanedData = this.cleanDiaData(item);

        // Upsert operation
        bulkOperations.push({
          updateOne: {
            filter: { _key: item._key },
            update: {
              $set: {
                ...cleanedData,
                'syncInfo.lastSyncDate': new Date(),
                'syncInfo.syncStatus': 'synced',
                'syncInfo.syncSource': 'dia_api'
              }
            },
            upsert: true
          }
        });

      } catch (error) {
        errors.push({
          item: item._key || item.stokkartkodu || 'Unknown',
          error: error.message
        });
      }
    }

    if (filteredOutCount > 0) {
      this.logger.info('DB yazımından önce filtrelenen ürün sayısı:', {
        filteredOutCount,
        totalBatchSize: batch.length,
        willBeProcessed: bulkOperations.length
      });
    }

    if (bulkOperations.length === 0) {
      return { processed: 0, inserted: 0, updated: 0, errors, filteredOut: filteredOutCount };
    }

    try {
      const result = await DiaStock.bulkWrite(bulkOperations, {
        ordered: false,
        writeConcern: { w: 1, j: true }
      });

      return {
        processed: bulkOperations.length,
        inserted: result.upsertedCount || 0,
        updated: result.modifiedCount || 0,
        filteredOut: filteredOutCount,
        errors
      };

    } catch (error) {
      this.logger.error('Bulk write hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * Mevcut kayıtları temizleme *
   */
  async cleanupNonCompliantRecords() {
    try {
      this.logger.info('=== MEVCUT KAYITLAR TEMİZLENİYOR ===');
      const deleteResult = await DiaStock.deleteMany({
        $or: [
          { durum: { $ne: 'A' } },
          { b2c_durum: { $ne: 'E' } },
          { b2c_gonder: { $ne: 'E' } },
          { fiili_stok: { $lte: 0 } },
          { 'm_kategoriler.kategori_aciklama_1': { $nin: require('../config/diaFilters').CATEGORY_FILTERS } },
          {
            'm_urunOzellikleri': {
              $elemMatch: {
                ozellikadi: 'Durumu',
                detayaciklama: 'İkinci El'
              }
            }
          }
        ]
      });

      this.logger.info('=== MEVCUT KAYIT TEMİZLEME TAMAMLANDI ===', {
        deletedCount: deleteResult.deletedCount,
        reason: 'Filtreleri geçmeyen kayıtlar silindi'
      });

      return { deletedCount: deleteResult.deletedCount };

    } catch (error) {
      this.logger.error('Kayıt temizleme hatası:', { error: error.message });
      throw error;
    }
  }

  /**
   * DIA verisini temizle ve dönüştür
   */
  cleanDiaData(item) {
    const cleaned = { ...item };

    // Sayısal alanları dönüştür
    const numericFields = [
      'fiili_stok', 'gercek_stok', 'fiyat1', 'fiyat2', 'fiyat3', 'fiyat4', 'fiyat10',
      'sontuketicifiyati', 'azamimiktar', 'azamimiktar_firma', 'b2b_depomiktari',
      'b2c_depomiktari', 'b2c_indirimorani', 'anabirimbrutagirlik', 'anabirimdesi',
      'anabirimnetagirlik', 'kdvalis', 'kdviade', 'kdvsatis', 'kdvsatistoptan',
      'kdvtevkifatorani', 'karyuzdesi', 'images_count'
    ];

    numericFields.forEach(field => {
      if (cleaned[field] !== undefined && cleaned[field] !== null && cleaned[field] !== '') {
        const num = parseFloat(cleaned[field]);
        cleaned[field] = isNaN(num) ? null : num;
      }
    });

    // String alanlarını temizle
    const stringFields = [
      'aciklama', 'marka', 'markaack', 'stokkartkodu', 'firmaadi',
      'ekalan1', 'ekalan2', 'ekalan3', 'ekalan4', 'ekalan5'
    ];

    stringFields.forEach(field => {
      if (cleaned[field] && typeof cleaned[field] === 'string') {
        cleaned[field] = cleaned[field].trim();
      }
    });

    // Boolean alanlarını dönüştür
    const booleanFields = ['kilitli'];
    booleanFields.forEach(field => {
      if (cleaned[field] !== undefined) {
        cleaned[field] = cleaned[field] === 't' || cleaned[field] === true;
      }
    });

    return cleaned;
  }

  /**
   * DIA'dan veri çek ve her batch'i hemen veritabanına yaz *
   */
  async fetchAndSyncIncrementally() {
    const operationStartTime = Date.now();
    const operationId = `incremental_sync_${Date.now()}`;

    try {
      let totalProcessed = 0;
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalErrors = [];
      let offset = 0;
      let hasMore = true;
      let batchCount = 0;
      const maxBatches = 20;

      this.logger.info('=== ARTIMSAL SENKRONIZASYON BAŞLANGICI ===', {
        operationId,
        maxBatches,
        batchSize: this.apiBatchSize
      });

      while (hasMore && batchCount < maxBatches) {
        batchCount++;

        try {
          // 1. Tek batch veri çek
          const batchData = await this.fetchSingleBatch(offset, this.apiBatchSize, batchCount);

          if (!batchData || batchData.length === 0) {
            this.logger.info(`Batch ${batchCount}: Veri yok, işlem tamamlandı`);
            hasMore = false;
            break;
          }

          // 2. Hemen veritabanına yaz
          const syncResult = await this.syncStockToDatabase(batchData);

          totalProcessed += syncResult.processed;
          totalInserted += syncResult.inserted;
          totalUpdated += syncResult.updated;
          totalErrors = totalErrors.concat(syncResult.errors);

          offset += this.apiBatchSize;

          // Rate limiting
          if (batchCount < maxBatches) {
            await new Promise(resolve => setTimeout(resolve, this.requestDelay));
          }

        } catch (batchError) {
          this.logger.error(`Batch ${batchCount} hatası:`, {
            operationId,
            batchNumber: batchCount,
            error: batchError.message,
            offset: offset
          });

          totalErrors.push({
            batchNumber: batchCount,
            error: batchError.message
          });

          // Batch hatası durumunda devam et
          offset += this.apiBatchSize;
        }
      }

      const totalDuration = Date.now() - operationStartTime;

      const finalResult = {
        success: totalErrors.length === 0,
        processed: totalProcessed,
        inserted: totalInserted,
        updated: totalUpdated,
        errors: totalErrors,
        batchesProcessed: batchCount,
        duration: `${totalDuration}ms`
      };

      this.logger.info('=== ARTIMSAL SENKRONIZASYON TAMAMLANDI ===', finalResult);

      return finalResult;

    } catch (error) {
      this.logger.error('=== ARTIMSAL SENKRONIZASYON HATASI ===', {
        operationId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Tek batch veri çek *
   */
  async fetchSingleBatch(offset, limit, batchNumber) {
    const params = {
      limit: limit,
      offset: offset
    };

    const result = await this.fetchStockFromDia(params);

    if (result && result.length > 0) {
      return result;
    } else {
      return [];
    }
  }

  /**
   * Tam senkronizasyon işlemi - FİLTRELENMİŞ *
   */
  async fullSync() {
    try {
      this.logger.info('=== FILTRELENMIŞ TAM SENKRONİZASYON BAŞLANGICI ===');

      const startTime = Date.now();

      // 1. Önce mevcut filtreleri geçmeyen kayıtları temizle
      const cleanupResult = await this.cleanupNonCompliantRecords();
      this.logger.info('Cleanup tamamlandı:', cleanupResult);

      // 2. Sadece filtrelenmiş verileri getir ve veritabanına yaz
      const result = await this.fetchAndSyncIncrementally();

      const endTime = Date.now();
      const duration = endTime - startTime;

      this.logger.info('=== FILTRELENMIŞ TAM SENKRONİZASYON TAMAMLANDI ===', {
        duration: `${duration}ms`,
        cleanup: cleanupResult,
        sync: result
      });

      return {
        ...result,
        cleanup: cleanupResult,
        duration,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Filtrelenmiş tam senkronizasyon hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * Cache'i temizle *
   */
  async invalidateCache() {
    try {
      const keys = await this.cache.redis.keys('*stock*');
      if (keys.length > 0) {
        await this.cache.redis.del(...keys);
      }

      await this.cache.invalidateSearchCache();

      this.logger.info('Cache temizlendi', { clearedKeys: keys.length });
    } catch (error) {
      this.logger.error('Cache temizleme hatası', { error: error.message });
    }
  }

  /**
   * Yardımcı fonksiyon - Sleep *
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Performans metriklerini güncelle
   */
  updatePerformanceMetrics(response) {
    if (!response.config.metadata) {
      response.config.metadata = {};
    }

    const duration = response.config.metadata.endTime - response.config.metadata.startTime || 0;

    this.performanceMetrics.totalRequests++;
    this.performanceMetrics.totalResponseTime += duration;
    this.performanceMetrics.averageResponseTime = this.performanceMetrics.totalResponseTime / this.performanceMetrics.totalRequests;

    if (duration > 10000) {
      this.performanceMetrics.slowRequests++;
    }
  }

  /**
   * DIA Verilerini
   * Ürün Listesi Üzerinden Manuel Senkronize Etme
  */
  /* * Sadece Ürün Adı Güncelle * */
  async syncOnlyNames() {
    const operationId = `sync_names_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.info(`=== SADECE ÜRÜN İSİMLERİ SYNC BAŞLANGICI ===`, { operationId });

      let totalProcessed = 0;
      let totalUpdated = 0;
      let offset = 0;
      let hasMore = true;
      let batchCount = 0;

      while (hasMore) {
        batchCount++;

        const params = {
          limit: 500,
          offset: offset,
          filters: getFiltersForSyncType('names')
        };

        const batchData = await this.fetchStockFromDia(params);

        if (!batchData || batchData.length === 0) {
          hasMore = false;
          break;
        }

        for (const product of batchData) {
          const isSecondHand = this.isSecondHandProduct(product);
          if (!isSecondHand) {
            const updated = await this.updateOnlyProductNames(product);
            if (updated) totalUpdated++;
          }
          totalProcessed++;
        }

        offset += 500;
        await this.sleep(100);
      }

      const duration = Date.now() - startTime;
      return {
        success: true,
        processed: totalProcessed,
        updated: totalUpdated,
        message: `${totalUpdated} ürün ismi güncellendi`
      };

    } catch (error) {
      this.logger.error(`Ürün isimleri sync hatası:`, { error: error.message });
      throw error;
    }
  }
  async updateOnlyProductNames(product) {
    if (!product._key) return false;

    const filter = { _key: product._key };
    const updateData = {
      aciklama: product.aciklama || '',
      aciklama_2: product.aciklama_2 || '',
      'syncInfo.lastSyncDate': new Date(),
      'syncInfo.syncStatus': 'synced',
      'syncInfo.syncType': 'names_only'
    };

    try {
      const result = await DiaStock.updateOne(filter, { $set: updateData }, { upsert: false });
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Ürün isim güncelleme hatası: ${product._key}`, { error: error.message });
      return false;
    }
  }
  isSecondHandProduct(product) {
    if (product.m_urunOzellikleri && Array.isArray(product.m_urunOzellikleri)) {
      return product.m_urunOzellikleri.some(ozellik =>
        ozellik.ozellikadi === 'Durumu' &&
        ozellik.detayaciklama === 'İkinci El'
      );
    }
    return false;
  }

  /* * Sadece SKU Güncelle * */
  async syncOnlyCodes() {
    const operationId = `sync_codes_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.info(`=== SADECE STOK KODLARI SYNC BAŞLANGICI ===`, { operationId });

      let totalProcessed = 0;
      let totalUpdated = 0;
      let offset = 0;
      let hasMore = true;
      let batchCount = 0;

      while (hasMore) {
        batchCount++;

        const params = {
          limit: 500,
          offset: offset,
          filters: getFiltersForSyncType('codes')
        };

        const batchData = await this.fetchStockFromDia(params);

        if (!batchData || batchData.length === 0) {
          hasMore = false;
          break;
        }

        for (const product of batchData) {
          const isSecondHand = this.isSecondHandProduct(product);
          if (!isSecondHand) {
            const updated = await this.updateOnlyProductCodes(product);
            if (updated) totalUpdated++;
          }
          totalProcessed++;
        }

        offset += 500;
        await this.sleep(100);

        this.logger.info(`Codes Batch ${batchCount} tamamlandı`, {
          operationId,
          processed: totalProcessed,
          updated: totalUpdated
        });
      }

      const duration = Date.now() - startTime;
      return {
        success: true,
        processed: totalProcessed,
        updated: totalUpdated,
        type: 'codes_only',
        duration: `${duration}ms`,
        message: `${totalUpdated} stok kodu güncellendi (${totalProcessed} ürün kontrol edildi)`
      };

    } catch (error) {
      this.logger.error(`Stok kodları sync hatası:`, { error: error.message, operationId });
      throw error;
    }
  }
  async updateOnlyProductCodes(product) {
    if (!product._key) return false;
    const filter = { _key: product._key };
    const updateData = {
      stokkartkodu: product.stokkartkodu,
      'syncInfo.lastSyncDate': new Date(),
      'syncInfo.syncStatus': 'synced',
      'syncInfo.syncType': 'codes_only'
    };
    if (product.m_birimler && product.m_birimler[0] && product.m_birimler[0].__barkodlar) {
      const barkodlar = product.m_birimler[0].__barkodlar;
      if (barkodlar.length > 0) {
        updateData.barkod = barkodlar[0].barkod;
      }
    }
    try {
      const result = await DiaStock.updateOne(
        filter,
        { $set: updateData },
        { upsert: false }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Stok kod güncelleme hatası: ${product._key}`, {
        error: error.message
      });
      return false;
    }
  }

  /* * Sadece Fiyat Güncelle * */
  async syncOnlyPrices() {
    const operationId = `sync_prices_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.info(`=== SADECE FİYATLAR SYNC BAŞLANGICI ===`, { operationId });

      let totalProcessed = 0;
      let totalUpdated = 0;
      let offset = 0;
      let hasMore = true;
      let batchCount = 0;

      while (hasMore) {
        batchCount++;

        const params = {
          limit: 500,
          offset: offset,
          filters: getFiltersForSyncType('prices')
        };

        const batchData = await this.fetchStockFromDia(params);

        if (!batchData || batchData.length === 0) {
          hasMore = false;
          break;
        }

        for (const product of batchData) {
          const isSecondHand = this.isSecondHandProduct(product);
          if (!isSecondHand) {
            const updated = await this.updateOnlyProductPrices(product);
            if (updated) totalUpdated++;
          }
          totalProcessed++;
        }

        offset += 500;
        await this.sleep(100);

        this.logger.info(`Prices Batch ${batchCount} tamamlandı`, {
          operationId,
          processed: totalProcessed,
          updated: totalUpdated
        });
      }

      const duration = Date.now() - startTime;
      return {
        success: true,
        processed: totalProcessed,
        updated: totalUpdated,
        type: 'prices_only',
        duration: `${duration}ms`,
        message: `${totalUpdated} ürün fiyatı güncellendi (${totalProcessed} ürün kontrol edildi)`
      };

    } catch (error) {
      this.logger.error(`Fiyat sync hatası:`, { error: error.message, operationId });
      throw error;
    }
  }
  async updateOnlyProductPrices(product) {
    if (!product._key) return false;

    const filter = { _key: product._key };

    const updateData = {
      fiyat1: parseFloat(product.fiyat1) || 0,
      fiyat2: parseFloat(product.fiyat2) || 0,
      fiyat3: parseFloat(product.fiyat3) || 0,
      fiyat4: parseFloat(product.fiyat4) || 0,
      fiyat10: parseFloat(product.fiyat10) || 0,
      sontuketicifiyati: parseFloat(product.sontuketicifiyati) || 0,

      kdvalis: parseFloat(product.kdvalis) || 0,
      kdviade: parseFloat(product.kdviade) || 0,
      kdvsatis: parseFloat(product.kdvsatis) || 0,
      kdvsatistoptan: parseFloat(product.kdvsatistoptan) || 0,
      kdvtevkifatorani: parseFloat(product.kdvtevkifatorani) || 0,

      kdvdurumu: product.kdvdurumu || '',
      kdvdurumu1: product.kdvdurumu1 || '',
      kdvdurumu2: product.kdvdurumu2 || '',
      kdvdurumu3: product.kdvdurumu3 || '',
      kdvdurumu4: product.kdvdurumu4 || '',
      kdvdurumu10: product.kdvdurumu10 || '',

      karyuzdesi: parseFloat(product.karyuzdesi) || 0,
      kdvtevkifatkodu: product.kdvtevkifatkodu || '',

      'syncInfo.lastSyncDate': new Date(),
      'syncInfo.syncStatus': 'synced',
      'syncInfo.syncType': 'prices_only'
    };

    try {
      const result = await DiaStock.updateOne(
        filter,
        { $set: updateData },
        { upsert: false }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Fiyat güncelleme hatası: ${product._key}`, {
        error: error.message
      });
      return false;
    }
  }
  /* * Sadece Görsel Güncelle * */
  async syncOnlyImages() {
    const operationId = `sync_images_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.info(`=== SADECE GÖRSELLER SYNC BAŞLANGICI ===`, { operationId });

      let totalProcessed = 0;
      let totalUpdated = 0;
      let offset = 0;
      let hasMore = true;
      let batchCount = 0;

      while (hasMore) {
        batchCount++;

        const params = {
          limit: 500,
          offset: offset,
          filters: getFiltersForSyncType('images')
        };

        const batchData = await this.fetchStockFromDia(params);

        if (!batchData || batchData.length === 0) {
          hasMore = false;
          break;
        }

        for (const product of batchData) {
          const isSecondHand = this.isSecondHandProduct(product);
          if (!isSecondHand) {
            const updated = await this.updateOnlyProductImages(product);
            if (updated) totalUpdated++;
          }
          totalProcessed++;
        }

        offset += 500;
        await this.sleep(100);

        this.logger.info(`Images Batch ${batchCount} tamamlandı`, {
          operationId,
          processed: totalProcessed,
          updated: totalUpdated
        });
      }

      const duration = Date.now() - startTime;
      return {
        success: true,
        processed: totalProcessed,
        updated: totalUpdated,
        type: 'images_only',
        duration: `${duration}ms`,
        message: `${totalUpdated} ürün görseli güncellendi (${totalProcessed} ürün kontrol edildi)`
      };

    } catch (error) {
      this.logger.error(`Görsel sync hatası:`, { error: error.message, operationId });
      throw error;
    }
  }
  async updateOnlyProductImages(product) {
    if (!product._key) return false;

    const filter = { _key: product._key };

    const updateData = {
      images_count: parseInt(product.images_count) || 0,
      resimsayisi: parseInt(product.resimsayisi) || 0,
      m_resimler: product.m_resimler || [],
      'syncInfo.lastSyncDate': new Date(),
      'syncInfo.syncStatus': 'synced',
      'syncInfo.syncType': 'images_only'
    };

    try {
      const result = await DiaStock.updateOne(
        filter,
        { $set: updateData },
        { upsert: false }
      );

      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`Görsel güncelleme hatası: ${product._key}`, {
        error: error.message
      });
      return false;
    }
  }
}

module.exports = DiaStockService;