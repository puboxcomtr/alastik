const crypto = require('crypto');
const axios = require('axios');
const winston = require('winston');

/* DİA Ürün Modeli  */
const DiaStock = require('../../../models/plugins/DiaStock');

/* WEB Ürün Modeli */
const WebProduct = require('../../../models/web/catalog/WebProduct');

/* Web kategori Modeli */
const WebCategory = require('../../../models/web/catalog/WebCategory');

/* Web marka Modeli */
const WebBrand = require('../../../models/web/catalog/WebBrand');


const CacheManager = require('../../../../../../packages/cache/');


/* Filter Config */
const { getFiltersForSyncType, logFilterConfig, getBasicFilters, getDiaFields } = require('../../../config/diaFilters');

const DiaSettings = require('../../../models/plugins/dia/DiaSettings');

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
      baseURL: '',
      apiKey: '',
      username: '',
      password: '',
      firmaKodu: 1,
      donemKodu: 2,
      timeout: 600000,
      apiTimeout: 1800000,
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'Accept-Encoding': 'gzip, deflate'
      }
    };

    this.configLoaded = false;


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

    this.fullSyncBatchSize = parseInt(process.env.DIA_FULLSYNC_BATCH_SIZE) || 200;
    this.fullSyncDelay = parseInt(process.env.DIA_FULLSYNC_DELAY) || 3000;
    this.fullSyncMaxBatches = parseInt(process.env.DIA_FULLSYNC_MAX_BATCHES) || 100;

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
  * DIA DB Ayarları
  */
  async loadConfig() {
    if (this.configLoaded) return;
    try {
      const settings = await DiaSettings.getSettings();
      if (settings && settings.baseURL) {
        this.diaApiConfig.baseURL = settings.baseURL;
        this.diaApiConfig.apiKey = settings.apiKey;
        this.diaApiConfig.username = settings.username;
        this.diaApiConfig.password = settings.password;
        this.diaApiConfig.firmaKodu = settings.firmaKodu;
        this.diaApiConfig.donemKodu = settings.donemKodu;
        this.logger.info('DIA config DB\'den yüklendi', {
          baseURL: settings.baseURL,
          firmaKodu: settings.firmaKodu,
          donemKodu: settings.donemKodu
        });
      } else {
        this.logger.warn('DB\'de DIA ayarı yok, .env fallback kullanılıyor');
        this.diaApiConfig.baseURL = process.env.DIA_BASE_URL || 'https://artlastik.ws.dia.com.tr';
        this.diaApiConfig.apiKey = process.env.DIA_API_KEY || 'eda23858-0e9b-4a81-b7e2-4c9f03d30078';
        this.diaApiConfig.username = process.env.DIA_USERNAME || 'Ws_alastik_B2C';
        this.diaApiConfig.password = process.env.DIA_PASSWORD || 'Ws_alastik_B2C';
        this.diaApiConfig.firmaKodu = parseInt(process.env.DIA_FIRMA_KODU || '1');
        this.diaApiConfig.donemKodu = parseInt(process.env.DIA_DONEM_KODU || '3');
      }
      this.configLoaded = true;
    } catch (err) {
      this.logger.error('DIA config yükleme hatası, .env fallback', { error: err.message });
      this.diaApiConfig.baseURL = process.env.DIA_BASE_URL || 'https://artlastik.ws.dia.com.tr';
      this.diaApiConfig.apiKey = process.env.DIA_API_KEY || 'eda23858-0e9b-4a81-b7e2-4c9f03d30078';
      this.diaApiConfig.username = process.env.DIA_USERNAME || 'Ws_alastik_B2C';
      this.diaApiConfig.password = process.env.DIA_PASSWORD || 'Ws_alastik_B2C';
      this.diaApiConfig.firmaKodu = parseInt(process.env.DIA_FIRMA_KODU || '1');
      this.diaApiConfig.donemKodu = parseInt(process.env.DIA_DONEM_KODU || '3');
      this.configLoaded = true;
    }
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
    await this.loadConfig();
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
          fields: getDiaFields(),
          _cache_bypass: Date.now(),
          nocache: true
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
      if (error.message.includes('INVALID_SESSION') || error.message.includes('TimedOut') || error.message.includes('timed out')) {
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
   * Web Ürünlerini DİA Collections Çek *
  **/
  transformDiaDataForWeb(diaProduct) {
    return {
      _key_scf_karebarkod: diaProduct._key_scf_karebarkod,
      _key_scf_marka: diaProduct._key_scf_marka,
      _key_scf_odeme_plani: diaProduct._key_scf_odeme_plani,
      _key_scf_urun_ozellik: diaProduct._key_scf_urun_ozellik,
      _key_sis_ozelkod1: diaProduct._key_sis_ozelkod1,
      _key_sis_ozelkod2: diaProduct._key_sis_ozelkod2,
      _key_sis_ozelkod3: diaProduct._key_sis_ozelkod3,
      _key_sis_ozelkod4: diaProduct._key_sis_ozelkod4,
      _key_sis_ozelkod5: diaProduct._key_sis_ozelkod5,
      _key_sis_ozelkod6: diaProduct._key_sis_ozelkod6,
      _key_sis_ozelkod7: diaProduct._key_sis_ozelkod7,
      _key_sis_ozelkod8: diaProduct._key_sis_ozelkod8,
      _key_sis_ozelkod9: diaProduct._key_sis_ozelkod9,
      _key_sis_ozelkod10: diaProduct._key_sis_ozelkod10,
      _key_sis_ozelkod11: diaProduct._key_sis_ozelkod11,
      _key_sis_resim: diaProduct._key_sis_resim,

      aciklama: diaProduct.aciklama,
      anabarkod: diaProduct.anabarkod,
      barkodu: diaProduct.barkodu,
      durum: diaProduct.durum,

      ekalan1: diaProduct.ekalan1,
      ekalan2: diaProduct.ekalan2,
      ekalan3: diaProduct.ekalan3,
      ekalan4: diaProduct.ekalan4,
      ekalan5: diaProduct.ekalan5,
      ekalan6: diaProduct.ekalan6,
      ekalan7: diaProduct.ekalan7,
      ekalan8: diaProduct.ekalan8,
      ekalan9: diaProduct.ekalan9,
      ekalan10: diaProduct.ekalan10,

      gercek_stok: diaProduct.gercek_stok ?? 0,
      anabirimdesi: diaProduct.anabirimdesi ?? 0,
      marka: diaProduct.marka,
      menseiulkeadi: diaProduct.menseiulkeadi,

      ozelkod1: diaProduct.ozelkod1,
      ozelkod1kodu: diaProduct.ozelkod1kodu,
      ozelkod2: diaProduct.ozelkod2,
      ozelkod2kodu: diaProduct.ozelkod2kodu,
      ozelkod3: diaProduct.ozelkod3,
      ozelkod3kodu: diaProduct.ozelkod3kodu,
      ozelkod4: diaProduct.ozelkod4,
      ozelkod4kodu: diaProduct.ozelkod4kodu,
      ozelkod5: diaProduct.ozelkod5,
      ozelkod5kodu: diaProduct.ozelkod5kodu,
      ozelkod6: diaProduct.ozelkod6,
      ozelkod6kodu: diaProduct.ozelkod6kodu,
      ozelkod7: diaProduct.ozelkod7,
      ozelkod7kodu: diaProduct.ozelkod7kodu,
      ozelkod8: diaProduct.ozelkod8,
      ozelkod8kodu: diaProduct.ozelkod8kodu,
      ozelkod9: diaProduct.ozelkod9,
      ozelkod9kodu: diaProduct.ozelkod9kodu,
      ozelkod10: diaProduct.ozelkod10,
      ozelkod10kodu: diaProduct.ozelkod10kodu,
      ozelkod11: diaProduct.ozelkod11,
      ozelkod11kodu: diaProduct.ozelkod11kodu,

      stokkartkodu: diaProduct.stokkartkodu,
      synced: diaProduct.synced || 'synced',

      m_birimler: diaProduct.m_birimler || [],
      m_kategoriler: diaProduct.m_kategoriler || [],
      m_resimler: diaProduct.m_resimler || [],
      m_urunOzellikleri: diaProduct.m_urunOzellikleri || []
    };
  }
  /**
     * Web Ürünlerini DB Kaydet *
  **/
  generateSmartCustomData(diaProduct, existingCustomData = null) {
    const determineWebCategory = (product) => {
      if (!product.m_kategoriler || product.m_kategoriler.length === 0) return 'diger';

      const firstCategory = product.m_kategoriler[0];
      const kategori1 = firstCategory.kategori_aciklama_1?.toLowerCase();
      const kategori2 = firstCategory.kategori_aciklama_2?.toLowerCase();

      if (kategori1?.includes('lastik')) {
        if (kategori2?.includes('yaz')) return 'yaz-lastikleri';
        if (kategori2?.includes('kış')) return 'kis-lastikleri';
        if (kategori2?.includes('oto')) return 'oto-lastikleri';
        return 'lastikler';
      }

      if (kategori1?.includes('jant')) return 'jantlar';
      if (kategori1?.includes('akü')) return 'aküler';
      return 'diger';
    };
    const getFeaturedImage = (images) => {
      if (!images || images.length === 0) return null;
      return images[0].aws_url || null;
    };
    const isNewProduct = (product) => {
      if (product.ekalan5) {
        const currentYear = new Date().getFullYear();
        const productYear = parseInt(product.ekalan5);
        return productYear >= currentYear - 1;
      }
      return false;
    };
    // Smart update - sadece boş veya varsayılan değerleri güncelle
    const smartCustomData = {
      // SEO Bilgileri - manuel güncellenmişse DIA karışmaz
      seoUrl: existingCustomData?.seoUrl || this.generateSeoUrl(diaProduct.aciklama || diaProduct.stokkartkodu),
      seoTitle: existingCustomData?.seoTitle || diaProduct.aciklama,
      seoDescription: existingCustomData?.seoDescription || this.generateSeoDescription(diaProduct),
      seoKeywords: existingCustomData?.seoKeywords || this.generateWebTags(diaProduct),

      // Web görünüm - mevcut değerleri koru
      webOrder: existingCustomData?.webOrder || 0,
      webVisible: existingCustomData?.webVisible !== undefined ? existingCustomData.webVisible : true,
      delivery: existingCustomData?.delivery && existingCustomData.delivery !== 'next_week'
        ? existingCustomData.delivery
        : (diaProduct.stokkartkodu && diaProduct.stokkartkodu.includes('-XMLA') ? 'next_day' : 'same_day'),

      // İçerik - her zaman null, manuel doldurulur
      customDescription: existingCustomData?.customDescription || null,
      shortDescription: existingCustomData?.shortDescription || null,

      // Kategoriler - her zaman null, manuel doldurulur
      webTags: existingCustomData?.webTags || null,
      webCategory: existingCustomData?.webCategory || null,
      webSubCategory: existingCustomData?.webSubCategory || null,

      // Görseller - her zaman null, manuel doldurulur
      customImages: existingCustomData?.customImages || [],
      featuredImage: existingCustomData?.featuredImage || null,

      // Fiyatlandırma - her zaman null, manuel doldurulur
      webPrice: existingCustomData?.webPrice || null,
      originalPrice: existingCustomData?.originalPrice || null,
      webDiscount: existingCustomData?.webDiscount !== undefined ? existingCustomData.webDiscount : 0,
      discountType: existingCustomData?.discountType || 'percentage',

      // Stok bilgileri - her zaman null, manuel doldurulur
      minOrderQuantity: existingCustomData?.minOrderQuantity || 1,
      maxOrderQuantity: existingCustomData?.maxOrderQuantity || null,
      stockAlert: existingCustomData?.stockAlert || 5,

      // Meta bilgiler - her zaman null, manuel doldurulur
      isNew: existingCustomData?.isNew || false,
      isBestSeller: existingCustomData?.isBestSeller || false,
      isFeatured: existingCustomData?.isFeatured || false
    };

    return smartCustomData;
  }
  /* (Boşsa) Otomatik SEO Etiket Oluştur */
  generateWebTags(product) {
    const tags = [];
    if (product.marka) tags.push(product.marka.toLowerCase());
    if (product.ozelkod3kodu) tags.push(product.ozelkod3kodu.toLowerCase());
    if (product.m_kategoriler && product.m_kategoriler[0]) {
      const kat = product.m_kategoriler[0];
      if (kat.kategori_aciklama_1) tags.push(kat.kategori_aciklama_1.toLowerCase());
      if (kat.kategori_aciklama_2) tags.push(kat.kategori_aciklama_2.toLowerCase());
    }
    return [...new Set(tags)];
  }
  /* (Boşsa) Otomatik SEO URL Oluştur */
  generateSeoUrl(text) {
    if (!text) return null;
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }
  /* (Boşsa) Otomatik SEO Description Oluştur */
  generateSeoDescription(product) {
    const parts = [];
    if (product.marka) parts.push(product.marka);
    if (product.aciklama) parts.push(product.aciklama);
    if (product.ekalan1) parts.push(product.ekalan1);
    return parts.join(' - ').substring(0, 160);
  };
  /**
 * Unique SEO URL oluştur
 */
  async generateUniqueSeoUrl(text, productKey) {
    let seoUrl = this.generateSeoUrl(text);

    // Unique slug kontrolü
    const existingProduct = await WebProduct.findOne({
      'customData.seoUrl': seoUrl,
      '_key': { $ne: productKey }
    });

    if (existingProduct) {
      let counter = 1;
      let newSeoUrl = `${seoUrl}-${counter}`;

      while (await WebProduct.findOne({
        'customData.seoUrl': newSeoUrl,
        '_key': { $ne: productKey }
      })) {
        counter++;
        newSeoUrl = `${seoUrl}-${counter}`;
      }

      seoUrl = newSeoUrl;
    }

    return seoUrl;
  }
  /**
   * DIA Verilerini
   * Kategori Listesini Senkronize Et (categories collection'da)
  */
  async syncCategoriesToWebCategory() {
    const operationId = `sync_categories_${Date.now()}`;
    const startTime = Date.now();
    try {
      this.logger.info('=== KATEGORİ SENKRONİZASYONU BAŞLANGICI ===', { operationId });
      const categoryPipeline = [
        { $match: { 'syncInfo.diaStatus': 'synced' } },
        { $unwind: '$diaData.m_kategoriler' },
        {
          $group: {
            _id: {
              level1: '$diaData.m_kategoriler.kategori_aciklama_1',
              level2: '$diaData.m_kategoriler.kategori_aciklama_2',
              level3: '$diaData.m_kategoriler.kategori_aciklama_3'
            },
            productCount: { $sum: 1 }
          }
        },
        { $sort: { '_id.level1': 1, '_id.level2': 1, '_id.level3': 1 } }
      ];

      const categories = await WebProduct.aggregate(categoryPipeline);

      let created = 0;
      let updated = 0;

      for (const cat of categories) {
        const { level1, level2, level3 } = cat._id;
        if (level1) {
          const result = await this.createOrUpdateWebCategory({
            name: level1,
            level: 1,
            diaCategory: level1,
            diaLevel: 'kategori_aciklama_1'
          });
          if (result.created) created++;
          if (result.updated) updated++;
        }
        if (level1 && level2) {
          const parentCat = await WebCategory.findOne({
            level: 1,
            diaCategory: level1
          });

          if (parentCat) {
            const result = await this.createOrUpdateWebCategory({
              name: level2,
              level: 2,
              parent: parentCat._id,
              parentPath: [parentCat._id],
              diaCategory: level2,
              diaLevel: 'kategori_aciklama_2'
            });
            if (result.created) created++;
            if (result.updated) updated++;
          }
        }
        if (level1 && level2 && level3) {
          const parentCat = await WebCategory.findOne({
            level: 2,
            diaCategory: level2
          });

          if (parentCat) {
            const result = await this.createOrUpdateWebCategory({
              name: level3,
              level: 3,
              parent: parentCat._id,
              parentPath: parentCat.parentPath.concat([parentCat._id]),
              diaCategory: level3,
              diaLevel: 'kategori_aciklama_3'
            });
            if (result.created) created++;
            if (result.updated) updated++;
          }
        }
      }
      await this.updateCategoryProductCounts();

      const duration = Date.now() - startTime;

      this.logger.info('=== KATEGORİ SENKRONİZASYONU TAMAMLANDI ===', {
        operationId,
        created,
        updated,
        duration: `${duration}ms`
      });

      return {
        success: true,
        created,
        updated,
        totalCategories: categories.length,
        duration: `${duration}ms`
      };

    } catch (error) {
      this.logger.error('Kategori senkronizasyonu hatası:', { error: error.message, operationId });
      throw error;
    }
  }
  async createOrUpdateWebCategory(categoryData) {
    const slug = this.generateCategorySlug(categoryData.name);
    let existingCategory = await WebCategory.findOne({ slug: slug });
    if (!existingCategory) {
      existingCategory = await WebCategory.findOne({
        level: categoryData.level,
        diaCategory: categoryData.diaCategory,
        diaLevel: categoryData.diaLevel
      });
    }

    if (existingCategory) {
      const updateData = {
        name: categoryData.name,
        diaCategory: categoryData.diaCategory,
        diaLevel: categoryData.diaLevel,
        'syncInfo.lastSync': new Date(),
        'syncInfo.syncStatus': 'synced'
      };

      if (existingCategory.description === undefined) {
        updateData.description = null;
      }
      if (existingCategory.customImage === undefined) {
        updateData.customImage = null;
      }

      await WebCategory.updateOne(
        { _id: existingCategory._id },
        { $set: updateData }
      );
      return { updated: true };
    } else {
      await WebCategory.create({
        ...categoryData,
        slug: slug,
        webVisible: true,
        webOrder: 0,
        seoTitle: categoryData.name,
        seoUrl: slug,
        description: null,
        customImage: null,
        syncInfo: {
          lastSync: new Date(),
          syncStatus: 'synced',
          syncSource: 'diasync'
        }
      });
      return { created: true };
    }
  }
  /* Ürün Slug Oluştur */
  generateCategorySlug(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  /* Web Product Kategori İçerisindeki Ürün Sayılarını Kaydet */
  async updateCategoryProductCounts() {
    const WebCategory = require('../../../models/web/catalog/WebCategory');
    const categories = await WebCategory.find({});
    for (const category of categories) {
      const productCount = await WebProduct.countDocuments({
        'syncInfo.diaStatus': 'synced',
        [`diaData.m_kategoriler.${category.diaLevel}`]: category.diaCategory
      });

      const activeProductCount = await WebProduct.countDocuments({
        'syncInfo.diaStatus': 'synced',
        'customData.webVisible': true,
        'diaData.durum': 'A',
        [`diaData.m_kategoriler.${category.diaLevel}`]: category.diaCategory
      });

      await WebCategory.updateOne(
        { _id: category._id },
        {
          $set: {
            productCount,
            activeProductCount,
            'syncInfo.lastProductSync': new Date()
          }
        }
      );
    }
  }
  /**
   * DIA Verilerini
   * Marka Listesini Senkronize Et (brands collection'da)
  */
  async syncBrandsToWebBrand() {
    const operationId = `sync_brands_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.info('=== MARKA SENKRONİZASYONU BAŞLANGICI ===', { operationId });

      // diastocks collection'ından markaları topla
      const brandPipeline = [
        {
          $match: {
            'syncInfo.syncStatus': 'synced',
            'marka': { $exists: true, $ne: null, $ne: '' }
          }
        },
        {
          $group: {
            _id: '$marka',
            markaAck: { $first: '$markaack' },
            diaKey: { $first: '$_key_scf_marka' },
            productCount: { $sum: 1 },
            activeProductCount: { $sum: 1 },
            totalStock: { $sum: '$fiili_stok' },
            totalValue: {
              $sum: {
                $multiply: ['$fiili_stok', '$fiyat1']
              }
            },
            minPrice: { $min: '$fiyat1' },
            maxPrice: { $max: '$fiyat1' },
            avgPrice: { $avg: '$fiyat1' },
            categories: { $addToSet: { $arrayElemAt: ['$m_kategoriler.kategori_aciklama_1', 0] } }
          }
        },
        { $sort: { productCount: -1, _id: 1 } }
      ];

      const brands = await DiaStock.aggregate(brandPipeline);

      let created = 0;
      let updated = 0;

      for (const brandData of brands) {
        try {
          const result = await this.createOrUpdateWebBrand(brandData);
          if (result.created) created++;
          if (result.updated) updated++;
        } catch (brandError) {
          this.logger.error('Marka işleme hatası:', {
            brand: brandData._id,
            error: brandError.message
          });
        }
      }

      const duration = Date.now() - startTime;

      this.logger.info('=== MARKA SENKRONİZASYONU TAMAMLANDI ===', {
        operationId,
        created,
        updated,
        totalBrands: brands.length,
        duration: `${duration}ms`
      });

      return {
        success: true,
        created,
        updated,
        totalBrands: brands.length,
        duration: `${duration}ms`
      };

    } catch (error) {
      this.logger.error('Marka senkronizasyonu hatası:', {
        error: error.message,
        operationId
      });
      throw error;
    }
  }
  async createOrUpdateWebBrand(brandData) {
    try {
      if (!brandData._id || brandData._id.trim() === '' || brandData._id === '#') {
        return { skipped: true };
      }
      const slug = this.generateBrandSlug(brandData._id);
      const seoUrl = this.generateSeoUrl(brandData._id);

      const existingBrand = await WebBrand.findOne({
        $or: [
          { diaBrand: brandData._id },
          { slug: slug }
        ]
      });

      const categoryDistribution = brandData.categories
        .filter(cat => cat)
        .map(cat => ({
          categoryName: cat,
          productCount: 1
        }));

      if (existingBrand) {
        // Mevcut marka - güncelle
        await WebBrand.updateOne(
          { _id: existingBrand._id },
          {
            $set: {
              name: existingBrand.customName || brandData._id.toUpperCase(),
              diaMarkaAck: brandData.markaAck,
              diaKey: brandData.diaKey,
              productCount: brandData.productCount,
              activeProductCount: brandData.activeProductCount,
              totalStock: brandData.totalStock || 0,
              totalValue: brandData.totalValue || 0,
              categoryDistribution: categoryDistribution,
              'priceRange.min': brandData.minPrice || 0,
              'priceRange.max': brandData.maxPrice || 0,
              'priceRange.average': brandData.avgPrice || 0,
              'syncInfo.lastSync': new Date(),
              'syncInfo.syncStatus': 'synced',
              'syncInfo.lastDiaSync': new Date()
            }
          }
        );
        return { updated: true };
      } else {
        // Yeni marka oluştur
        await WebBrand.create({
          name: brandData._id.toUpperCase(),
          slug: slug,
          diaBrand: brandData._id,
          diaMarkaAck: brandData.markaAck,
          diaKey: brandData.diaKey,
          webVisible: true,
          webOrder: 0,
          seoTitle: brandData._id,
          seoDescription: `${brandData._id} markası ürünleri`,
          seoUrl: seoUrl,
          seoKeywords: [brandData._id.toLowerCase()],
          customImage: { url: null, alt: brandData._id, title: brandData._id },
          description: null,
          logo: { url: null, alt: `${brandData._id} Logo`, title: `${brandData._id} Logo` },
          bannerImage: { url: null, alt: `${brandData._id} Banner`, title: `${brandData._id} Banner` },
          brandInfo: { foundedYear: null, country: null, website: null, about: null },
          showcase: [],
          productCount: brandData.productCount,
          activeProductCount: brandData.activeProductCount,
          totalStock: brandData.totalStock || 0,
          totalValue: brandData.totalValue || 0,
          categoryDistribution: categoryDistribution,
          priceRange: {
            min: brandData.minPrice || 0,
            max: brandData.maxPrice || 0,
            average: brandData.avgPrice || 0
          },
          syncInfo: {
            lastSync: new Date(),
            syncStatus: 'synced',
            syncSource: 'diasync',
            lastDiaSync: new Date()
          }
        });
        return { created: true };
      }
    } catch (error) {
      this.logger.error('WebBrand oluşturma/güncelleme hatası:', {
        brand: brandData._id,
        error: error.message
      });
      throw error;
    }
  }
  /**
   * Ürünün kritik alanlarından hash oluştur
   */
  generateProductHash(product) {
    const hashData = {
      stokkartkodu: product.stokkartkodu || '',
      aciklama: product.aciklama || '',
      anabarkod: product.anabarkod || '',
      barkodu: product.barkodu || '',
      marka: product.marka || '',
      markaack: product.markaack || '',
      ozelkod11: product.ozelkod11 || '',
      ozelkod11kodu: product.ozelkod11kodu || '',
      durum: product.durum || '',
      gercek_stok: product.gercek_stok ?? 0,
      anabirimdesi: product.anabirimdesi ?? 0,
      fiyat1: product.fiyat1 || 0,
      fiyat2: product.fiyat2 || 0,
      fiyat3: product.fiyat3 || 0,
      fiyat4: product.fiyat4 || 0,
      fiyat10: product.fiyat10 || 0,
      __dinamik__16: product.__dinamik__16 || '',
      m_birimler: JSON.stringify((product.m_birimler || []).map(b => ({
        fiyat1: b.fiyat1, fiyat2: b.fiyat2, fiyat3: b.fiyat3, fiyat4: b.fiyat4, fiyat10: b.fiyat10
      }))),
      m_kategoriler: JSON.stringify((product.m_kategoriler || []).map(k => ({
        k1: k.kategori_aciklama_1, k2: k.kategori_aciklama_2, k3: k.kategori_aciklama_3
      }))),
      m_urunOzellikleri: JSON.stringify((product.m_urunOzellikleri || []).map(o => ({
        ad: o.ozellikadi, deger: o.detayaciklama
      })))
    };

    return crypto.createHash('md5').update(JSON.stringify(hashData)).digest('hex');
  }
  /**
   * Fiyat hash'i oluştur (light sync için)
   */
  generatePriceHash(product) {
    const data = {
      fiyat1: parseFloat(product.fiyat1) || 0,
      fiyat2: parseFloat(product.fiyat2) || 0,
      fiyat3: parseFloat(product.fiyat3) || 0,
      fiyat4: parseFloat(product.fiyat4) || 0,
      fiyat10: parseFloat(product.fiyat10) || 0,
      sontuketicifiyati: parseFloat(product.sontuketicifiyati) || 0,
      kdvsatis: parseFloat(product.kdvsatis) || 0,
      __dinamik__16: parseFloat(product.__dinamik__16) || 0
    };
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  }
  /**
   * Stok hash'i oluştur (light sync için)
   */
  generateStockHash(product) {
    const data = {
      gercek_stok: parseFloat(product.gercek_stok) ?? 0
    };
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  }
  /**
 * Özelkod hash'i oluştur
 */
  generateOzelkodHash(product) {
    const data = {
      marka: product.marka || '',
      anabarkod: product.anabarkod || '',
      ozelkod1: product.ozelkod1 || '',
      ozelkod1kodu: product.ozelkod1kodu || '',
      ozelkod2: product.ozelkod2 || '',
      ozelkod2kodu: product.ozelkod2kodu || '',
      ozelkod3: product.ozelkod3 || '',
      ozelkod3kodu: product.ozelkod3kodu || '',
      ozelkod4: product.ozelkod4 || '',
      ozelkod4kodu: product.ozelkod4kodu || '',
      ozelkod5: product.ozelkod5 || '',
      ozelkod5kodu: product.ozelkod5kodu || '',
      ozelkod6: product.ozelkod6 || '',
      ozelkod6kodu: product.ozelkod6kodu || '',
      ozelkod7: product.ozelkod7 || '',
      ozelkod7kodu: product.ozelkod7kodu || '',
      ozelkod8: product.ozelkod8 || '',
      ozelkod8kodu: product.ozelkod8kodu || '',
      ozelkod9: product.ozelkod9 || '',
      ozelkod9kodu: product.ozelkod9kodu || '',
      ozelkod10: product.ozelkod10 || '',
      ozelkod10kodu: product.ozelkod10kodu || '',
      ozelkod11: product.ozelkod11 || '',
      ozelkod11kodu: product.ozelkod11kodu || '',
      m_urunOzellikleri: JSON.stringify(
        (product.m_urunOzellikleri || []).map(o => ({
          ad: o.ozellikadi,
          deger: o.detayaciklama
        }))
      )
    };
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  }
  /**
   * Marka için slug oluştur
   */
  generateBrandSlug(brandName) {
    if (!brandName) return null;
    const slug = brandName
      .toLowerCase()
      .trim()
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug || slug.length === 0) {
      return 'marka-' + Date.now();
    }
    return slug;
  }

  /**
   * Markalardaki ürün sayılarını güncelle
   */
  async updateBrandProductCounts() {
    const brands = await WebBrand.find({});

    for (const brand of brands) {
      const productCount = await DiaStock.countDocuments({
        'marka': brand.diaBrand
      });

      const activeProductCount = await DiaStock.countDocuments({
        'marka': brand.diaBrand,
        'durum': 'A'
      });

      await WebBrand.updateOne(
        { _id: brand._id },
        {
          $set: {
            productCount,
            activeProductCount,
            'syncInfo.lastProductSync': new Date()
          }
        }
      );
    }
  }
  /**
   * DIA Verilerini
   * Özellik Listesini Senkronize Et (feature collection'da)
  **/
  async syncFeaturesToWebFeature() {
    const operationId = `sync_features_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.info('=== ÖZELLİK SENKRONİZASYONU BAŞLANGICI ===', { operationId });

      const WebFeature = require('../../../models/web/catalog/WebFeature');

      // WebProduct'lardan tüm özellikleri topla
      const featurePipeline = [
        { $match: { 'syncInfo.diaStatus': 'synced' } },
        { $unwind: '$diaData.m_urunOzellikleri' },
        {
          $match: {
            'diaData.m_urunOzellikleri.ozellikadi': { $exists: true, $ne: null, $ne: '' },
            'diaData.m_urunOzellikleri.detayaciklama': { $exists: true, $ne: null, $ne: '' }
          }
        },
        {
          $group: {
            _id: {
              featureName: '$diaData.m_urunOzellikleri.ozellikadi',
              featureValue: '$diaData.m_urunOzellikleri.detayaciklama'
            },
            productKeys: { $addToSet: '$_key' },
            diaFeatureKey: { $first: '$diaData.m_urunOzellikleri._key_scf_urun_ozellik' }
          }
        },
        { $sort: { '_id.featureName': 1, '_id.featureValue': 1 } }
      ];

      const features = await WebProduct.aggregate(featurePipeline);

      let created = 0;
      let updated = 0;

      for (const feature of features) {
        const { featureName, featureValue } = feature._id;

        const result = await this.createOrUpdateWebFeature({
          featureName,
          featureValue,
          productKeys: feature.productKeys,
          diaFeatureKey: feature.diaFeatureKey
        });

        if (result.created) created++;
        if (result.updated) updated++;
      }

      const duration = Date.now() - startTime;

      this.logger.info('=== ÖZELLİK SENKRONİZASYONU TAMAMLANDI ===', {
        operationId,
        created,
        updated,
        totalFeatures: features.length,
        duration: `${duration}ms`
      });
      const validFeaturePairs = features.map(f => ({
        featureName: f._id.featureName,
        featureValue: f._id.featureValue
      }));
      if (validFeaturePairs.length > 0) {
        const deleteResult = await WebFeature.deleteMany({
          syncSource: 'dia_sync',
          $nor: validFeaturePairs.map(pair => ({
            featureName: pair.featureName,
            featureValue: pair.featureValue
          }))
        });

        if (deleteResult.deletedCount > 0) {
          this.logger.info('Eski özellikler temizlendi', {
            deletedCount: deleteResult.deletedCount,
            operationId
          });
        }
      }
      return {
        success: true,
        created,
        updated,
        totalFeatures: features.length,
        duration: `${duration}ms`
      };

    } catch (error) {
      this.logger.error('Özellik senkronizasyonu hatası:', { error: error.message, operationId });
      throw error;
    }
  }
  /* Özellik Listesini DB Kaydet */
  async createOrUpdateWebFeature(featureData) {
    const WebFeature = require('../../../models/web/catalog/WebFeature');

    const existingFeature = await WebFeature.findOne({
      featureName: featureData.featureName,
      featureValue: featureData.featureValue
    });

    if (existingFeature) {
      await WebFeature.updateOne(
        { _id: existingFeature._id },
        {
          $set: {
            productKeys: featureData.productKeys,
            productCount: featureData.productKeys.length,
            lastSync: new Date()
          }
        }
      );
      return { updated: true };
    } else {
      await WebFeature.create({
        featureName: featureData.featureName,
        featureValue: featureData.featureValue,
        diaFeatureKey: featureData.diaFeatureKey,
        productKeys: featureData.productKeys,
        productCount: featureData.productKeys.length,
        displayLocation: 'both',
        featureGroupOrder: 0,
        featureValueOrder: 0,
        isActive: true,
        lastSync: new Date(),
        syncSource: 'dia_sync'
      });
      return { created: true };
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
    const diaOperations = [];
    const webOperations = [];
    const errors = [];

    // Mevcut WebProduct'ları toplu çek (performans için)
    const keys = batch.map(item => item._key).filter(key => key);
    const existingWebProducts = await WebProduct.find({ _key: { $in: keys } });
    const webProductMap = {};
    existingWebProducts.forEach(wp => {
      webProductMap[wp._key] = wp;
    });

    // Mevcut DiaStock hash'lerini toplu çek
    const existingDiaStocks = await DiaStock.find(
      { _key: { $in: keys } },
      { _key: 1, dataHash: 1 }
    );
    const diaHashMap = {};
    existingDiaStocks.forEach(ds => {
      diaHashMap[ds._key] = ds.dataHash;
    });

    let skippedCount = 0;

    for (const item of batch) {
      try {
        if (!item._key) {
          errors.push({
            item: item.stokkartkodu || 'Unknown',
            error: 'Missing _key field'
          });
          continue;
        }
        // Filtreleme kontrolü
        if (item.durum !== 'A' || item.ozelkod11kodu !== 'E') {
          continue; // Bu ürün web'de gösterilmeyecek
        }
        // Hash bazlı değişiklik kontrolü
        const newHash = this.generateProductHash(item);
        const existingHash = diaHashMap[item._key];
        const hasWebProduct = !!webProductMap[item._key];

        // Hash aynı VE webproduct zaten varsa atla
        if (existingHash && existingHash === newHash && hasWebProduct) {
          skippedCount++;
          continue;
        }

        // 1. DiaStock operation
        const cleanedData = this.cleanDiaData(item);
        diaOperations.push({
          updateOne: {
            filter: { _key: item._key },
            update: {
              $set: {
                ...cleanedData,
                'syncInfo.lastSyncDate': new Date(),
                'syncInfo.syncStatus': 'synced',
                'syncInfo.syncSource': 'dia_api',
                dataHash: newHash,
              }
            },
            upsert: true
          }
        });

        // 2. WebProduct operation (yeni)
        const existingWebProduct = webProductMap[item._key];
        const transformedDiaData = this.transformDiaDataForWeb(item);

        if (existingWebProduct) {
          // Mevcut ürün - sadece DIA data ve akıllı customData güncelle
          const smartCustomData = this.generateSmartCustomData(item, existingWebProduct.customData);

          webOperations.push({
            updateOne: {
              filter: {
                _key: item._key,
                'syncInfo.syncSource': { $ne: 'xml_integration' }
              },
              update: {
                $set: {
                  'diaData': transformedDiaData,
                  'customData': smartCustomData,
                  'syncInfo.lastDiaSync': new Date(),
                  'syncInfo.diaStatus': 'synced',
                  'syncInfo.syncSource': 'dia_api'
                }
              }
            }
          });
        } else {
          const newCustomData = {
            seoUrl: await this.generateUniqueSeoUrl(item.aciklama || item.stokkartkodu, item._key),
            seoTitle: item.aciklama,
            seoDescription: this.generateSeoDescription(item),
            seoKeywords: this.generateWebTags(item),
            webOrder: 0,
            webVisible: true,
            customDescription: null,
            shortDescription: null,
            webTags: null,
            webCategory: null,
            webSubCategory: null,
            customImages: [],
            featuredImage: null,
            webPrice: null,
            originalPrice: null,
            webDiscount: 0,
            discountType: 'percentage',
            minOrderQuantity: 1,
            maxOrderQuantity: null,
            stockAlert: 5,
            isNewProduct: false,
            isBestSeller: false,
            isFeatured: false
          };

          webOperations.push({
            updateOne: {
              filter: { _key: item._key },
              update: {
                $set: {
                  _key: item._key,
                  diaData: transformedDiaData,
                  customData: newCustomData,
                  syncInfo: {
                    lastDiaSync: new Date(),
                    diaStatus: 'synced',
                    webStatus: 'active',
                    syncSource: 'dia_api'
                  }
                }
              },
              upsert: true
            }
          });
        }

      } catch (error) {
        errors.push({
          item: item._key || item.stokkartkodu || 'Unknown',
          error: error.message
        });
      }
    }
    let diaResult = { upsertedCount: 0, modifiedCount: 0 };
    let webResult = { upsertedCount: 0, modifiedCount: 0 };

    if (diaOperations.length > 0) {
      try {
        diaResult = await DiaStock.bulkWrite(diaOperations, {
          ordered: false,
          writeConcern: { w: 1, j: true }
        });
      } catch (error) {
        this.logger.error('DiaStock bulk write hatası', { error: error.message });
        throw error;
      }
    }

    if (webOperations.length > 0) {
      try {
        webResult = await WebProduct.bulkWrite(webOperations, {
          ordered: false,
          writeConcern: { w: 1, j: true }
        });
      } catch (error) {
        this.logger.error('WebProduct bulk write hatası', { error: error.message });
      }
    }

    this.logger.info('Batch işlendi', {
      diaProcessed: diaOperations.length,
      webProcessed: webOperations.length,
      skipped: skippedCount,
      diaInserted: diaResult.upsertedCount || 0,
      diaUpdated: diaResult.modifiedCount || 0,
      webInserted: webResult.upsertedCount || 0,
      webUpdated: webResult.modifiedCount || 0,
      errors: errors.length
    });

    return {
      processed: diaOperations.length,
      inserted: (diaResult.upsertedCount || 0) + (webResult.upsertedCount || 0),
      updated: (diaResult.modifiedCount || 0) + (webResult.modifiedCount || 0),
      errors: errors,
      webProductsProcessed: webOperations.length
    };
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
    const stringFields = [
      'aciklama', 'marka', 'markaack', 'stokkartkodu', 'firmaadi',
      'ekalan1', 'ekalan2', 'ekalan3', 'ekalan4', 'ekalan5'
    ];

    stringFields.forEach(field => {
      if (cleaned[field] && typeof cleaned[field] === 'string') {
        cleaned[field] = cleaned[field].trim();
      }
    });

    const booleanFields = ['kilitli'];
    booleanFields.forEach(field => {
      if (cleaned[field] !== undefined) {
        cleaned[field] = cleaned[field] === 't' || cleaned[field] === true;
      }
    });

    let finalFiyat4 = null;
    if (item.__dinamik__16 !== undefined && item.__dinamik__16 !== null && item.__dinamik__16 !== '') {
      const dinamikFiyat = parseFloat(item.__dinamik__16);
      if (!isNaN(dinamikFiyat) && dinamikFiyat > 0) {
        finalFiyat4 = dinamikFiyat;
      }
    }
    if (finalFiyat4 === null && item.fiyat4 !== undefined && item.fiyat4 !== null && item.fiyat4 !== '') {
      const orijinalFiyat = parseFloat(item.fiyat4);
      if (!isNaN(orijinalFiyat) && orijinalFiyat > 0) {
        finalFiyat4 = orijinalFiyat;
      }
    }
    cleaned.fiyat4 = finalFiyat4;
    if (cleaned.m_birimler && cleaned.m_birimler[0]) {
      cleaned.m_birimler[0].fiyat4 = finalFiyat4;
    }

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
          const batchData = await this.fetchSingleBatch(offset, this.apiBatchSize, batchCount);

          if (!batchData || batchData.length === 0) {
            this.logger.info(`Batch ${batchCount}: Veri yok, işlem tamamlandı`);
            hasMore = false;
            break;
          }

          const syncResult = await this.syncStockToDatabase(batchData);

          totalProcessed += syncResult.processed;
          totalInserted += syncResult.inserted;
          totalUpdated += syncResult.updated;
          totalErrors = totalErrors.concat(syncResult.errors);

          offset += this.apiBatchSize;

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
   * Sadece Kategorileri Güncelle
   * 3 collection birden: diastocks + webproducts + webcategories
   */
  async syncOnlyCategories() {
    const operationId = `sync_categories_only_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.info('=== SADECE KATEGORİ SYNC BAŞLANGICI ===', { operationId });

      let totalProcessed = 0;
      let diaUpdated = 0;
      let webUpdated = 0;
      let offset = 0;
      let hasMore = true;
      let batchCount = 0;

      while (hasMore) {
        batchCount++;

        const batchData = await this.fetchStockFromDia({
          limit: 1000,
          offset: offset
        });

        if (!batchData || batchData.length === 0) {
          hasMore = false;
          break;
        }

        const diaOps = [];
        const webOps = [];

        for (const product of batchData) {
          if (!product._key) continue;

          const kategoriler = product.m_kategoriler || [];

          diaOps.push({
            updateOne: {
              filter: { _key: product._key },
              update: {
                $set: {
                  m_kategoriler: kategoriler,
                  urunagaci1: product.urunagaci1 || '',
                  urunagaclari: product.urunagaclari || '',
                  'syncInfo.lastSyncDate': new Date(),
                  'syncInfo.syncStatus': 'synced',
                  'syncInfo.syncType': 'categories_only'
                }
              }
            }
          });

          // XML kaynağından gelen ürünlere DIA stok yazma
          webOps.push({
            updateOne: {
              filter: {
                _key: product._key,
                'syncInfo.syncSource': { $ne: 'xml_integration' }
              },
              update: {
                $set: {
                  'diaData.gercek_stok': stokMiktari,
                  'syncInfo.lastDiaSync': new Date(),
                  'syncInfo.diaStatus': 'synced'
                }
              }
            }
          });
        }

        if (diaOps.length > 0) {
          const diaResult = await DiaStock.bulkWrite(diaOps, { ordered: false });
          diaUpdated += diaResult.modifiedCount || 0;
        }
        if (webOps.length > 0) {
          const webResult = await WebProduct.bulkWrite(webOps, { ordered: false });
          webUpdated += webResult.modifiedCount || 0;
        }

        totalProcessed += batchData.length;
        offset += 1000;

        this.logger.info(`Categories Batch ${batchCount}: ${diaOps.length} işlendi`, {
          operationId,
          diaUpdated,
          webUpdated
        });

        await this.sleep(100);
      }

      this.logger.info('WebCategories collection yeniden senkronize ediliyor...', { operationId });
      const categoryResult = await this.syncCategoriesToWebCategory();

      const duration = Date.now() - startTime;

      this.logger.info('=== SADECE KATEGORİ SYNC TAMAMLANDI ===', {
        operationId,
        totalProcessed,
        diaUpdated,
        webUpdated,
        webCategoriesCreated: categoryResult.created,
        webCategoriesUpdated: categoryResult.updated,
        duration: `${duration}ms`
      });

      return {
        success: true,
        processed: totalProcessed,
        diaUpdated,
        webUpdated,
        webCategories: categoryResult,
        type: 'categories_only',
        duration: `${duration}ms`,
        message: `${diaUpdated} DiaStock + ${webUpdated} WebProduct kategorisi güncellendi, ${categoryResult.created} yeni + ${categoryResult.updated} mevcut web kategorisi senkronize edildi`
      };

    } catch (error) {
      this.logger.error('Kategori sync hatası:', { error: error.message, operationId });
      throw error;
    }
  }
  /**
   * Tam senkronizasyon işlemi - FİLTRELENMİŞ *
   */
  async fullSync(progressCallback = null) {
    try {
      const startTime = Date.now();
      const totalSteps = 8;
      let currentStep = 0;

      const reportProgress = (step, message, detail = {}) => {
        currentStep = step;
        const percent = Math.round((step / totalSteps) * 100);
        if (progressCallback) {
          progressCallback({ percent, step, totalSteps, message, detail });
        }
        this.logger.info(message, detail);
      };

      // 1. DiaStock'a TÜM ürünleri yaz
      reportProgress(0, 'Dia Programı senkronizasyonu başlıyor...');
      const diaStockResult = await this.syncAllToDiaStock((batchInfo) => {
        const subPercent = Math.min(19, Math.round((batchInfo.current / batchInfo.total) * 19));
        if (progressCallback) {
          progressCallback({ percent: subPercent, step: 0, totalSteps, message: `Dia Programı: ${batchInfo.processed} ürün işlendi...` });
        }
      });
      reportProgress(1, 'Dia Programı senkronizasyonu tamamlandı', { processed: diaStockResult.processed });

      // 2. WebProduct'a SADECE E olanları yaz
      reportProgress(1, 'Web Sitesine aktarılıyor...');
      const webProductResult = await this.fetchAndSyncIncrementally();
      reportProgress(2, 'Web Sitesine aktarımı tamamlandı', { processed: webProductResult.processed });

      // 2.5 Eksik ürünleri diastocks'tan webproducts'a aktar
      reportProgress(2, 'Eksik ürünler kontrol ediliyor...');
      const missingResult = await this.syncMissingWebProducts();
      reportProgress(2, 'Eksik ürün aktarımı tamamlandı', { created: missingResult.created });

      // 3. Kategorileri senkronize et
      reportProgress(2, 'Kategori senkronizasyonu başlıyor...');
      const categoryResult = await this.syncCategoriesToWebCategory();
      reportProgress(3, 'Kategori senkronizasyonu tamamlandı', { created: categoryResult.created, updated: categoryResult.updated });

      // 4. Markaları senkronize et
      reportProgress(3, 'Marka senkronizasyonu başlıyor...');
      const brandResult = await this.syncBrandsToWebBrand();
      reportProgress(4, 'Marka senkronizasyonu tamamlandı', { created: brandResult.created, updated: brandResult.updated });

      // 5. H/P olanları temizle
      // 5. H/P olanları temizle
      reportProgress(4, 'Ürün temizleme başlıyor...');
      const deletedCount = await this.archiveStaleProducts();
      reportProgress(5, 'Ürün temizleme tamamlandı', { deleted: deletedCount });

      // 6. Özelkod senkronizasyonu
      reportProgress(5, 'Özelkod senkronizasyonu başlıyor...');
      const ozelkodResult = await this.syncOnlyOzelkodlar();
      reportProgress(6, 'Özelkod senkronizasyonu tamamlandı', { updated: ozelkodResult.updated, skipped: ozelkodResult.skipped });

      // 7. Ürün özellikleri (feature) senkronizasyonu
      reportProgress(6, 'Ürün özellikleri senkronizasyonu başlıyor...');
      const featureResult = await this.syncFeaturesToWebFeature();
      reportProgress(7, 'Görsel senkronizasyonu başlıyor...');
      const imageResult = await this.syncImagesToWebProducts();
      reportProgress(7, 'Tam senkronizasyon tamamlandı', { featuresCreated: featureResult.created, featuresUpdated: featureResult.updated });

      const endTime = Date.now();

      return {
        duration: endTime - startTime,
        diaStock: diaStockResult,
        webProduct: webProductResult,
        categories: categoryResult,
        brands: brandResult,
        deleted: deletedCount,
        ozelkodlar: ozelkodResult,
        features: featureResult,
        images: imageResult,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('Tam senkronizasyon hatası', { error: error.message });
      throw error;
    }
  }
  /**
   * DiaStock'a TÜM ürünleri yaz (sadece durum=A)
   */
  async syncAllToDiaStock(subProgressCallback = null) {
    const startTime = Date.now();

    try {
      this.logger.info('=== DIASTOCK FULL SYNC (TÜM ÜRÜNLER: E, H, P) ===');

      let totalProcessed = 0;
      let offset = 0;
      let batchCount = 0;

      while (batchCount < this.fullSyncMaxBatches) {
        batchCount++;

        const batchData = await this.fetchStockFromDia({
          limit: this.fullSyncBatchSize,
          offset: offset,
          filters: [{ field: 'durum', operator: '=', value: 'A' }]
        });

        if (!batchData || batchData.length === 0) {
          this.logger.info(`Batch ${batchCount}: Veri bitti`);
          break;
        }

        const keys = batchData.map(item => item._key).filter(k => k);
        const existingDocs = await DiaStock.find({ _key: { $in: keys } }, { _key: 1, dataHash: 1 }).lean();
        const hashMap = {};
        existingDocs.forEach(d => { hashMap[d._key] = d.dataHash; });

        const operations = [];
        let skipped = 0;

        for (const item of batchData) {
          if (!item._key) continue;

          const newHash = this.generateProductHash(item);
          if (hashMap[item._key] && hashMap[item._key] === newHash) {
            skipped++;
            continue;
          }

          operations.push({
            updateOne: {
              filter: { _key: item._key },
              update: {
                $set: {
                  ...this.cleanDiaData(item),
                  'syncInfo.lastSyncDate': new Date(),
                  'syncInfo.syncStatus': 'synced',
                  dataHash: newHash
                }
              },
              upsert: true
            }
          });
        }

        if (operations.length > 0) {
          await DiaStock.bulkWrite(operations);
        }
        totalProcessed += operations.length;

        this.logger.info(`DiaStock Batch ${batchCount}: ${operations.length} güncellendi, ${skipped} atlandı (değişmemiş)`);

        if (subProgressCallback) {
          subProgressCallback({ current: batchCount, total: this.fullSyncMaxBatches, processed: totalProcessed });
        }
        offset += this.fullSyncBatchSize;

        await this.sleep(this.fullSyncDelay);
      }

      const duration = Date.now() - startTime;

      this.logger.info('=== DIASTOCK SYNC TAMAMLANDI ===', {
        processed: totalProcessed,
        batches: batchCount,
        duration: `${duration}ms`
      });

      return { processed: totalProcessed, duration: `${duration}ms` };

    } catch (error) {
      this.logger.error('DiaStock sync hatası:', { error: error.message });
      throw error;
    }
  }
  /**
 * diastocks'ta olup webproducts'ta olmayan ürünleri aktar
 */
  async syncMissingWebProducts() {
    const operationId = `sync_missing_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.info('=== EKSİK ÜRÜN AKTARIMI BAŞLANGICI ===', { operationId });

      // diastocks'taki E ürün key'lerini al
      const diaKeys = await DiaStock.distinct('_key', { durum: 'A', ozelkod11kodu: 'E' });

      // webproducts'taki key'leri al
      const webKeys = await WebProduct.distinct('_key');
      const webKeySet = new Set(webKeys);

      // Eksik key'leri bul
      const missingKeys = diaKeys.filter(k => !webKeySet.has(k));

      this.logger.info(`Eksik ürün sayısı: ${missingKeys.length}`, { operationId });

      if (missingKeys.length === 0) {
        return { success: true, created: 0, duration: '0ms' };
      }

      let created = 0;
      let errors = 0;

      // Batch içinde seoUrl çakışmasını önlemek için set tut
      const usedSeoUrls = new Set();

      // Batch halinde işle
      for (let i = 0; i < missingKeys.length; i += 50) {
        const batchKeys = missingKeys.slice(i, i + 50);

        // diastocks'tan ürünleri çek
        const diaProducts = await DiaStock.find({ _key: { $in: batchKeys } }).lean();

        for (const dia of diaProducts) {
          try {
            const transformedDiaData = this.transformDiaDataForWeb(dia);
            let seoUrl = await this.generateUniqueSeoUrl(dia.aciklama || dia.stokkartkodu, dia._key);

            // Batch içi çakışma kontrolü
            let counter = 1;
            while (usedSeoUrls.has(seoUrl)) {
              seoUrl = seoUrl.replace(/-\d+$/, '') + '-' + (++counter);
            }
            usedSeoUrls.add(seoUrl);

            const delivery = (dia.stokkartkodu && dia.stokkartkodu.includes('-XMLA')) ? 'next_day' : 'same_day';

            try {
              await WebProduct.updateOne(
                { _key: dia._key },
                {
                  $set: {
                    _key: dia._key,
                    diaData: transformedDiaData,
                    customData: {
                      seoUrl: seoUrl,
                      seoTitle: dia.aciklama,
                      seoDescription: this.generateSeoDescription(dia),
                      seoKeywords: this.generateWebTags(dia),
                      webOrder: 0,
                      webVisible: true,
                      delivery: delivery,
                      customDescription: null,
                      shortDescription: null,
                      webTags: null,
                      webCategory: null,
                      webSubCategory: null,
                      customImages: [],
                      featuredImage: null,
                      webPrice: null,
                      originalPrice: null,
                      webDiscount: 0,
                      discountType: 'percentage',
                      minOrderQuantity: 1,
                      maxOrderQuantity: null,
                      stockAlert: 5,
                      isNew: false,
                      isBestSeller: false,
                      isFeatured: false
                    },
                    syncInfo: {
                      lastDiaSync: new Date(),
                      diaStatus: 'synced',
                      webStatus: 'active',
                      syncSource: 'dia_missing_sync'
                    }
                  }
                },
                { upsert: true }
              );
              created++;
            } catch (writeErr) {
              if (writeErr.code === 11000) {
                // seoUrl duplicate - sonuna key ekle
                const fallbackUrl = seoUrl + '-' + dia._key;
                usedSeoUrls.add(fallbackUrl);
                await WebProduct.updateOne(
                  { _key: dia._key },
                  {
                    $set: {
                      _key: dia._key,
                      diaData: transformedDiaData,
                      customData: {
                        seoUrl: fallbackUrl,
                        seoTitle: dia.aciklama,
                        seoDescription: this.generateSeoDescription(dia),
                        seoKeywords: this.generateWebTags(dia),
                        webOrder: 0,
                        webVisible: true,
                        delivery: delivery,
                        customDescription: null,
                        shortDescription: null,
                        webTags: null,
                        webCategory: null,
                        webSubCategory: null,
                        customImages: [],
                        featuredImage: null,
                        webPrice: null,
                        originalPrice: null,
                        webDiscount: 0,
                        discountType: 'percentage',
                        minOrderQuantity: 1,
                        maxOrderQuantity: null,
                        stockAlert: 5,
                        isNew: false,
                        isBestSeller: false,
                        isFeatured: false
                      },
                      syncInfo: {
                        lastDiaSync: new Date(),
                        diaStatus: 'synced',
                        webStatus: 'active',
                        syncSource: 'dia_missing_sync'
                      }
                    }
                  },
                  { upsert: true }
                );
                created++;
                this.logger.warn('seoUrl çakışması düzeltildi:', { key: dia._key, fallbackUrl });
              } else {
                errors++;
                this.logger.error('Eksik ürün yazma hatası:', { key: dia._key, error: writeErr.message });
              }
            }
          } catch (err) {
            errors++;
            this.logger.error('Eksik ürün hazırlama hatası:', { key: dia._key, error: err.message });
          }
        }

        this.logger.info(`Eksik ürün batch ${Math.floor(i / 50) + 1}: ${diaProducts.length} işlendi`, { operationId });
      }

      const duration = Date.now() - startTime;

      this.logger.info('=== EKSİK ÜRÜN AKTARIMI TAMAMLANDI ===', {
        operationId,
        created,
        errors,
        totalMissing: missingKeys.length,
        duration: `${duration}ms`
      });

      return { success: true, created, errors, totalMissing: missingKeys.length, duration: `${duration}ms` };

    } catch (error) {
      this.logger.error('Eksik ürün aktarımı hatası:', { error: error.message, operationId });
      return { success: false, created: 0, error: error.message };
    }
  }
  /**
   * Senkronizasyonda güncellenmeyen ürünleri arşivle
   */
  async archiveStaleProducts(syncStartTime) {
    try {
      this.logger.info('=== WEBPRODUCTS TEMİZLEME BAŞLANGICI ===');

      // Son 7 günde güncellenmemiş ürünleri diastocks'ta pasif yap 
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const staleResult = await DiaStock.updateMany(
        {
          'syncInfo.lastSyncDate': { $lt: sevenDaysAgo },
          ozelkod11kodu: 'E'
        },
        {
          $set: { ozelkod11kodu: 'H' }
        }
      );

      if (staleResult.modifiedCount > 0) {
        this.logger.info('Eski ürünler pasif yapıldı', {
          count: staleResult.modifiedCount,
          reason: `${sevenDaysAgo.toISOString()} tarihinden önce sync edilmemiş`
        });
      }

      const activeEKeys = await DiaStock.distinct('_key', { durum: 'A', ozelkod11kodu: 'E' });
      // XML ürünlerini silme listesinden çıkar
      const xmlKeys = await WebProduct.distinct('_key', { 'syncInfo.syncSource': 'xml_integration' });
      const xmlKeySet = new Set(xmlKeys);

      this.logger.info(`diastocks'tan ${activeEKeys.length} aktif E ürün key'i alındı`);

      const activeKeySet = new Set(activeEKeys);
      const webProductKeys = await WebProduct.distinct('_key');
      const keysToDelete = webProductKeys.filter(key => !activeKeySet.has(key) && !xmlKeySet.has(key));

      let deletedCount = 0;
      if (keysToDelete.length > 0) {
        const deleteResult = await WebProduct.deleteMany({
          _key: { $in: keysToDelete }
        });
        deletedCount = deleteResult.deletedCount;

        this.logger.info('=== DIA\'DA E OLMAYAN ÜRÜNLER SİLİNDİ ===', {
          deletedCount: deletedCount,
          reason: 'diastocks collection\'da durum=A ve ozelkod11kodu=E olarak bulunmuyor'
        });
      }

      this.logger.info('=== TEMİZLEME TAMAMLANDI ===', {
        totalDeleted: deletedCount,
        activeEInDiaStocks: activeEKeys.length,
        webProductsBefore: webProductKeys.length,
        webProductsAfter: webProductKeys.length - deletedCount
      });

      return deletedCount;

    } catch (error) {
      this.logger.error('WebProducts temizleme hatası:', { error: error.message });
      return 0;
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
  /* * Sadece Ürün İsmi Güncelle * */
  async syncOnlyNames() {
    const operationId = `sync_names_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.info(`=== SADECE ÜRÜN İSİMLERİ SYNC BAŞLANGICI ===`, { operationId });

      let totalProcessed = 0;
      let totalUpdated = 0;
      let webUpdated = 0;
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
          // 1. DiaStock güncelle
          const diaUpdated = await this.updateOnlyProductNames(product);
          if (diaUpdated) totalUpdated++;

          // 2. WebProduct güncelle
          const webUpdateResult = await this.updateOnlyWebProductNames(product);
          if (webUpdateResult) webUpdated++;

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
        webUpdated: webUpdated,
        message: `${totalUpdated} DiaStock + ${webUpdated} WebProduct ismi güncellendi`
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
  async updateOnlyWebProductNames(product) {
    if (!product._key) return false;

    const filter = { _key: product._key };
    const updateData = {
      'diaData.aciklama': product.aciklama || '',
      'syncInfo.lastDiaSync': new Date(),
      'syncInfo.diaStatus': 'synced'
    };

    try {
      const result = await WebProduct.updateOne(filter, { $set: updateData }, { upsert: false });
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`WebProduct isim güncelleme hatası: ${product._key}`, { error: error.message });
      return false;
    }
  }
  /* * Sadece Stok Kodu Güncelle * */
  async syncOnlyCodes() {
    const operationId = `sync_codes_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.info(`=== SADECE STOK KODLARI SYNC BAŞLANGICI ===`, { operationId });

      let totalProcessed = 0;
      let totalUpdated = 0;
      let webUpdated = 0;
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
          // 1. DiaStock güncelle
          const diaUpdated = await this.updateOnlyProductCodes(product);
          if (diaUpdated) totalUpdated++;

          // 2. WebProduct güncelle
          const webUpdateResult = await this.updateOnlyWebProductCodes(product);
          if (webUpdateResult) webUpdated++;

          totalProcessed++;
        }

        offset += 500;
        await this.sleep(100);

        this.logger.info(`Codes Batch ${batchCount} tamamlandı`, {
          operationId,
          processed: totalProcessed,
          updated: totalUpdated,
          webUpdated: webUpdated
        });
      }

      const duration = Date.now() - startTime;
      return {
        success: true,
        processed: totalProcessed,
        updated: totalUpdated,
        webUpdated: webUpdated,
        type: 'codes_only',
        duration: `${duration}ms`,
        message: `${totalUpdated} DiaStock + ${webUpdated} WebProduct stok kodu güncellendi`
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
  async updateOnlyWebProductCodes(product) {
    if (!product._key) return false;

    const filter = { _key: product._key };
    const updateData = {
      'diaData.stokkartkodu': product.stokkartkodu,
      'syncInfo.lastDiaSync': new Date(),
      'syncInfo.diaStatus': 'synced'
    };

    try {
      const result = await WebProduct.updateOne(filter, { $set: updateData }, { upsert: false });
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`WebProduct stok kod güncelleme hatası: ${product._key}`, { error: error.message });
      return false;
    }
  }

  /* * Sadece Fiyat Güncelle * */
  async syncOnlyPrices() {
    const operationId = `sync_prices_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.info('=== FİYAT SYNC BAŞLANGICI (Hash Bazlı) ===', { operationId });

      let totalProcessed = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let offset = 0;
      let hasMore = true;
      let batchCount = 0;

      while (hasMore) {
        batchCount++;

        const batchData = await this.fetchStockFromDia({
          limit: 1000,
          offset: offset,
          filters: getFiltersForSyncType('prices')
        });

        if (!batchData || batchData.length === 0) {
          hasMore = false;
          break;
        }

        // Mevcut fiyat hash'lerini toplu çek
        const keys = batchData.map(item => item._key).filter(k => k);
        const existingDocs = await DiaStock.find(
          { _key: { $in: keys } },
          { _key: 1, priceHash: 1 }
        ).lean();
        const hashMap = {};
        existingDocs.forEach(d => { hashMap[d._key] = d.priceHash; });

        const diaOps = [];
        const webOps = [];

        for (const product of batchData) {
          if (!product._key) continue;

          const newPriceHash = this.generatePriceHash(product);
          if (hashMap[product._key] && hashMap[product._key] === newPriceHash) {
            totalSkipped++;
            continue;
          }

          // fiyat4 öncelik: __dinamik__16 (HEPSİBURADA) → yoksa orijinal fiyat4
          let finalFiyat4 = null;
          if (product.__dinamik__16 !== undefined && product.__dinamik__16 !== null && product.__dinamik__16 !== '') {
            const dinamikFiyat = parseFloat(product.__dinamik__16);
            if (!isNaN(dinamikFiyat) && dinamikFiyat > 0) {
              finalFiyat4 = dinamikFiyat;
            }
          }
          if (finalFiyat4 === null && product.fiyat4 !== undefined && product.fiyat4 !== null && product.fiyat4 !== '') {
            const orijinalFiyat = parseFloat(product.fiyat4);
            if (!isNaN(orijinalFiyat) && orijinalFiyat > 0) {
              finalFiyat4 = orijinalFiyat;
            }
          }

          // DiaStock bulk op
          diaOps.push({
            updateOne: {
              filter: { _key: product._key },
              update: {
                $set: {
                  fiyat1: parseFloat(product.fiyat1) || 0,
                  fiyat2: parseFloat(product.fiyat2) || 0,
                  fiyat3: parseFloat(product.fiyat3) || 0,
                  fiyat4: finalFiyat4,
                  fiyat10: parseFloat(product.fiyat10) || 0,
                  sontuketicifiyati: parseFloat(product.sontuketicifiyati) || 0,
                  kdvalis: parseFloat(product.kdvalis) || 0,
                  kdvsatis: parseFloat(product.kdvsatis) || 0,
                  priceHash: newPriceHash,
                  'syncInfo.lastSyncDate': new Date(),
                  'syncInfo.syncStatus': 'synced',
                  'syncInfo.syncType': 'prices_only'
                }
              }
            }
          });

          // WebProduct bulk op
          webOps.push({
            updateOne: {
              filter: { _key: product._key },
              update: {
                $set: {
                  'diaData.m_birimler.0.fiyat1': parseFloat(product.fiyat1) || 0,
                  'diaData.m_birimler.0.fiyat2': parseFloat(product.fiyat2) || 0,
                  'diaData.m_birimler.0.fiyat3': parseFloat(product.fiyat3) || 0,
                  'diaData.m_birimler.0.fiyat4': finalFiyat4,
                  'diaData.m_birimler.0.fiyat10': parseFloat(product.fiyat10) || 0,
                  'syncInfo.lastDiaSync': new Date(),
                  'syncInfo.diaStatus': 'synced'
                }
              }
            }
          });
        }

        if (diaOps.length > 0) {
          await DiaStock.bulkWrite(diaOps, { ordered: false });
        }
        if (webOps.length > 0) {
          await WebProduct.bulkWrite(webOps, { ordered: false });
        }

        totalUpdated += diaOps.length;
        totalProcessed += batchData.length;
        offset += 1000;

        this.logger.info(`Prices Batch ${batchCount}: ${diaOps.length} güncellendi, ${batchData.length - diaOps.length} atlandı`, { operationId });

        await this.sleep(100);
      }

      const duration = Date.now() - startTime;
      this.logger.info('=== FİYAT SYNC TAMAMLANDI ===', { operationId, totalProcessed, totalUpdated, totalSkipped, duration: `${duration}ms` });

      return { success: true, processed: totalProcessed, updated: totalUpdated, skipped: totalSkipped, duration: `${duration}ms` };

    } catch (error) {
      this.logger.error('Fiyat sync hatası:', { error: error.message, operationId });
      throw error;
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
      let webUpdated = 0;
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
          // 1. DiaStock güncelle
          const diaUpdated = await this.updateOnlyProductImages(product);
          if (diaUpdated) totalUpdated++;

          // 2. WebProduct güncelle
          const webUpdateResult = await this.updateOnlyWebProductImages(product);
          if (webUpdateResult) webUpdated++;

          totalProcessed++;
        }

        offset += 500;
        await this.sleep(100);

        this.logger.info(`Images Batch ${batchCount} tamamlandı`, {
          operationId,
          processed: totalProcessed,
          updated: totalUpdated,
          webUpdated: webUpdated
        });
      }

      const duration = Date.now() - startTime;
      return {
        success: true,
        processed: totalProcessed,
        updated: totalUpdated,
        webUpdated: webUpdated,
        type: 'images_only',
        duration: `${duration}ms`,
        message: `${totalUpdated} DiaStock + ${webUpdated} WebProduct görseli güncellendi`
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
  async updateOnlyWebProductImages(product) {
    if (!product._key) return false;

    const filter = { _key: product._key };

    const updateData = {
      'diaData.m_resimler': product.m_resimler || [],
      'syncInfo.lastDiaSync': new Date(),
      'syncInfo.diaStatus': 'synced'
    };

    try {
      const result = await WebProduct.updateOne(filter, { $set: updateData }, { upsert: false });
      return result.modifiedCount > 0;
    } catch (error) {
      this.logger.error(`WebProduct görsel güncelleme hatası: ${product._key}`, { error: error.message });
      return false;
    }
  }
  /* * Sadece Stok Güncelle * */
  async syncOnlyStocks() {
    const operationId = `sync_stocks_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.info('=== STOK SYNC BAŞLANGICI (Hash Bazlı) ===', { operationId });

      let totalProcessed = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let offset = 0;
      let hasMore = true;
      let batchCount = 0;

      while (hasMore) {
        batchCount++;

        const batchData = await this.fetchStockFromDia({
          limit: 1000,
          offset: offset,
          filters: getFiltersForSyncType('stocks')
        });

        if (!batchData || batchData.length === 0) {
          hasMore = false;
          break;
        }

        // Mevcut stok hash'lerini toplu çek
        const keys = batchData.map(item => item._key).filter(k => k);
        const existingDocs = await DiaStock.find(
          { _key: { $in: keys } },
          { _key: 1, stockHash: 1 }
        ).lean();
        const hashMap = {};
        existingDocs.forEach(d => { hashMap[d._key] = d.stockHash; });

        const diaOps = [];
        const webOps = [];

        for (const product of batchData) {
          if (!product._key) continue;

          const newStockHash = this.generateStockHash(product);
          if (hashMap[product._key] && hashMap[product._key] === newStockHash) {
            totalSkipped++;
            continue;
          }

          const stokMiktari = parseFloat(product.gercek_stok) || parseFloat(product.fiili_stok) || 0;

          // DiaStock bulk op
          diaOps.push({
            updateOne: {
              filter: { _key: product._key },
              update: {
                $set: {
                  fiili_stok: stokMiktari,
                  gercek_stok: stokMiktari,
                  stockHash: newStockHash,
                  'syncInfo.lastSyncDate': new Date(),
                  'syncInfo.syncStatus': 'synced',
                  'syncInfo.syncType': 'stocks_only'
                }
              }
            }
          });

          // WebProduct bulk op
          webOps.push({
            updateOne: {
              filter: { _key: product._key },
              update: {
                $set: {
                  'diaData.gercek_stok': stokMiktari,
                  'syncInfo.lastDiaSync': new Date(),
                  'syncInfo.diaStatus': 'synced'
                }
              }
            }
          });
        }

        if (diaOps.length > 0) {
          await DiaStock.bulkWrite(diaOps, { ordered: false });
        }
        if (webOps.length > 0) {
          await WebProduct.bulkWrite(webOps, { ordered: false });
        }

        totalUpdated += diaOps.length;
        totalProcessed += batchData.length;
        offset += 1000;

        this.logger.info(`Stocks Batch ${batchCount}: ${diaOps.length} güncellendi, ${batchData.length - diaOps.length} atlandı`, { operationId });

        await this.sleep(100);
      }

      const duration = Date.now() - startTime;
      this.logger.info('=== STOK SYNC TAMAMLANDI ===', { operationId, totalProcessed, totalUpdated, totalSkipped, duration: `${duration}ms` });

      return { success: true, processed: totalProcessed, updated: totalUpdated, skipped: totalSkipped, duration: `${duration}ms` };

    } catch (error) {
      this.logger.error('Stok sync hatası:', { error: error.message, operationId });
      throw error;
    }
  }
  async syncOnlyOzelkodlar() {
    const operationId = `sync_ozelkodlar_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.info('=== ÖZELKOD SYNC BAŞLANGICI (DIASTOCKS) ===', { operationId });

      const batchSize = 500;
      let offset = 0;
      let totalProcessed = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let hasMore = true;
      let batchCount = 0;

      while (hasMore) {
        batchCount++;

        const batchData = await DiaStock.find(
          { durum: 'A', ozelkod11kodu: 'E' },
          {
            _key: 1, marka: 1, markaack: 1, anabarkod: 1,
            ozelkod1: 1, ozelkod1kodu: 1, ozelkod2: 1, ozelkod2kodu: 1,
            ozelkod3: 1, ozelkod3kodu: 1, ozelkod4: 1, ozelkod4kodu: 1,
            ozelkod5: 1, ozelkod5kodu: 1, ozelkod6: 1, ozelkod6kodu: 1,
            ozelkod7: 1, ozelkod7kodu: 1, ozelkod8: 1, ozelkod8kodu: 1,
            ozelkod9: 1, ozelkod9kodu: 1, ozelkod10: 1, ozelkod10kodu: 1,
            ozelkod11: 1, ozelkod11kodu: 1, m_urunOzellikleri: 1, ozelkodHash: 1
          }
        ).skip(offset).limit(batchSize).lean();

        if (!batchData || batchData.length === 0) {
          hasMore = false;
          break;
        }

        const webOps = [];

        for (const product of batchData) {
          if (!product._key) continue;

          const newHash = this.generateOzelkodHash(product);
          if (product.ozelkodHash && product.ozelkodHash === newHash) {
            totalSkipped++;
            continue;
          }

          webOps.push({
            updateOne: {
              filter: { _key: product._key },
              update: {
                $set: {
                  'diaData.marka': product.marka || '',
                  'diaData.anabarkod': product.anabarkod || '',
                  'diaData.ozelkod1': product.ozelkod1 || '',
                  'diaData.ozelkod1kodu': product.ozelkod1kodu || '',
                  'diaData.ozelkod2': product.ozelkod2 || '',
                  'diaData.ozelkod2kodu': product.ozelkod2kodu || '',
                  'diaData.ozelkod3': product.ozelkod3 || '',
                  'diaData.ozelkod3kodu': product.ozelkod3kodu || '',
                  'diaData.ozelkod4': product.ozelkod4 || '',
                  'diaData.ozelkod4kodu': product.ozelkod4kodu || '',
                  'diaData.ozelkod5': product.ozelkod5 || '',
                  'diaData.ozelkod5kodu': product.ozelkod5kodu || '',
                  'diaData.ozelkod6': product.ozelkod6 || '',
                  'diaData.ozelkod6kodu': product.ozelkod6kodu || '',
                  'diaData.ozelkod7': product.ozelkod7 || '',
                  'diaData.ozelkod7kodu': product.ozelkod7kodu || '',
                  'diaData.ozelkod8': product.ozelkod8 || '',
                  'diaData.ozelkod8kodu': product.ozelkod8kodu || '',
                  'diaData.ozelkod9': product.ozelkod9 || '',
                  'diaData.ozelkod9kodu': product.ozelkod9kodu || '',
                  'diaData.ozelkod10': product.ozelkod10 || '',
                  'diaData.ozelkod10kodu': product.ozelkod10kodu || '',
                  'diaData.ozelkod11': product.ozelkod11 || '',
                  'diaData.ozelkod11kodu': product.ozelkod11kodu || '',
                  'diaData.m_urunOzellikleri': product.m_urunOzellikleri || [],
                  'syncInfo.lastDiaSync': new Date(),
                  'syncInfo.diaStatus': 'synced'
                }
              }
            }
          });
        }

        if (webOps.length > 0) {
          await WebProduct.bulkWrite(webOps, { ordered: false });
        }

        totalUpdated += webOps.length;
        totalProcessed += batchData.length;
        offset += batchSize;

        this.logger.info(`Ozelkod Batch ${batchCount}: ${webOps.length} güncellendi, ${totalSkipped} atlandı`, { operationId });

        await this.sleep(100);
      }

      const duration = Date.now() - startTime;
      this.logger.info('=== ÖZELKOD SYNC TAMAMLANDI ===', {
        operationId, totalProcessed, totalUpdated, totalSkipped,
        duration: `${duration}ms`
      });

      return {
        success: true,
        processed: totalProcessed,
        updated: totalUpdated,
        skipped: totalSkipped,
        duration: `${duration}ms`
      };

    } catch (error) {
      this.logger.error('Özelkod sync hatası:', { error: error.message, operationId });
      throw error;
    }
  }
  async syncImagesToWebProducts() {
    const operationId = `sync_images_web_${Date.now()}`;
    const startTime = Date.now();

    try {
      this.logger.info('=== DIASTOCKS → WEBPRODUCTS GÖRSEL SYNC BAŞLANGICI ===', { operationId });

      const batchSize = 500;
      let offset = 0;
      let totalUpdated = 0;
      let hasMore = true;
      let batchCount = 0;

      while (hasMore) {
        batchCount++;

        const diaStocks = await DiaStock.find(
          { durum: 'A', ozelkod11kodu: 'E' },
          { _key: 1, m_resimler: 1 }
        ).skip(offset).limit(batchSize).lean();

        if (!diaStocks || diaStocks.length === 0) {
          hasMore = false;
          break;
        }

        const webOps = diaStocks.map(dia => ({
          updateOne: {
            filter: { _key: dia._key },
            update: {
              $set: {
                'diaData.m_resimler': dia.m_resimler || [],
                'syncInfo.lastDiaSync': new Date()
              }
            }
          }
        }));

        if (webOps.length > 0) {
          const result = await WebProduct.bulkWrite(webOps, { ordered: false });
          totalUpdated += result.modifiedCount || 0;
        }

        offset += batchSize;

        this.logger.info(`Görsel sync batch ${batchCount}: ${totalUpdated} güncellendi`, { operationId });

        await this.sleep(100);
      }

      const duration = Date.now() - startTime;
      this.logger.info('=== GÖRSEL SYNC TAMAMLANDI ===', { operationId, totalUpdated, duration: `${duration}ms` });

      return { success: true, updated: totalUpdated, duration: `${duration}ms` };

    } catch (error) {
      this.logger.error('Görsel sync hatası:', { error: error.message, operationId });
      throw error;
    }
  }
}

module.exports = DiaStockService;