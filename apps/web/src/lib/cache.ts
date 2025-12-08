/**
 * Frontend Cache Sistemi
 * React Query benzeri basit cache mekanizması
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  staleTime?: number; // Stale time in milliseconds (default: 1 minute)
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 dakika
  private readonly DEFAULT_STALE_TIME = 1 * 60 * 1000; // 1 dakika

  constructor() {
    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Cache'den veri al
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Expired kontrolü
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Cache'e veri ekle
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.DEFAULT_TTL;
    const now = Date.now();

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl
    };

    this.cache.set(key, entry);
  }

  /**
   * Veri stale mi kontrol et
   */
  isStale(key: string, staleTime?: number): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return true;
    }

    const staleThreshold = staleTime || this.DEFAULT_STALE_TIME;
    return Date.now() - entry.timestamp > staleThreshold;
  }

  /**
   * Cache'den veri sil
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Pattern'e göre cache'leri sil
   */
  deletePattern(pattern: string): number {
    let deletedCount = 0;
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Tüm cache'i temizle
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Expired entry'leri temizle
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 [CACHE] ${cleanedCount} expired entry cleaned up`);
    }
  }

  /**
   * Cache istatistikleri
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    let staleEntries = 0;

    for (const entry of this.cache.values()) {
      if (now > entry.expiresAt) {
        expiredEntries++;
      } else if (now - entry.timestamp > this.DEFAULT_STALE_TIME) {
        staleEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      stale: staleEntries,
      expired: expiredEntries
    };
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

/**
 * Cache key generator utility
 */
export const cacheKeys = {
  // Araç bilgileri cache keys
  vehicleInfo: (marka: string, model: string, yil: string, modifikasyon?: string) => 
    `vehicle:${marka}:${model}:${yil}:${modifikasyon || 'default'}`,
  
  // Lastik arama cache keys
  tireSearch: (genislik: number, yanak: number, cap: number, mevsim: string, page: number) =>
    `tires:${genislik}x${yanak}R${cap}:${mevsim}:page${page}`,
  
  // Dia stok cache keys
  diaStock: (wheelsizeProductIds: string[]) =>
    `dia:stock:${wheelsizeProductIds.sort().join(',')}`,
  
  // Jant arama cache keys
  jantSearch: (genislik: string, yanak: string, cap: string, mevsim: string, page: number) =>
    `jant:${genislik}x${yanak}R${cap}:${mevsim}:page${page}`,
  
  // Marka listesi cache key
  brands: () => 'brands:list',
  
  // Model listesi cache key
  models: (marka: string) => `models:${marka}`,
  
  // Yıl listesi cache key
  years: (marka: string, model: string) => `years:${marka}:${model}`,
  
  // Kategori lastikleri cache key
  kategoriLastikleri: (kategori: string, filters?: { marka?: string; ebat?: string; teknoloji?: string; desen?: string }) => {
    const filterStr = filters ? Object.entries(filters)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}:${value}`)
      .join(':') : 'all';
    return `kategori:${kategori}:${filterStr}`;
  }
};

/**
 * Cache'li API çağrısı wrapper'ı
 */
export async function cachedApiCall<T>(
  cacheKey: string,
  apiCall: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Cache'den kontrol et
  const cached = cacheManager.get<T>(cacheKey);
  
  if (cached && !cacheManager.isStale(cacheKey, options.staleTime)) {
    console.log(`💾 [CACHE HIT] ${cacheKey}`);
    return cached;
  }

  // Cache miss veya stale - API'ye git
  console.log(`🌐 [CACHE MISS] ${cacheKey}`);
  
  try {
    const data = await apiCall();
    
    // Başarılı sonucu cache'le
    cacheManager.set(cacheKey, data, options);
    
    return data;
  } catch (error) {
    // Hata durumunda stale data varsa onu döndür
    if (cached) {
      console.log(`⚠️ [CACHE STALE FALLBACK] ${cacheKey}`);
      return cached;
    }
    
    throw error;
  }
}

/**
 * Cache'li hook benzeri kullanım
 */
export function useCachedData<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        
        const result = await cachedApiCall(cacheKey, fetcher, options);
        
        if (!isCancelled) {
          setData(result);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err as Error);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [cacheKey]);

  return { data, loading, error };
}

// React import for hook
import React from 'react';