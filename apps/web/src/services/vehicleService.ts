// Araç uyumluluk verisi (/api/vehicles) — /arac sayfaları ve sitemap için.
// Sayfa verisi çağrıları: 404 → null, API hatası → hata fırlatılır (sayfa 500; bkz. lib/apiError).
import { API_ENDPOINTS, getServerSiteHeaders } from '@/src/config/api';
import { throwIfUnavailable, rethrowUnavailable, PAGE_FETCH_TIMEOUT } from '@/src/lib/apiError';

export interface VehicleTag { seoUrl: string; count: number }

export interface VehicleModelSummary {
    makeSlug: string;
    makeName: string;
    modelSlug: string;
    modelName: string;
    yearFrom?: number;
    yearTo?: number;
    oeTireSizes: string[];
    rimDiameters: number[];
    boltPatterns: string[];
    tireStock: number;
    indexable: boolean;
    updatedAt?: string;
}

export interface VehicleMake {
    makeSlug: string;
    makeName: string;
    modelCount: number;
    indexableModelCount: number;
    tireStock: number;
}

export interface VehicleTire {
    tire: string;
    tireFull?: string;
    width?: number;
    aspect?: number;
    diameter?: number;
    loadIndex?: number;
    speedIndex?: string;
    rim?: string;
    rimWidth?: number;
    rimOffset?: number;
    pressureBar?: number;
}

export interface VehicleModification {
    slug: string;
    trim: string;
    startYear?: number;
    endYear?: number;
    fuel?: string;
    powerHp?: number;
    boltPattern?: string;
    centreBore?: number;
    threadSize?: string;
    fastenerType?: string;
    wheels: { oe: boolean; winter: boolean; runflat: boolean; steel: boolean; front: VehicleTire; rear: VehicleTire | null }[];
}

export interface VehicleGeneration {
    slug: string;
    name: string;
    platform?: string;
    start?: number;
    end?: number;
    bodies: string[];
    modifications: VehicleModification[];
}

export interface VehicleSizeStock {
    size: string;
    oe: boolean;
    key: string | null;
    width?: string;
    aspect?: string;
    diameter?: string;
    commercial?: boolean;
    tag: VehicleTag | null;
    chainCount: number;
}

export interface VehicleModelDetail {
    makeSlug: string;
    makeName: string;
    modelSlug: string;
    modelName: string;
    generations: VehicleGeneration[];
    summary: {
        yearFrom?: number;
        yearTo?: number;
        oeTireSizes: string[];
        optionalTireSizes: string[];
        rimDiameters: number[];
        boltPatterns: string[];
        centreBores: number[];
        fuels: string[];
        bodies: string[];
        modificationCount: number;
    };
    syncedAt?: string;
    stock: {
        tireSizes: VehicleSizeStock[];
        rims: { boltPattern: string; tag: VehicleTag | null }[];
        indexable: boolean;
        minTireStock: number;
    };
}

// API kök adresi lib/sitemap.ts'teki yöntemle çözülür (config/api.ts'e dokunmadan)
const base = () => `${API_ENDPOINTS.definition.get().replace(/\/definition$/, '')}/vehicles`;

// site: x-site header'ı olmayan isteklerde (sitemap route'ları) site açıkça verilir
async function getJson<T>(path: string, what: string, site?: string): Promise<T | null> {
    try {
        const res = await fetch(`${base()}${path}`, {
            next: { revalidate: 1800 },
            headers: site ? { 'X-Site': site } : await getServerSiteHeaders(),
            signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT)
        });
        throwIfUnavailable(res, what);
        if (!res.ok) return null;
        const json = await res.json();
        return json.success ? json.data : null;
    } catch (error) {
        console.error(`[vehicleService] ${what} error:`, error);
        rethrowUnavailable(error, what);
    }
}

export const getVehicleMakes = () => getJson<VehicleMake[]>('/makes', 'getVehicleMakes');
export const getVehicleIndex = (site?: string) => getJson<VehicleModelSummary[]>('/index', 'getVehicleIndex', site);
export const getVehicleMake = (make: string) =>
    getJson<{ makeSlug: string; makeName: string; models: VehicleModelSummary[] }>(`/${encodeURIComponent(make)}`, 'getVehicleMake');
export const getVehicleModel = (make: string, model: string) =>
    getJson<VehicleModelDetail>(`/${encodeURIComponent(make)}/${encodeURIComponent(model)}`, 'getVehicleModel');
