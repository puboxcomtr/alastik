import { API_ENDPOINTS, getServerSiteHeaders } from '@/src/config/api';
import { throwIfUnavailable, rethrowUnavailable, PAGE_FETCH_TIMEOUT } from '@/src/lib/apiError';

export type SeasonKey = 'yaz' | 'kis' | 'dort';
export type Pair = [string, number];

export interface BrandSeries { name: string; season: string | null; n: number }
export interface BrandTagLink { title: string; url: string; n: number }

export interface BrandSeoStats {
    total: number;
    types: Pair[];
    seasons: Pair[];
    series: BrandSeries[];
    sizes: Pair[];
    sizeCount?: number;
    rims: Pair[];
    origins: Pair[];
    vehicles: Pair[];
    runFlat: number;
    xl: number;
    seal: number;
    ev: number;
    snowflake: number;
    years: Pair[];
    wet: Pair[];
    fuel: Pair[];
    noise: { min: number; max: number } | null;
}

export interface BrandSeo {
    brand: { slug: string; name: string; ack: string };
    season: SeasonKey | null;
    stats: BrandSeoStats;
    tags: { series: BrandTagLink[]; sizes: BrandTagLink[]; seasons: BrandTagLink[] };
}

export interface BrandSeoIndexRow {
    slug: string;
    name: string;
    total: number;
    tires: number;
    seasons: Record<SeasonKey, number>;
    updatedAt?: string;
}

const apiRoot = () => API_ENDPOINTS.definition.get().replace(/\/definition$/, '');

async function fetchBrandSeo(slug: string, season?: SeasonKey): Promise<BrandSeo | null> {
    const q = season ? `?mevsim=${season}` : '';
    const res = await fetch(`${apiRoot()}/brand-seo/${encodeURIComponent(slug)}${q}`, {
        next: { revalidate: 3600 },
        headers: await getServerSiteHeaders(),
        signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT)
    });
    throwIfUnavailable(res, 'getBrandSeo');
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
}

export async function getBrandSeo(slug: string, season?: SeasonKey): Promise<BrandSeo | null> {
    try {
        return await fetchBrandSeo(slug, season);
    } catch (error) {
        console.error('[brandSeoService] getBrandSeo error:', error);
        return null;
    }
}

export async function getBrandSeoStrict(slug: string, season?: SeasonKey): Promise<BrandSeo | null> {
    try {
        return await fetchBrandSeo(slug, season);
    } catch (error) {
        console.error('[brandSeoService] getBrandSeoStrict error:', error);
        rethrowUnavailable(error, 'getBrandSeo');
    }
}

export async function getBrandSeoIndex(site: string): Promise<BrandSeoIndexRow[]> {
    try {
        const res = await fetch(`${apiRoot()}/brand-seo`, {
            next: { revalidate: 3600 },
            headers: { 'X-Site': site },
            signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT)
        });
        if (!res.ok) return [];
        const json = await res.json();
        return json.success ? json.data || [] : [];
    } catch {
        return [];
    }
}
