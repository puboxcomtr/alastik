/* eslint-disable @typescript-eslint/no-explicit-any */
// Backend API Service
// Bu servis kendi backend API'miz ile iletişim kurar

import { logger } from './logger';
import { cachedApiCall, cacheKeys } from './cache';

// Backend API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';

// API Response Tipleri
export interface BackendApiResponse<T> {
  basarili: boolean;
  veri?: T;
  toplamKayit?: number;
  mesaj?: string;
  hata?: string;
}

// Helper function for API calls
async function apiCall<T>(endpoint: string, params?: Record<string, any>, method: 'GET' | 'POST' = 'GET'): Promise<BackendApiResponse<T>> {
  const startTime = Date.now();
  
  try {
    let url = `${API_BASE_URL}${endpoint}`;
    let body: string | undefined;
    
    if (method === 'GET') {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              value.forEach(v => searchParams.append(`${key}[]`, String(v)));
            } else {
              searchParams.append(key, String(value));
            }
          }
        });
      }
      const queryString = searchParams.toString();
      url = `${url}${queryString ? `?${queryString}` : ''}`;
    } else {
      body = JSON.stringify(params || {});
    }
    
    // Logger ile request'i logla
    const requestId = logger.logRequest(endpoint, params, method);
    
    console.log('🚀 [FRONTEND API REQUEST]', {
      requestId,
      endpoint,
      url,
      method,
      params,
      timestamp: new Date().toISOString()
    });
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      // Timeout ekle
      signal: AbortSignal.timeout(15000) // 15 saniye timeout
    });

    const data = await response.json();
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      const errorMessage = data.mesaj || data.hata || `HTTP ${response.status}: ${response.statusText}`;
      
      // Logger ile error'ı logla
      logger.logApiError(requestId, errorMessage, duration, response.status);
      
      console.error('❌ [FRONTEND API ERROR]', {
        requestId,
        endpoint,
        duration: `${duration}ms`,
        status: response.status,
        error: errorMessage,
        data,
        timestamp: new Date().toISOString()
      });
      throw new Error(errorMessage);
    }

    // Logger ile response'u logla
    logger.logResponse(requestId, data, duration, response.status);

    console.log('✅ [FRONTEND API SUCCESS]', {
      requestId,
      endpoint,
      duration: `${duration}ms`,
      status: response.status,
      success: data.basarili,
      dataLength: data.veri ? (Array.isArray(data.veri) ? data.veri.length : 'object') : 0,
      totalRecords: data.toplamKayit,
      sampleData: data.veri ? (Array.isArray(data.veri) ? data.veri.slice(0, 2) : data.veri) : null,
      timestamp: new Date().toISOString()
    });

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    let errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    
    // Network hatası kontrolü
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      errorMessage = 'Backend sunucusuna bağlanılamıyor. Lütfen sunucunun çalıştığından emin olun.';
    } else if (error instanceof Error && error.name === 'AbortError') {
      errorMessage = 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.';
    }
    
    // Logger ile exception'ı logla
    logger.logApiError('unknown', errorMessage, duration);
    
    console.error('💥 [FRONTEND API EXCEPTION]', {
      endpoint,
      duration: `${duration}ms`,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return {
      basarili: false,
      hata: errorMessage,
      mesaj: 'İşlem sırasında bir hata oluştu'
    };
  }
}

