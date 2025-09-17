const axios = require('axios');
const winston = require('winston');
const DiaStock = require('../models/DiaStock');
const CacheManager = require('../../../../packages/cache');

class DiaStockService {
  constructor() {
    this.cache = new CacheManager();
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
      timeout: 600000, // 10 dakika login timeout (5 dakikadan artırıldı)
      apiTimeout: 1800000, // 30 dakika API timeout (20 dakikadan artırıldı)
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'Accept-Encoding': 'gzip, deflate'
      }
    };

    // Session yönetimi
    this.cachedSessionId = null;
    this.sessionExpireTime = null;

    // Performans ayarları - OPTIMIZE EDİLDİ
    this.batchSize = parseInt(process.env.DIA_DB_BATCH_SIZE) || 500; // MongoDB batch boyutu
    this.apiBatchSize = parseInt(process.env.DIA_API_BATCH_SIZE) || 1000; // API batch boyutu
    this.maxRetries = parseInt(process.env.DIA_MAX_RETRIES) || 3;
    this.retryDelay = parseInt(process.env.DIA_RETRY_DELAY) || 2000; // ms
    this.requestDelay = parseInt(process.env.DIA_REQUEST_DELAY) || 500; // API rate limiting için delay
    this.maxConcurrentRequests = 2; // Paralel request sayısı
    this.connectionPoolSize = parseInt(process.env.DIA_CONNECTION_POOL_SIZE) || 10; // HTTP connection pool
    
    // Timeout ayarları
    this.timeouts = {
      login: parseInt(process.env.DIA_LOGIN_TIMEOUT) || 600000, // 10 dakika
      api: parseInt(process.env.DIA_API_TIMEOUT) || 1800000,  // 30 dakika
      batch: parseInt(process.env.DIA_BATCH_TIMEOUT) || 2400000 // 40 dakika
    };

    // Performans metrikleri
    this.performanceMetrics = {
      totalRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      failedRequests: 0
    };

    // Axios instance oluştur - CONNECTION POOLING
    this.axiosInstance = axios.create({
      timeout: this.timeouts.api,
      maxRedirects: 5,
      maxContentLength: 100 * 1024 * 1024, // 100MB
      maxBodyLength: 100 * 1024 * 1024,
      headers: this.diaApiConfig.headers,
      // Connection pooling için
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

    // Response interceptor - performans metrikleri
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
   * @returns {boolean} Session geçerli mi
   */
  isSessionValid() {
    return this.cachedSessionId && 
           this.sessionExpireTime && 
           new Date() < this.sessionExpireTime;
  }

  /**
   * DIA ERP'ye login ol ve session ID al
   * @returns {Promise<string|null>} Session ID
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
      
      this.logger.info('DIA Login Request Detayları:', {
        loginId,
        endpoint: `${this.diaApiConfig.baseURL}/api/v3/sis/json`,
        method: 'POST',
        headers: this.diaApiConfig.headers,
        requestSize: requestJson.length,
        username: this.diaApiConfig.username,
        apiKeyMasked: this.diaApiConfig.apiKey.substring(0, 8) + '...',
        disconnectSameUser: true
      });

      this.logger.info('DIA Login Request Payload:', {
        loginId,
        payload: JSON.stringify(loginRequest, null, 2)
      });

      const endpoint = `${this.diaApiConfig.baseURL}/api/v3/sis/json`;
      this.logger.info('DIA login isteği gönderiliyor...', { 
        loginId,
        endpoint,
        timestamp: new Date().toISOString()
      });

      const startTime = new Date();
      const response = await this.axiosInstance.post(endpoint, requestJson, {
        timeout: this.timeouts.login
      });
      
      const duration = new Date() - startTime;
      
      this.logger.info('=== DIA LOGIN RESPONSE ALINDI ===', {
        loginId,
        statusCode: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      this.logger.info('DIA Login Response Headers:', {
        loginId,
        headers: response.headers,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length']
      });

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
      
      this.logger.info('DIA Login Response Body:', {
        loginId,
        responseBody: JSON.stringify(responseBody, null, 2),
        responseSize: JSON.stringify(responseBody).length
      });

      this.logger.info('DIA Login Response Analizi:', {
        loginId,
        hasCode: !!responseBody?.code,
        code: responseBody?.code,
        hasMessage: !!responseBody?.msg,
        messageLength: responseBody?.msg?.length || 0,
        isSuccess: responseBody?.code === "200",
        responseType: typeof responseBody
      });

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

      const totalDuration = Date.now() - loginStartTime;
      
      this.logger.error('=== DIA LOGIN BAŞARISIZ ===', {
        loginId,
        timestamp: new Date().toISOString(),
        code: responseBody?.code,
        message: responseBody?.msg || 'Bilinmeyen hata',
        totalDuration: `${totalDuration}ms`,
        apiDuration: `${duration}ms`,
        success: false,
        responseBody: responseBody
      });

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

      // Axios hatası detayları
      if (error.response) {
        this.logger.error('DIA Login HTTP Error Response:', {
          loginId,
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        });
      } else if (error.request) {
        this.logger.error('DIA Login Request Error (No Response):', {
          loginId,
          request: error.request,
          timeout: this.diaApiConfig.timeout
        });
      } else {
        this.logger.error('DIA Login Setup Error:', {
          loginId,
          message: error.message
        });
      }

      this.cachedSessionId = null;
      this.sessionExpireTime = null;
      return null;
    }
  }

  /**
   * DIA ERP'den stok verilerini getir
   * @param {Object} params - Sorgu parametreleri
   * @returns {Promise<Array>} Stok verileri
   */
  async fetchStockFromDia(params = {}) {
    const requestStartTime = Date.now();
    
    try {
      // Önce login ol
      const sessionId = await this.loginAsync();
      if (!sessionId) {
        throw new Error('DIA login başarısız');
      }

      const defaultParams = {
        session_id: sessionId,
        firma_kodu: this.diaApiConfig.firmaKodu,
        donem_kodu: this.diaApiConfig.donemKodu,
        filters: [
          { field: "durum", operator: "=", value: "A" },
          { field: "b2c_gonder", operator: "=", value: "E" }
        ],
        sorts: [{ field: "stokkartkodu", sorttype: "DESC" }],
        params: {
          _key_sis_depo: 0,
          _key_sis_depo_filtre: 0,
          tarih: "2099-12-31"
        },
        limit: this.apiBatchSize, // Optimize edilmiş batch boyutu
        offset: 0
      };

      const requestPayload = {
        scf_stokkart_detay_listele: {
          ...defaultParams,
          ...params
        }
      };

      const endpoint = `${this.diaApiConfig.baseURL}/api/v3/scf/json`;
      
      // DETAYLI REQUEST LOG
      this.logger.info('=== DIA STOK API REQUEST BAŞLANGICI ===', {
        timestamp: new Date().toISOString(),
        requestId: `req_${Date.now()}`,
        endpoint: endpoint,
        method: 'POST',
        timeout: `${this.timeouts.api / 1000} saniye`,
        offset: params.offset || 0,
        limit: params.limit || defaultParams.limit
      });

      this.logger.info('DIA API Request Headers:', {
        headers: this.diaApiConfig.headers
      });

      this.logger.info('DIA API Request Payload (FULL):', {
        payload: JSON.stringify(requestPayload, null, 2),
        payloadSize: JSON.stringify(requestPayload).length
      });

      this.logger.info('DIA API Request Filters:', {
        filters: requestPayload.scf_stokkart_detay_listele.filters,
        sorts: requestPayload.scf_stokkart_detay_listele.sorts,
        params: requestPayload.scf_stokkart_detay_listele.params,
        firma_kodu: requestPayload.scf_stokkart_detay_listele.firma_kodu,
        donem_kodu: requestPayload.scf_stokkart_detay_listele.donem_kodu,
        sessionIdMasked: sessionId.substring(0, 10) + '...'
      });

      const apiCallStartTime = Date.now();
      this.logger.info('DIA API çağrısı gönderiliyor...', {
        startTime: new Date(apiCallStartTime).toISOString(),
        estimatedTimeout: `${this.timeouts.api / 1000} saniye`
      });

      // Optimize edilmiş axios instance kullan
      const response = await this.axiosInstance.post(endpoint, requestPayload);

      const apiCallEndTime = Date.now();
      const apiCallDuration = apiCallEndTime - apiCallStartTime;

      // DETAYLI RESPONSE LOG
      this.logger.info('=== DIA STOK API RESPONSE ALINDI ===', {
        timestamp: new Date().toISOString(),
        duration: `${apiCallDuration}ms`,
        statusCode: response.status,
        statusText: response.statusText,
        performanceRating: apiCallDuration > 30000 ? 'YAVAŞ' : apiCallDuration > 10000 ? 'ORTA' : 'HIZLI'
      });

      this.logger.info('DIA API Response Headers:', {
        headers: response.headers,
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length']
      });

      this.logger.info('DIA API Response Status:', {
        httpStatus: response.status,
        diaCode: response.data?.code,
        diaMessage: response.data?.msg,
        hasResult: !!response.data?.result,
        resultType: Array.isArray(response.data?.result) ? 'array' : typeof response.data?.result
      });

      if (response.data?.result && Array.isArray(response.data.result)) {
        this.logger.info('DIA API Response Data Summary:', {
          totalRecords: response.data.result.length,
          firstRecord: response.data.result[0] ? {
            _key: response.data.result[0]._key,
            stokkartkodu: response.data.result[0].stokkartkodu,
            aciklama: response.data.result[0].aciklama,
            marka: response.data.result[0].marka,
            fiili_stok: response.data.result[0].fiili_stok,
            fiyat1: response.data.result[0].fiyat1,
            durum: response.data.result[0].durum,
            b2c_gonder: response.data.result[0].b2c_gonder
          } : null,
          lastRecord: response.data.result[response.data.result.length - 1] ? {
            _key: response.data.result[response.data.result.length - 1]._key,
            stokkartkodu: response.data.result[response.data.result.length - 1].stokkartkodu,
            aciklama: response.data.result[response.data.result.length - 1].aciklama
          } : null
        });

        // Sadece hata ayıklama için ilk 3 kaydı logla
        if (response.data.result.length > 0 && process.env.NODE_ENV === 'development') {
          this.logger.info('DIA API Response - İlk 3 Kayıt (FULL):', {
            records: response.data.result.slice(0, 3).map((record, index) => ({
              index: index + 1,
              data: record
            }))
          });
        }
      }

      // Raw response'u sadece development'da logla
      if (process.env.NODE_ENV === 'development') {
        const rawResponse = JSON.stringify(response.data);
        this.logger.info('DIA API Raw Response (İlk 1000 karakter):', {
          rawResponse: rawResponse.substring(0, 1000) + (rawResponse.length > 1000 ? '...' : ''),
          fullResponseSize: rawResponse.length
        });
      }

      if (response.data.code !== '200') {
        this.logger.error('DIA API Error Response:', {
          code: response.data.code,
          message: response.data.msg,
          fullResponse: response.data
        });
        throw new Error(`DIA API Error: ${response.data.msg || 'Unknown error'}`);
      }

      const stockData = response.data.result || [];
      
      const totalDuration = Date.now() - requestStartTime;
      
      this.logger.info('=== DIA STOK API İŞLEMİ TAMAMLANDI ===', {
        timestamp: new Date().toISOString(),
        totalDuration: `${totalDuration}ms`,
        apiCallDuration: `${apiCallDuration}ms`,
        totalRecords: stockData.length,
        offset: params.offset || 0,
        success: true,
        performanceMetrics: {
          totalRequests: this.performanceMetrics.totalRequests,
          averageResponseTime: Math.round(this.performanceMetrics.averageResponseTime),
          slowRequests: this.performanceMetrics.slowRequests,
          failedRequests: this.performanceMetrics.failedRequests
        }
      });

      // Stok verilerinin detaylı analizi
      if (stockData.length > 0) {
        const stockAnalysis = {
          totalCount: stockData.length,
          activeCount: stockData.filter(s => s.durum === 'A').length,
          inStockCount: stockData.filter(s => parseFloat(s.fiili_stok) > 0).length,
          b2cEnabledCount: stockData.filter(s => s.b2c_gonder === 'E').length,
          brands: [...new Set(stockData.map(s => s.marka))].filter(Boolean),
          priceRange: {
            min: Math.min(...stockData.map(s => parseFloat(s.fiyat1) || 0).filter(p => p > 0)),
            max: Math.max(...stockData.map(s => parseFloat(s.fiyat1) || 0)),
            avg: stockData.reduce((sum, s) => sum + (parseFloat(s.fiyat1) || 0), 0) / stockData.length
          },
          stockRange: {
            min: Math.min(...stockData.map(s => parseFloat(s.fiili_stok) || 0)),
            max: Math.max(...stockData.map(s => parseFloat(s.fiili_stok) || 0)),
            totalStock: stockData.reduce((sum, s) => sum + (parseFloat(s.fiili_stok) || 0), 0)
          }
        };

        this.logger.info('DIA API Stok Verisi Analizi:', stockAnalysis);
      }

      return stockData;
    } catch (error) {
      const totalDuration = Date.now() - requestStartTime;
      
      this.logger.error('=== DIA STOK API HATASI ===', {
        timestamp: new Date().toISOString(),
        totalDuration: `${totalDuration}ms`,
        error: error.message,
        stack: error.stack,
        offset: params.offset || 0,
        endpoint: `${this.diaApiConfig.baseURL}/api/v3/scf/json`,
        success: false,
        isTimeout: error.code === 'ECONNABORTED' || error.message.includes('timeout'),
        errorCode: error.code,
        performanceMetrics: this.performanceMetrics
      });

      // Axios hatası detayları
      if (error.response) {
        this.logger.error('DIA API HTTP Error Response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          headers: error.response.headers,
          data: error.response.data
        });
      } else if (error.request) {
        this.logger.error('DIA API Request Error (No Response):', {
          request: error.request,
          timeout: this.timeouts.api
        });
      }

      throw error;
    }
  }

  /**
   * Batch halinde stok verilerini getir
   * @param {number} batchSize - Batch boyutu
   * @returns {Promise<Array>} Tüm stok verileri
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
      let totalDelayTime = 0;
      const maxRecords = 50000; // Maksimum kayıt sayısı
      const maxBatches = 20; // Maksimum batch sayısı

      this.logger.info('=== TOPLU STOK ÇEKME İŞLEMİ BAŞLANGICI ===', {
        operationId,
        timestamp: new Date().toISOString(),
        batchSize: effectiveBatchSize,
        maxRecords,
        maxBatches,
        requestDelay: this.requestDelay,
        timeout: `${this.timeouts.batch / 1000} saniye`
      });

      while (hasMore && batchCount < maxBatches) {
        batchCount++;
        const batchStartTime = Date.now();
        
        const params = {
          limit: effectiveBatchSize,
          offset: offset
        };

        this.logger.info(`=== BATCH ${batchCount} BAŞLANGICI ===`, {
          operationId,
          batchNumber: batchCount,
          offset: offset,
          limit: effectiveBatchSize,
          timestamp: new Date().toISOString(),
          totalFetchedSoFar: allStockData.length,
          estimatedRemainingTime: batchCount > 1 ? `${Math.round((totalApiTime / (batchCount - 1)) * 0.001)} saniye` : 'Bilinmiyor'
        });

        let batchData = [];
        let retryCount = 0;
        let batchSuccess = false;

        // Retry mekanizması
        while (!batchSuccess && retryCount < this.maxRetries) {
          try {
            if (retryCount > 0) {
              this.logger.info(`Batch ${batchCount} retry ${retryCount}/${this.maxRetries}`, {
                operationId,
                batchNumber: batchCount,
                retryCount,
                retryDelay: this.retryDelay * retryCount
              });
              await this.sleep(this.retryDelay * retryCount);
            }

            batchData = await this.fetchStockFromDia(params);
            batchSuccess = true;

          } catch (error) {
            retryCount++;
            this.logger.warn(`Batch ${batchCount} hatası, retry ${retryCount}/${this.maxRetries}`, {
              operationId,
              batchNumber: batchCount,
              error: error.message,
              isTimeout: error.code === 'ECONNABORTED' || error.message.includes('timeout'),
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
        
        this.logger.info(`=== BATCH ${batchCount} TAMAMLANDI ===`, {
          operationId,
          batchNumber: batchCount,
          batchDuration: `${batchDuration}ms`,
          recordsReceived: batchData.length,
          isEmpty: batchData.length === 0,
          offset: offset,
          retryCount,
          performanceRating: batchDuration > 60000 ? 'ÇOK YAVAŞ' : batchDuration > 30000 ? 'YAVAŞ' : batchDuration > 10000 ? 'ORTA' : 'HIZLI'
        });

        if (batchData.length === 0) {
          this.logger.info('Batch boş döndü, işlem sonlandırılıyor', {
            operationId,
            batchNumber: batchCount,
            finalOffset: offset,
            reason: 'Veri kalmadı'
          });
          hasMore = false;
          break;
        }

        // Batch verilerini analiz et
        if (batchData.length > 0) {
          const batchAnalysis = {
            recordCount: batchData.length,
            activeRecords: batchData.filter(s => s.durum === 'A').length,
            inStockRecords: batchData.filter(s => parseFloat(s.fiili_stok) > 0).length,
            b2cEnabledRecords: batchData.filter(s => s.b2c_gonder === 'E').length,
            uniqueBrands: [...new Set(batchData.map(s => s.marka))].filter(Boolean).length,
            priceStats: {
              withPrice: batchData.filter(s => parseFloat(s.fiyat1) > 0).length,
              avgPrice: batchData.reduce((sum, s) => sum + (parseFloat(s.fiyat1) || 0), 0) / batchData.length
            },
            stockStats: {
              totalStock: batchData.reduce((sum, s) => sum + (parseFloat(s.fiili_stok) || 0), 0),
              avgStock: batchData.reduce((sum, s) => sum + (parseFloat(s.fiili_stok) || 0), 0) / batchData.length
            },
            sampleRecords: batchData.slice(0, 2).map(record => ({
              _key: record._key,
              stokkartkodu: record.stokkartkodu,
              aciklama: record.aciklama?.substring(0, 50) + '...',
              marka: record.marka,
              fiili_stok: record.fiili_stok,
              fiyat1: record.fiyat1
            }))
          };

          this.logger.info(`Batch ${batchCount} Veri Analizi:`, {
            operationId,
            batchNumber: batchCount,
            ...batchAnalysis
          });
        }

        allStockData = allStockData.concat(batchData);
        offset += effectiveBatchSize;

        const currentProgress = {
          operationId,
          batchNumber: batchCount,
          batchSize: batchData.length,
          totalFetched: allStockData.length,
          nextOffset: offset,
          progress: `${batchCount}/${maxBatches} batch tamamlandı`,
          avgBatchTime: `${Math.round(totalApiTime / batchCount)}ms`,
          totalTimeElapsed: `${Date.now() - operationStartTime}ms`,
          estimatedTimeRemaining: hasMore ? `${Math.round(((maxBatches - batchCount) * (totalApiTime / batchCount)) / 1000)} saniye` : 'Tamamlandı',
          dataTransferRate: `${Math.round(allStockData.length / ((Date.now() - operationStartTime) / 1000))} kayıt/saniye`
        };

        this.logger.info('Batch İlerleme Durumu:', currentProgress);

        // Memory yönetimi için batch boyutu kontrolü
        if (allStockData.length >= maxRecords) {
          this.logger.warn('=== MAKSIMUM KAYIT SAYISINA ULAŞILDI ===', {
            operationId,
            totalRecords: allStockData.length,
            maxRecords,
            batchesCompleted: batchCount,
            reason: 'Memory yönetimi için batch işleme durduruldu'
          });
          hasMore = false;
          break;
        }

        // Tam batch döndü mü kontrol et
        if (batchData.length < effectiveBatchSize) {
          this.logger.info('Eksik batch döndü, son batch olabilir', {
            operationId,
            batchNumber: batchCount,
            expectedSize: effectiveBatchSize,
            actualSize: batchData.length,
            reason: 'API\'den eksik veri döndü'
          });
        }

        // Akıllı rate limiting
        if (this.requestDelay > 0 && hasMore) {
          const delayStartTime = Date.now();
          // Yavaş batchlerde daha az bekle
          const adaptiveDelay = batchDuration > 60000 ? this.requestDelay / 2 : this.requestDelay;
          
          this.logger.info(`Rate limiting delay başlangıcı: ${adaptiveDelay}ms`, {
            operationId,
            batchNumber: batchCount,
            originalDelay: this.requestDelay,
            adaptiveDelay,
            reason: batchDuration > 60000 ? 'Yavaş batch - delay azaltıldı' : 'Normal delay'
          });
          
          await this.sleep(adaptiveDelay);
          
          const delayEndTime = Date.now();
          const actualDelay = delayEndTime - delayStartTime;
          totalDelayTime += actualDelay;
          
          this.logger.info(`Rate limiting delay tamamlandı: ${actualDelay}ms`, {
            operationId,
            batchNumber: batchCount,
            totalDelayTime: `${totalDelayTime}ms`
          });
        }

        // İlerleme yüzdesi hesaplama (her 3 batch'de bir)
        if (batchCount % 3 === 0) {
          const estimatedProgress = {
            operationId,
            batchesCompleted: batchCount,
            maxBatches,
            totalRecords: allStockData.length,
            avgRecordsPerBatch: Math.round(allStockData.length / batchCount),
            avgTimePerBatch: Math.round(totalApiTime / batchCount),
            totalApiTime: `${totalApiTime}ms`,
            totalDelayTime: `${totalDelayTime}ms`,
            progressPercentage: `${Math.round((batchCount / maxBatches) * 100)}%`,
            estimatedRemainingTime: hasMore ? `${Math.round(((maxBatches - batchCount) * (totalApiTime / batchCount)) / 1000)} saniye` : 'Tamamlandı'
          };

          this.logger.info('=== İLERLEME RAPORU ===', estimatedProgress);
        }
      }

      const operationEndTime = Date.now();
      const totalOperationTime = operationEndTime - operationStartTime;
      
      // Final analiz
      const finalAnalysis = {
        operationId,
        success: true,
        totalRecords: allStockData.length,
        totalBatches: batchCount,
        totalOperationTime: `${totalOperationTime}ms`,
        totalApiTime: `${totalApiTime}ms`,
        totalDelayTime: `${totalDelayTime}ms`,
        avgBatchTime: `${Math.round(totalApiTime / batchCount)}ms`,
        avgRecordsPerBatch: Math.round(allStockData.length / batchCount),
        efficiency: {
          apiTimePercentage: `${Math.round((totalApiTime / totalOperationTime) * 100)}%`,
          delayTimePercentage: `${Math.round((totalDelayTime / totalOperationTime) * 100)}%`,
          recordsPerSecond: Math.round(allStockData.length / (totalOperationTime / 1000))
        },
        performanceRating: totalOperationTime > 1800000 ? 'ÇOK YAVAŞ' : totalOperationTime > 900000 ? 'YAVAŞ' : totalOperationTime > 300000 ? 'ORTA' : 'HIZLI',
        completionReason: allStockData.length >= maxRecords ? 'Maksimum kayıt sınırı' : 
                          batchCount >= maxBatches ? 'Maksimum batch sınırı' : 'Veri bitti'
      };

      this.logger.info('=== TOPLU STOK ÇEKME İŞLEMİ TAMAMLANDI ===', finalAnalysis);

      // Toplam veri analizi
      if (allStockData.length > 0) {
        const totalAnalysis = {
          operationId,
          totalRecords: allStockData.length,
          activeRecords: allStockData.filter(s => s.durum === 'A').length,
          inStockRecords: allStockData.filter(s => parseFloat(s.fiili_stok) > 0).length,
          b2cEnabledRecords: allStockData.filter(s => s.b2c_gonder === 'E').length,
          uniqueBrands: [...new Set(allStockData.map(s => s.marka))].filter(Boolean).length,
          topBrands: [...new Set(allStockData.map(s => s.marka))].filter(Boolean).slice(0, 10),
          priceStats: {
            withPrice: allStockData.filter(s => parseFloat(s.fiyat1) > 0).length,
            avgPrice: allStockData.reduce((sum, s) => sum + (parseFloat(s.fiyat1) || 0), 0) / allStockData.length,
            minPrice: Math.min(...allStockData.map(s => parseFloat(s.fiyat1) || 0).filter(p => p > 0)),
            maxPrice: Math.max(...allStockData.map(s => parseFloat(s.fiyat1) || 0))
          },
          stockStats: {
            totalStock: allStockData.reduce((sum, s) => sum + (parseFloat(s.fiili_stok) || 0), 0),
            avgStock: allStockData.reduce((sum, s) => sum + (parseFloat(s.fiili_stok) || 0), 0) / allStockData.length,
            minStock: Math.min(...allStockData.map(s => parseFloat(s.fiili_stok) || 0)),
            maxStock: Math.max(...allStockData.map(s => parseFloat(s.fiili_stok) || 0))
          }
        };

        this.logger.info('=== TOPLAM VERİ ANALİZİ ===', totalAnalysis);
      }

      return allStockData;

    } catch (error) {
      const operationEndTime = Date.now();
      const totalOperationTime = operationEndTime - operationStartTime;
      
      this.logger.error('=== TOPLU STOK ÇEKME HATASI ===', {
        operationId,
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        totalOperationTime: `${totalOperationTime}ms`,
        batchesCompleted: batchCount || 0,
        recordsFetchedBeforeError: allStockData?.length || 0,
        lastOffset: offset || 0,
        success: false,
        errorType: error.code === 'ECONNABORTED' ? 'TIMEOUT' : 'API_ERROR',
        performanceMetrics: this.performanceMetrics
      });
      
      throw error;
    }
  }

  /**
   * Stok verilerini MongoDB'ye senkronize et
   * @param {Array} stockData - Stok verileri
   * @returns {Promise<Object>} Senkronizasyon sonucu
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

          this.logger.info('Batch işlendi', {
            batchIndex: Math.floor(i / this.batchSize) + 1,
            batchSize: batch.length,
            processed: batchResult.processed,
            inserted: batchResult.inserted,
            updated: batchResult.updated,
            errors: batchResult.errors.length
          });

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
   * Batch verilerini işle
   * @param {Array} batch - Batch verisi
   * @returns {Promise<Object>} Batch sonucu
   */
  async processBatch(batch) {
    const bulkOperations = [];
    const errors = [];

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

    if (bulkOperations.length === 0) {
      return { processed: 0, inserted: 0, updated: 0, errors };
    }

    try {
      this.logger.info('BulkWrite başlatılıyor', {
        operationCount: bulkOperations.length,
        sampleOperation: bulkOperations[0] ? bulkOperations[0].updateOne.filter : null
      });

      const result = await DiaStock.bulkWrite(bulkOperations, {
        ordered: false,
        writeConcern: { w: 1, j: true }
      });

      this.logger.info('BulkWrite tamamlandı', {
        upsertedCount: result.upsertedCount || 0,
        modifiedCount: result.modifiedCount || 0,
        matchedCount: result.matchedCount || 0,
        insertedCount: result.insertedCount || 0
      });

      return {
        processed: bulkOperations.length,
        inserted: result.upsertedCount || 0,
        updated: result.modifiedCount || 0,
        errors
      };

    } catch (error) {
      this.logger.error('Bulk write hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * DIA verisini temizle ve dönüştür
   * @param {Object} item - Ham DIA verisi
   * @returns {Object} Temizlenmiş veri
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
   * DIA'dan veri çek ve her batch'i hemen veritabanına yaz
   * @returns {Promise<Object>} Senkronizasyon sonucu
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

          this.logger.info(`=== BATCH ${batchCount} VERITABANI YAZIMI BAŞLANGICI ===`, {
            operationId,
            batchNumber: batchCount,
            recordCount: batchData.length,
            offset: offset
          });

          // 2. Hemen veritabanına yaz
          const syncResult = await this.syncStockToDatabase(batchData);
          
          totalProcessed += syncResult.processed;
          totalInserted += syncResult.inserted;
          totalUpdated += syncResult.updated;
          totalErrors = totalErrors.concat(syncResult.errors);

          this.logger.info(`=== BATCH ${batchCount} VERITABANI YAZIMI TAMAMLANDI ===`, {
            operationId,
            batchNumber: batchCount,
            processed: syncResult.processed,
            inserted: syncResult.inserted,
            updated: syncResult.updated,
            errors: syncResult.errors.length,
            totalProcessedSoFar: totalProcessed
          });

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
   * Tek batch veri çek
   */
  async fetchSingleBatch(offset, limit, batchNumber) {
    this.logger.info(`=== BATCH ${batchNumber} API ÇAĞRISI ===`, {
      offset,
      limit
    });

    const params = {
      limit: limit,
      offset: offset
    };

    const result = await this.fetchStockFromDia(params);
    
    if (result && result.length > 0) {
      this.logger.info(`Batch ${batchNumber}: ${result.length} kayıt alındı`);
      return result;
    } else {
      this.logger.info(`Batch ${batchNumber}: Veri yok`);
      return [];
    }
  }

  /**
   * Tam senkronizasyon işlemi
   * @returns {Promise<Object>} Senkronizasyon sonucu
   */
  async fullSync() {
    try {
      this.logger.info('Tam senkronizasyon başlatılıyor - Her batch sonrası veritabanına yazılacak');
      
      const startTime = Date.now();
      
      // 1. DIA'dan verileri getir ve her batch'i hemen veritabanına yaz
      const result = await this.fetchAndSyncIncrementally();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      this.logger.info('Tam senkronizasyon tamamlandı', {
        duration: `${duration}ms`,
        ...result
      });
      
      return {
        ...result,
        duration,
        timestamp: new Date()
      };
      
    } catch (error) {
      this.logger.error('Tam senkronizasyon hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * Artımlı senkronizasyon (sadece değişenler)
   * @param {Date} lastSyncDate - Son senkronizasyon tarihi
   * @returns {Promise<Object>} Senkronizasyon sonucu
   */
  async incrementalSync(lastSyncDate) {
    try {
      this.logger.info('Artımlı senkronizasyon başlatılıyor', { lastSyncDate });
      
      // Son değişiklik tarihine göre filtrele
      const params = {
        filters: [
          { field: "durum", operator: "=", value: "A" },
          { field: "b2c_gonder", operator: "=", value: "E" },
          { field: "_date", operator: ">=", value: lastSyncDate.toISOString().split('T')[0] }
        ]
      };
      
      const stockData = await this.fetchAllStockFromDia(1000); // Artımlı sync için daha küçük batch
      const result = await this.syncStockToDatabase(stockData);
      
      this.logger.info('Artımlı senkronizasyon tamamlandı', result);
      return result;
      
    } catch (error) {
      this.logger.error('Artımlı senkronizasyon hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * Tekil stok güncelleme
   * @param {string} _key - DIA _key
   * @returns {Promise<Object>} Güncelleme sonucu
   */
  async syncSingleStock(_key) {
    try {
      this.logger.info('Tekil stok güncelleme başlatılıyor', { _key });
      
      const params = {
        filters: [
          { field: "_key", operator: "=", value: _key }
        ],
        limit: 1
      };
      
      const stockData = await this.fetchStockFromDia(params);
      
      if (stockData.length === 0) {
        throw new Error(`Stok bulunamadı: ${_key}`);
      }
      
      const result = await this.syncStockToDatabase(stockData);
      
      this.logger.info('Tekil stok güncelleme tamamlandı', { _key, result });
      return result;
      
    } catch (error) {
      this.logger.error('Tekil stok güncelleme hatası', { _key, error: error.message });
      throw error;
    }
  }

  /**
   * Manuel stok ekleme
   * @param {Object} stockData - Stok verisi
   * @returns {Promise<Object>} Ekleme sonucu
   */
  async addManualStock(stockData) {
    try {
      this.logger.info('Manuel stok ekleme başlatılıyor', { _key: stockData._key });
      
      if (!stockData._key) {
        throw new Error('_key alanı gereklidir');
      }
      
      // Mevcut kayıt kontrolü
      const existingStock = await DiaStock.findOne({ _key: stockData._key });
      if (existingStock) {
        throw new Error(`Bu _key ile kayıt zaten mevcut: ${stockData._key}`);
      }
      
      const newStock = new DiaStock({
        ...stockData,
        syncInfo: {
          syncSource: 'manual',
          syncStatus: 'synced',
          lastSyncDate: new Date()
        }
      });
      
      await newStock.save();
      
      // Cache'i temizle
      await this.invalidateCache();
      
      this.logger.info('Manuel stok ekleme tamamlandı', { _key: stockData._key });
      return { success: true, _key: stockData._key };
      
    } catch (error) {
      this.logger.error('Manuel stok ekleme hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * Cache'i temizle
   */
  async invalidateCache() {
    try {
      // Stok ile ilgili tüm cache'leri temizle
      const keys = await this.cache.redis.keys('*stock*');
      if (keys.length > 0) {
        await this.cache.redis.del(...keys);
      }
      
      // Ürün cache'lerini temizle
      await this.cache.invalidateSearchCache();
      
      this.logger.info('Cache temizlendi', { clearedKeys: keys.length });
    } catch (error) {
      this.logger.error('Cache temizleme hatası', { error: error.message });
    }
  }

  /**
   * Senkronizasyon istatistikleri
   * @returns {Promise<Object>} İstatistikler
   */
  async getSyncStats() {
    try {
      const stats = await DiaStock.aggregate([
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            activeCount: { $sum: { $cond: [{ $eq: ['$durum', 'A'] }, 1, 0] } },
            inStockCount: { $sum: { $cond: [{ $gt: ['$fiili_stok', 0] }, 1, 0] } },
            b2cActiveCount: { $sum: { $cond: [{ $eq: ['$b2c_gonder', 'E'] }, 1, 0] } },
            lastSyncDate: { $max: '$syncInfo.lastSyncDate' },
            syncErrorCount: { $sum: { $cond: [{ $eq: ['$syncInfo.syncStatus', 'error'] }, 1, 0] } }
          }
        }
      ]);

      const brandStats = await DiaStock.aggregate([
        { $match: { durum: 'A' } },
        { $group: { _id: '$marka', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]);

      return {
        overview: stats[0] || {},
        topBrands: brandStats,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger.error('İstatistik alma hatası', { error: error.message });
      throw error;
    }
  }

  /**
   * Yardımcı fonksiyon - Sleep
   * @param {number} ms - Milisaniye
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Performans metriklerini güncelle
   * @param {Object} response - Axios response
   */
  updatePerformanceMetrics(response) {
    if (!response.config.metadata) {
      response.config.metadata = {};
    }
    
    const duration = response.config.metadata.endTime - response.config.metadata.startTime || 0;
    
    this.performanceMetrics.totalRequests++;
    this.performanceMetrics.totalResponseTime += duration;
    this.performanceMetrics.averageResponseTime = this.performanceMetrics.totalResponseTime / this.performanceMetrics.totalRequests;

    if (duration > 10000) { // 10 saniyeden uzun istekleri yavaş istekler olarak say
      this.performanceMetrics.slowRequests++;
    }
  }

  /**
   * Performans metriklerini al
   * @returns {Object} Performans metrikleri
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      successRate: this.performanceMetrics.totalRequests > 0 ? 
        ((this.performanceMetrics.totalRequests - this.performanceMetrics.failedRequests) / this.performanceMetrics.totalRequests * 100).toFixed(2) + '%' : 
        '0%',
      slowRequestRate: this.performanceMetrics.totalRequests > 0 ? 
        (this.performanceMetrics.slowRequests / this.performanceMetrics.totalRequests * 100).toFixed(2) + '%' : 
        '0%',
      averageResponseTimeFormatted: `${Math.round(this.performanceMetrics.averageResponseTime)}ms`,
      totalResponseTimeFormatted: `${Math.round(this.performanceMetrics.totalResponseTime / 1000)}s`,
      currentConfiguration: {
        apiBatchSize: this.apiBatchSize,
        dbBatchSize: this.batchSize,
        requestDelay: this.requestDelay,
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
        connectionPoolSize: this.connectionPoolSize,
        timeouts: this.timeouts
      }
    };
  }

  /**
   * Performans metriklerini sıfırla
   */
  resetPerformanceMetrics() {
    this.performanceMetrics = {
      totalRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      failedRequests: 0
    };
    
    this.logger.info('Performans metrikleri sıfırlandı');
  }

  /**
   * Performans raporu oluştur
   * @returns {Object} Performans raporu
   */
  generatePerformanceReport() {
    const metrics = this.getPerformanceMetrics();
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalRequests: metrics.totalRequests,
        successRate: metrics.successRate,
        averageResponseTime: metrics.averageResponseTimeFormatted,
        slowRequestRate: metrics.slowRequestRate,
        failedRequests: metrics.failedRequests
      },
      performance: {
        rating: metrics.averageResponseTime < 5000 ? 'EXCELLENT' : 
                metrics.averageResponseTime < 15000 ? 'GOOD' : 
                metrics.averageResponseTime < 30000 ? 'FAIR' : 'POOR',
        recommendations: this.getPerformanceRecommendations(metrics)
      },
      configuration: metrics.currentConfiguration,
      sessionInfo: {
        hasValidSession: this.isSessionValid(),
        sessionExpiry: this.sessionExpireTime,
        cachedSessionId: this.cachedSessionId ? this.cachedSessionId.substring(0, 10) + '...' : null
      }
    };

    this.logger.info('=== PERFORMANS RAPORU ===', report);
    return report;
  }

  /**
   * Performans önerileri oluştur
   * @param {Object} metrics - Performans metrikleri
   * @returns {Array} Öneriler listesi
   */
  getPerformanceRecommendations(metrics) {
    const recommendations = [];

    if (metrics.averageResponseTime > 30000) {
      recommendations.push({
        type: 'CRITICAL',
        message: 'Ortalama yanıt süresi çok yüksek (>30s). API batch boyutunu düşürün.',
        suggestion: `DIA_API_BATCH_SIZE=${Math.max(500, Math.floor(this.apiBatchSize * 0.7))}`
      });
    }

    if (parseFloat(metrics.slowRequestRate) > 50) {
      recommendations.push({
        type: 'WARNING',
        message: 'Yavaş istek oranı yüksek (>50%). Request delay\'i artırın.',
        suggestion: `DIA_REQUEST_DELAY=${this.requestDelay + 200}`
      });
    }

    if (parseFloat(metrics.successRate) < 90) {
      recommendations.push({
        type: 'ERROR',
        message: 'Başarı oranı düşük (<90%). Timeout değerlerini artırın.',
        suggestion: `DIA_API_TIMEOUT=${this.timeouts.api + 300000}`
      });
    }

    if (metrics.failedRequests > 10) {
      recommendations.push({
        type: 'WARNING',
        message: 'Çok fazla başarısız istek. Retry ayarlarını kontrol edin.',
        suggestion: `DIA_MAX_RETRIES=${this.maxRetries + 1}, DIA_RETRY_DELAY=${this.retryDelay + 1000}`
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'SUCCESS',
        message: 'Performans metrikleri iyi görünüyor.',
        suggestion: 'Mevcut konfigürasyonu koruyun.'
      });
    }

    return recommendations;
  }
}

module.exports = DiaStockService; 