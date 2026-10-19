/* eslint-disable @typescript-eslint/no-explicit-any */

import { API_ENDPOINTS, getBaseUrl } from '@/src/config/api';

const getApiBaseUrl = getBaseUrl;

export interface ApiResponse<T> {
  basarili: boolean;
  veri?: T;
  toplamKayit?: number;
  mesaj?: string;
  hata?: string;
}

export interface Marka {
  slug: string;
  name: string;
  nameEn: string;
  regions?: string[];
  logo?: string;
}

export interface Model {
  slug: string;
  name: string;
  name_en?: string;
  regions?: string[];
  year_ranges?: string[];
  make?: any;
}

export interface LastikOlcu {
  kesitGenisligi: number;
  yanakOrani: number;
  jantCapi: number;
}

export interface JantOlcu {
  cap: number;
  genislik: number;
  offset?: number;
  merkezDelik?: number;
  vidaSablon?: string;
}

export interface Jenerasyon {
  slug: string;
  name: string;
  platform?: string;
  start?: number;
  end?: number;
  bodies?: any[];
  regions?: string[];
  years?: number[];
  year_ranges?: string[];
}

export interface Yil {
  slug: number;
  name: number;
}

export interface DegerTipi {
  value: number;
  total: number;
  params?: any;
  tire_list?: any;
}

export interface Modifikasyon {
  id: string;
  slug: string;
  name: string;
  title?: string;
  nameEn?: string;
}

export interface AramaSonucu {
  marka: string;
  model: string;
  yil?: number;
  modifikasyon?: string;
  lastikler?: LastikOlcu[];
  jantlar?: JantOlcu[];
}

export interface GenelApiYanit {
  id?: string;
  slug?: string;
  name?: string;
  title?: string;
  nameEn?: string;
  value?: number;
  total?: number;
  [key: string]: unknown;
}