// Araç API'leri
export const backendAracApi = {
  // Tüm markaları getir
  markalar: async (params?: {
    bolgeler?: string[];
  }) => {
    return apiCall<any[]>('/arac/markalar', params);
  },

  // Belirli markaya ait modelleri getir
  modeller: async (marka: string, params?: {
    bolgeler?: string[];
  }) => {
    return apiCall<any[]>('/arac/modeller', { marka, ...params });
  },

  // Üretim yıllarını getir
  yillar: async (marka: string, model: string) => {
    return apiCall<any[]>('/arac/yillar', { marka, model });
  },

  // Araç modifikasyonlarını getir
  modifikasyonlar: async (marka: string, model: string, yil: number) => {
    return apiCall<any[]>('/arac/modifikasyonlar', { marka, model, yil });
  },

  // Model bazlı lastik/jant araması (Cache'li)
  modelArama: async (params: {
    marka: string;
    model: string;
    yil: number;
    modifikasyon?: string;
    bolge?: string;
  }) => {
    const cacheKey = cacheKeys.vehicleInfo(
      params.marka, 
      params.model, 
      params.yil.toString(), 
      params.modifikasyon
    );
    
    return cachedApiCall(cacheKey, () => apiCall<any>('/arac/model-arama', params), {
      ttl: 15 * 60 * 1000, // 15 dakika (araç bilgileri çok değişmez)
      staleTime: 5 * 60 * 1000 // 5 dakika
    });
  }
};

// Lastik API'leri
export const backendLastikApi = {
  // Lastik ölçülerine göre araç ara
  arama: async (params: {
    kesitGenisligi: number;
    yanakOrani: number;
    jantCapi: number;
  }) => {
    return apiCall<any[]>('/lastik/arama', params);
  },
  
  // Ebata göre lastik ara (veritabanından) - Cache'li
  ebatArama: async (params: {
    genislik: number;
    yanak: number;
    cap: number;
    mevsim?: string;
    marka?: string;
    minFiyat?: number;
    maxFiyat?: number;
    page?: number;
    limit?: number;
  }) => {
    const cacheKey = cacheKeys.tireSearch(
      params.genislik,
      params.yanak, 
      params.cap,
      params.mevsim || 'tum',
      params.page || 1
    );
    
    return cachedApiCall(cacheKey, () => apiCall<any>('/lastik/ebat-arama', params), {
      ttl: 3 * 60 * 1000, // 3 dakika (lastik fiyatları değişebilir)
      staleTime: 1 * 60 * 1000 // 1 dakika
    });
  },

  // Wheelsize ürünleri ile Dia stok karşılaştırması - Cache'li
  diaStokKontrol: async (wheelsizeProducts: any[]) => {
    const productIds = wheelsizeProducts.map(p => p._id || p.id).filter(Boolean);
    const cacheKey = cacheKeys.diaStock(productIds);
    
    return cachedApiCall(cacheKey, () => apiCall<any>('/lastik/dia-stok-kontrol', { wheelsizeProducts }, 'POST'), {
      ttl: 5 * 60 * 1000, // 5 dakika (stok bilgileri orta sıklıkta değişir)
      staleTime: 2 * 60 * 1000 // 2 dakika
    });
  },

  // Navbar kategorilerine göre lastik filtreleme - Cache'li
  kategoriLastikleri: async (kategori: string, filters?: { 
    marka?: string; 
    ebat?: string; 
    teknoloji?: string; 
    desen?: string; 
  }) => {
    const params = new URLSearchParams();
    if (filters?.marka) params.append('marka', filters.marka);
    if (filters?.ebat) params.append('ebat', filters.ebat);
    if (filters?.teknoloji) params.append('teknoloji', filters.teknoloji);
    if (filters?.desen) params.append('desen', filters.desen);
    
    const cacheKey = cacheKeys.kategoriLastikleri(kategori, filters);
    return cachedApiCall(cacheKey, () => apiCall<any>(`/lastik/kategori/${kategori}?${params.toString()}`), {
      ttl: 10 * 60 * 1000, // 10 dakika
      staleTime: 5 * 60 * 1000 // 5 dakika
    });
  }
};

// Jant API'leri
export const backendJantApi = {
  // Jant genişliklerini getir
  genislikler: async (params?: any) => {
    return apiCall<any[]>('/jant/genislikler', params);
  },

  // Vida şablonlarını getir
  vidaSablonlari: async (params?: any) => {
    return apiCall<any[]>('/jant/vida-sablonlari', params);
  },

  // Jant araması
  arama: async (params: any) => {
    return apiCall<any[]>('/jant/arama', params);
  }
};

// Ana export
export const backendApi = {
  arac: backendAracApi,
  lastik: backendLastikApi,
  jant: backendJantApi
}; 