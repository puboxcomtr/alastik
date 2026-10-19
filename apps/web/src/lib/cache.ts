
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number;
  staleTime?: number;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000;
  private readonly DEFAULT_STALE_TIME = 1 * 60 * 1000;

  constructor() {
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

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

  isStale(key: string, staleTime?: number): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return true;
    }

    const staleThreshold = staleTime || this.DEFAULT_STALE_TIME;
    return Date.now() - entry.timestamp > staleThreshold;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

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

  clear(): void {
    this.cache.clear();
  }

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

export const cacheManager = new CacheManager();

export const cacheKeys = {
  vehicleInfo: (marka: string, model: string, yil: string, modifikasyon?: string) => 
    `vehicle:${marka}:${model}:${yil}:${modifikasyon || 'default'}`,
  
  tireSearch: (genislik: number, yanak: number, cap: number, mevsim: string, page: number) =>
    `tires:${genislik}x${yanak}R${cap}:${mevsim}:page${page}`,
  
  diaStock: (wheelsizeProductIds: string[]) =>
    `dia:stock:${wheelsizeProductIds.sort().join(',')}`,
  
  jantSearch: (genislik: string, yanak: string, cap: string, mevsim: string, page: number) =>
    `jant:${genislik}x${yanak}R${cap}:${mevsim}:page${page}`,
  
  brands: () => 'brands:list',
  
  models: (marka: string) => `models:${marka}`,
  
  years: (marka: string, model: string) => `years:${marka}:${model}`,
  
  kategoriLastikleri: (kategori: string, filters?: { marka?: string; ebat?: string; teknoloji?: string; desen?: string }) => {
    const filterStr = filters ? Object.entries(filters)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}:${value}`)
      .join(':') : 'all';
    return `kategori:${kategori}:${filterStr}`;
  }
};

export async function cachedApiCall<T>(
  cacheKey: string,
  apiCall: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const cached = cacheManager.get<T>(cacheKey);
  
  if (cached && !cacheManager.isStale(cacheKey, options.staleTime)) {
    console.log(`💾 [CACHE HIT] ${cacheKey}`);
    return cached;
  }

  console.log(`🌐 [CACHE MISS] ${cacheKey}`);
  
  try {
    const data = await apiCall();
    
    cacheManager.set(cacheKey, data, options);
    
    return data;
  } catch (error) {
    if (cached) {
      console.log(`⚠️ [CACHE STALE FALLBACK] ${cacheKey}`);
      return cached;
    }
    
    throw error;
  }
}

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

import React from 'react';