async function apiCall<T>(endpoint: string, params?: Record<string, string | number | string[] | boolean | undefined>): Promise<ApiResponse<T>> {
  try {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, String(v)));
          } else {
            searchParams.append(key, String(value));
          }
        }
      });
    }
    const queryString = searchParams.toString();
    const url = `${getApiBaseUrl()}${endpoint}${queryString ? `?${queryString}` : ''}`;

    console.log('🌐 [WHEEL-SIZE-API] İstek gönderiliyor:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [WHEEL-SIZE-API] HTTP Hatası:', response.status, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText || 'API hatası'}`);
    }

    const data = await response.json();
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ [WHEEL-SIZE-API] Yanıt alındı:', typeof data, data.length || Object.keys(data).length, 'kayıt');
    }

    return data;
  } catch (error) {
    console.error('❌ [WHEEL-SIZE-API] API Call Error:', error);

    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return {
        basarili: false,
        hata: 'Backend sunucusuna bağlanılamıyor. Lütfen sunucunun çalıştığından emin olun.',
        mesaj: 'Bağlantı hatası'
      };
    }

    return {
      basarili: false,
      hata: error instanceof Error ? error.message : 'Bilinmeyen hata',
      mesaj: 'İşlem sırasında bir hata oluştu'
    };
  }
}

export const aracApi = {
  markalar: async (params?: {
    yil?: number;
    bolgeler?: string[];
    siralama?: string;
    dil?: string;
    markalar?: string;
    haricMarkalar?: string;
  }) => {
    return apiCall<Marka[]>('/arac/markalar', params);
  },

  modeller: async (marka: string, params?: {
    yil?: number;
    bolgeler?: string[];
  }) => {
    return apiCall<Model[]>('/arac/modeller', { marka, ...params });
  },

  yillar: async (marka: string, model?: string) => {
    return apiCall<Yil[]>('/arac/yillar', { marka, model });
  },

  jenerasyonlar: async (marka: string, model: string, yil?: number) => {
    return apiCall<Jenerasyon[]>('/arac/jenerasyonlar', { marka, model, yil });
  },

  modifikasyonlar: async (marka: string, model: string, yil?: number, jenerasyon?: string) => {
    return apiCall<Modifikasyon[]>('/arac/modifikasyonlar', { marka, model, yil, jenerasyon });
  },

  modelArama: async (params: {
    marka: string;
    model: string;
    yil?: number;
    jenerasyon?: string;
    modifikasyon?: string;
    bolge?: string;
  }) => {
    return apiCall<AramaSonucu>('/arac/model-arama', params);
  },

  bolgeler: async () => {
    return apiCall<string[]>('/arac/bolgeler');
  }
};

export const jantApi = {
  caplar: async (params?: {
    vidasSablon?: string;
    bolgeler?: string[];
    siralama?: string;
  }) => {
    return apiCall<DegerTipi[]>('/jant/caplar', params);
  },

  genislikler: async (params?: {
    cap?: number;
    vidasSablon?: string;
    bolgeler?: string[];
    siralama?: string;
  }) => {
    return apiCall<DegerTipi[]>('/jant/genislikler', params);
  },

  offsetler: async (params?: {
    cap?: number;
    genislik?: number;
    vidasSablon?: string;
    bolgeler?: string[];
    siralama?: string;
  }) => {
    return apiCall<number[]>('/jant/offsetler', params);
  },

  merkezDelikler: async (params?: {
    cap?: number;
    genislik?: number;
    offset?: number;
    minOffset?: number;
    maxOffset?: number;
    vidasSablon?: string;
    bolgeler?: string[];
    siralama?: string;
  }) => {
    return apiCall<number[]>('/jant/merkez-delikler', params);
  },

  vidaSablonlari: async (params?: {
    cap?: number;
    genislik?: number;
    minOffset?: number;
    maxOffset?: number;
    minMerkezDelik?: number;
    maxMerkezDelik?: number;
    vidaSayisi?: number;
    pcd?: number;
    bolgeler?: string[];
    siralama?: string;
  }) => {
    return apiCall<string[]>('/jant/vida-sablonlari', params);
  },

  arama: async (params: {
    vidaSablon: string;
    cap?: number;
    minCap?: number;
    maxCap?: number;
    genislik?: number;
    minGenislik?: number;
    maxGenislik?: number;
    offset?: number;
    minOffset?: number;
    maxOffset?: number;
    merkezDelik?: number;
    minMerkezDelik?: number;
    maxMerkezDelik?: number;
    vidaCapi?: number;
    bolgeler?: string[];
    mod?: 'both' | 'front_only' | 'rear_only';
    configuratorEkle?: boolean;
    configurator?: boolean;
    siralama?: string;
  }) => {
    return apiCall<AramaSonucu[]>('/jant/arama', params);
  },

  modifikasyonArama: async (params: {
    marka: string;
    model: string;
    vidaSablon: string;
    cap?: number;
    minCap?: number;
    maxCap?: number;
    genislik?: number;
    minGenislik?: number;
    maxGenislik?: number;
    offsetDeger?: number;
    minOffset?: number;
    maxOffset?: number;
    merkezDelik?: number;
    minMerkezDelik?: number;
    maxMerkezDelik?: number;
    bolgeler?: string[];
    mod?: string;
    configurator?: boolean;
    siralama?: string;
    limit?: number;
    sayfaBaslangic?: number;
  }) => {
    return apiCall<any[]>('/jant/modifikasyon-arama', params);
  }
};

export const lastikApi = {
  kesitGenislikleri: async (params?: {
    bolgeler?: string[];
    siralama?: string;
  }) => {
    return apiCall<DegerTipi[]>('/lastik/kesit-genislikleri', params);
  },

  yanakOranlari: async (params?: {
    kesitGenisligi?: number;
    bolgeler?: string[];
    siralama?: string;
  }) => {
    return apiCall<DegerTipi[]>('/lastik/yanak-oranlari', params);
  },

  jantCaplari: async (params?: {
    kesitGenisligi?: number;
    yanakOrani?: number;
    bolgeler?: string[];
    siralama?: string;
  }) => {
    return apiCall<DegerTipi[]>('/lastik/jant-caplari', params);
  },

  arama: async (params: {
    kesitGenisligi: number;
    yanakOrani: number;
    jantCapi: number;
    bolgeler?: string[];
    mod?: string;
    siralama?: string;
  }) => {
    return apiCall<AramaSonucu[]>('/lastik/arama', params);
  },

  modifikasyonArama: async (params: {
    kesitGenisligi: number;
    yanakOrani: number;
    jantCapi: number;
    marka?: string;
    model?: string;
    bolgeler?: string[];
    mod?: string;
    siralama?: string;
    limit?: number;
    sayfaBaslangic?: number;
  }) => {
    return apiCall<any[]>('/lastik/modifikasyon-arama', params);
  },

  ltHf: {
    toplamCaplar: async (params?: {
      bolgeler?: string[];
      siralama?: string;
    }) => {
      return apiCall<number[]>('/lastik/lt-hf/toplam-caplar', params);
    },

    kesitGenislikleri: async (params?: {
      toplamCap?: number;
      bolgeler?: string[];
      siralama?: string;
    }) => {
      return apiCall<number[]>('/lastik/lt-hf/kesit-genislikleri', params);
    },

    jantCaplari: async (params?: {
      toplamCap?: number;
      kesitGenisligi?: number;
      bolgeler?: string[];
      siralama?: string;
    }) => {
      return apiCall<number[]>('/lastik/lt-hf/jant-caplari', params);
    },

    arama: async (params: {
      toplamCap: number;
      kesitGenisligi: number;
      jantCapi: number;
      mod?: string;
      bolgeler?: string[];
      siralama?: string;
    }) => {
      return apiCall<any[]>('/lastik/lt-hf/arama', params);
    },

    modifikasyonArama: async (params: {
      toplamCap: number;
      kesitGenisligi: number;
      jantCapi: number;
      marka: string;
      model: string;
      mod?: string;
      bolgeler?: string[];
      siralama?: string;
      limit?: number;
      sayfaBaslangic?: number;
    }) => {
      return apiCall<any[]>('/lastik/lt-hf/modifikasyon-arama', params);
    }
  }
};

export const gelismisApi = {
  jantaUygunLastikler: async (params: {
    vidasSablon: string;
    jantCapi: number;
    jantGenisligi: number;
    jantOffset: number;
    merkezDelik?: number;
    vidaCapi?: number;
    arkaBoslukMin?: number;
    arkaBoslukMax?: number;
    capTolerans?: number;
    genislikTolerans?: number;
    siralama?: string;
    limit?: number;
    sayfaBaslangic?: number;
  }) => {
    return apiCall<LastikOlcu[]>('/gelismis/janta-uygun-lastikler', params);
  },

  jantUyumluluk: async (params: {
    vidasSablon: string;
    jantCapi: number;
    jantGenisligi: number;
    jantOffset: number;
    merkezDelik?: number;
    vidaCapi?: number;
    arkaBoslukMin?: number;
    arkaBoslukMax?: number;
    capTolerans?: number;
    genislikTolerans?: number;
    siralama?: string;
    limit?: number;
    sayfaBaslangic?: number;
  }) => {
    return apiCall<any[]>('/gelismis/jant-uyumluluk', params);
  },

  lastikUyumluluk: async (params: {
    kesitGenisligi: number;
    yanakOrani: number;
    jantCapi: number;
    siralama?: string;
    limit?: number;
    sayfaBaslangic?: number;
  }) => {
    return apiCall<any[]>('/gelismis/lastik-uyumluluk', params);
  },

  paketUyumluluk: async (params: {
    vidasSablon: string;
    jantCapi: number;
    jantGenisligi: number;
    jantOffset: number;
    kesitGenisligi: number;
    yanakOrani: number;
    merkezDelik?: number;
    vidaCapi?: number;
    arkaBoslukMin?: number;
    arkaBoslukMax?: number;
    capTolerans?: number;
    genislikTolerans?: number;
    siralama?: string;
    limit?: number;
    sayfaBaslangic?: number;
  }) => {
    return apiCall<any[]>('/gelismis/paket-uyumluluk', params);
  },

  lastikJantAlternatifleri: async (params: {
    jantCapi: number;
    jantGenisligi: number;
    jantOffset: number;
    kesitGenisligi: number;
    yanakOrani: number;
    adimlar?: number;
    kesitGenislikTolerans?: number;
    toplamCapTolerans?: number;
  }) => {
    return apiCall<any>('/gelismis/lastik-jant-alternatifleri', params);
  }
};

export const wheelSizeApi = {
  arac: aracApi,
  jant: jantApi,
  lastik: lastikApi,
  gelismis: gelismisApi
};