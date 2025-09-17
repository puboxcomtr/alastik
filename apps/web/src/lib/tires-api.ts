import { backendApi } from './backend-api';

/**
 * Tires Catalog API entegrasyonu
 * Backend üzerinden lastik katalog verilerini çeker
 */

export interface TireBrand {
  slug: string;
  display: string;
  price_segment: string;
  products_count: number;
}

export interface TireProduct {
  slug: string;
  display: string;
  brand: {
    slug: string;
    display: string;
    price_segment: string;
  };
  canonical_link: string;
  season: {
    slug: string;
    display: string;
  };
  automobile_type: {
    slug: string;
    display: string;
  };
  year: number;
  discontinued: boolean;
  almost_discontinued: boolean;
  coming_soon: boolean;
  is_runflat: boolean;
  counters: {
    modes: number;
  };
  regions: Array<{
    slug: string;
    display: string;
  }>;
}

export interface TireProductDetails {
  slug: string;
  display: string;
  brand: {
    slug: string;
    display: string;
    price_segment: string;
  };
  canonical_link: string;
  season: {
    slug: string;
    display: string;
  };
  automobile_type: {
    slug: string;
    display: string;
  };
  performance_category?: {
    slug: string;
    display: string;
  };
  year: number;
  discontinued: boolean;
  almost_discontinued: boolean;
  coming_soon: boolean;
  is_runflat: boolean;
  studded: boolean;
  for_nordic_winter: boolean;
  is_oe_model: boolean;
  manufacturer_page_link?: string;
  description?: string;
  tags?: string[];
  ancestor?: {
    brand_slug: string;
    product_slug: string;
    display_name: string;
  };
  counters: {
    modes: number;
    videos?: number;
    benchmarks?: number;
  };
  regions: Array<{
    slug: string;
    display: string;
  }>;
  rating?: {
    score: number;
    popularity: number;
    tags: Array<{
      slug: string;
      display: string;
      connotation: string;
    }>;
  };
  has_bnb_reasons?: boolean;
  image?: string;
}

export interface TireBNBReason {
  type: 'buy' | 'not_buy';
  title: string;
  description: string;
  weight: number;
}

export interface TireMode {
  size: string;
  width: number;
  sidewall: number;
  diameter: number;
  load_index: string;
  speed_rating: string;
  runflat: boolean;
}

export interface TireMaterial {
  type: 'article' | 'video' | 'benchmark' | 'link' | 'test';
  title: string;
  description?: string;
  url?: string;
  link?: string;
  thumbnail?: string;
  date?: string;
  published_at?: string;
  source?: string;
  author?: string;
  rating?: number;
  views?: number;
  likes?: number;
  duration?: string;
  language?: string;
  category?: string;
  tags_list?: string[];
}

export interface TireRegion {
  slug: string;
  display: string;
}

export interface TirePerformanceCategory {
  slug: string;
  display: string;
  automobile_type: string;
}

export interface TireTest {
  slug: string;
  title: string;
  description?: string;
  year: number;
  season: string;
  automobile_type: string;
  organization?: string;
  url?: string;
  thumbnail?: string;
}

export interface TireSearchResult {
  products: TireProduct[];
  total: number;
  page: number;
  per_page: number;
}

export interface TireApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    count?: number;
    page?: number;
    per_page?: number;
    total?: number;
  };
  message?: string;
  error?: string;
}

export interface TireDataResult {
  brand: string;
  product: string;
  details: TireApiResponse<TireProductDetails> | null;
  bnb: TireApiResponse<TireBNBReason[]> | null;
  modes: TireApiResponse<TireMode[]> | null;
  materials: TireApiResponse<TireMaterial[]> | null;
}

class TiresApi {
  /**
   * Lastik markalarını getirir
   */
  async getBrands(priceSegment?: string | string[]): Promise<TireApiResponse<TireBrand[]>> {
    try {
      const params = new URLSearchParams();
      
      if (priceSegment) {
        const segments = Array.isArray(priceSegment) ? priceSegment : [priceSegment];
        segments.forEach(segment => params.append('price_segment', segment));
      }

      const response = await backendApi.get(`/tires/brands?${params.toString()}`);
      return response.data as TireApiResponse<TireBrand[]>;
    } catch (error) {
      console.error('Lastik markaları alınırken hata:', error);
      throw error;
    }
  }

  /**
   * Marka ürünlerini getirir
   */
  async getBrandProducts(
    brandSlug: string,
    options: {
      region?: string | string[];
      season?: string | string[];
      automobileType?: string;
      runflat?: boolean;
      showDiscontinued?: boolean;
      showOe?: boolean;
      ordering?: string;
    } = {}
  ): Promise<TireApiResponse<TireProduct[]>> {
    try {
      const params = new URLSearchParams();
      
      if (options.region) {
        const regions = Array.isArray(options.region) ? options.region : [options.region];
        regions.forEach(region => params.append('region', region));
      }
      if (options.season) {
        const seasons = Array.isArray(options.season) ? options.season : [options.season];
        seasons.forEach(season => params.append('season', season));
      }
      if (options.automobileType) {
        params.append('automobile_type', options.automobileType);
      }
      if (options.runflat !== undefined) {
        params.append('runflat', options.runflat.toString());
      }
      if (options.showDiscontinued !== undefined) {
        params.append('show_discontinued', options.showDiscontinued.toString());
      }
      if (options.showOe !== undefined) {
        params.append('show_oe', options.showOe.toString());
      }
      if (options.ordering) {
        params.append('ordering', options.ordering);
      }

      const response = await backendApi.get(`/tires/brands/${brandSlug}/products?${params.toString()}`);
      return response.data as TireApiResponse<TireProduct[]>;
    } catch (error) {
      console.error('Marka ürünleri alınırken hata:', error);
      throw error;
    }
  }

  /**
   * Ürün detaylarını getirir
   */
  async getProductDetails(brandSlug: string, productSlug: string): Promise<TireApiResponse<TireProductDetails>> {
    try {
      const response = await backendApi.get(`/tires/products/${brandSlug}/${productSlug}`);
      return response.data as TireApiResponse<TireProductDetails>;
    } catch (error) {
      console.error('Ürün detayları alınırken hata:', error);
      throw error;
    }
  }

  /**
   * Ürün BNB nedenlerini getirir
   */
  async getProductBNB(brandSlug: string, productSlug: string): Promise<TireApiResponse<TireBNBReason[]>> {
    try {
      const response = await backendApi.get(`/tires/products/${brandSlug}/${productSlug}/bnb`);
      return response.data as TireApiResponse<TireBNBReason[]>;
    } catch (error) {
      console.error('Ürün BNB nedenleri alınırken hata:', error);
      throw error;
    }
  }

  /**
   * Ürün modifikasyonlarını getirir
   */
  async getProductModes(brandSlug: string, productSlug: string): Promise<TireApiResponse<TireMode[]>> {
    try {
      const response = await backendApi.get(`/tires/products/${brandSlug}/${productSlug}/modes`);
      return response.data as TireApiResponse<TireMode[]>;
    } catch (error) {
      console.error('Ürün modifikasyonları alınırken hata:', error);
      throw error;
    }
  }

  /**
   * Ürün materyallerini getirir
   */
  async getProductMaterials(
    brandSlug: string, 
    productSlug: string, 
    type?: 'article' | 'video' | 'benchmark' | 'link'
  ): Promise<TireApiResponse<TireMaterial[]>> {
    try {
      const params = type ? `?type=${type}` : '';
      const response = await backendApi.get(`/tires/products/${brandSlug}/${productSlug}/materials${params}`);
      return response.data as TireApiResponse<TireMaterial[]>;
    } catch (error) {
      console.error('Ürün materyalleri alınırken hata:', error);
      throw error;
    }
  }

  /**
   * Ürün adından tüm lastik verilerini getirir
   */
  async getTireDataByProductName(productName: string): Promise<TireApiResponse<TireDataResult>> {
    try {
      const response = await backendApi.post('/tires/product-data', { productName });
      return response.data as TireApiResponse<TireDataResult>;
    } catch (error) {
      console.error('Ürün adından lastik verileri alınırken hata:', error);
      throw error;
    }
  }

  /**
   * Bölgeleri getirir
   */
  async getRegions(): Promise<TireApiResponse<TireRegion[]>> {
    try {
      const response = await backendApi.get('/tires/regions');
      return response.data as TireApiResponse<TireRegion[]>;
    } catch (error) {
      console.error('Bölgeler alınırken hata:', error);
      throw error;
    }
  }

  /**
   * Performans kategorilerini getirir
   */
  async getPerformanceCategories(): Promise<TireApiResponse<TirePerformanceCategory[]>> {
    try {
      const response = await backendApi.get('/tires/performance-categories');
      return response.data as TireApiResponse<TirePerformanceCategory[]>;
    } catch (error) {
      console.error('Performans kategorileri alınırken hata:', error);
      throw error;
    }
  }

  /**
   * Testleri getirir
   */
  async getTests(options: {
    year?: string | string[];
    season?: string | string[];
    automobileType?: string;
    page?: number;
    perPage?: number;
  } = {}): Promise<TireApiResponse<TireTest[]>> {
    try {
      const params = new URLSearchParams();
      
      if (options.year) {
        const years = Array.isArray(options.year) ? options.year : [options.year];
        years.forEach(year => params.append('year', year));
      }
      if (options.season) {
        const seasons = Array.isArray(options.season) ? options.season : [options.season];
        seasons.forEach(season => params.append('season', season));
      }
      if (options.automobileType) {
        params.append('automobile_type', options.automobileType);
      }
      if (options.page) {
        params.append('page', options.page.toString());
      }
      if (options.perPage) {
        params.append('per_page', options.perPage.toString());
      }

      const response = await backendApi.get(`/tires/tests?${params.toString()}`);
      return response.data as TireApiResponse<TireTest[]>;
    } catch (error) {
      console.error('Testler alınırken hata:', error);
      throw error;
    }
  }

  /**
   * Lastik arama yapar
   */
  async searchTires(query: Record<string, any>): Promise<TireApiResponse<TireSearchResult>> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(query).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v.toString()));
        } else if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await backendApi.get(`/tires/search?${params.toString()}`);
      return response.data as TireApiResponse<TireSearchResult>;
    } catch (error) {
      console.error('Lastik arama sırasında hata:', error);
      throw error;
    }
  }

  /**
   * Gelişmiş lastik arama yapar
   */
  async advancedSearchTires(query: Record<string, any>): Promise<TireApiResponse<TireSearchResult>> {
    try {
      const params = new URLSearchParams();
      
      Object.entries(query).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v.toString()));
        } else if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      const response = await backendApi.get(`/tires/search/advanced?${params.toString()}`);
      return response.data as TireApiResponse<TireSearchResult>;
    } catch (error) {
      console.error('Gelişmiş lastik arama sırasında hata:', error);
      throw error;
    }
  }
}

export const tiresApi = new TiresApi();
