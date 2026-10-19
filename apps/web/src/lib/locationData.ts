import { API_ENDPOINTS, getServerSiteHeaders } from '@/src/config/api';
import { throwIfUnavailable, rethrowUnavailable, PAGE_FETCH_TIMEOUT } from '@/src/lib/apiError';
import { BRANCHES, type Branch } from '@/src/data/lja/subeler';
import { distanceKm, hasGeo, type GeoPoint } from '@/src/lib/geo';

export interface MontagePointLite {
    _id: string;
    name: string;
    isPublicInfo?: boolean;
    city: string;
    cityId?: string;
    district: string;
    location?: { lat: number | null; lng: number | null };
    services: { name: string }[];
    montageStartingPrice: number | null;
}

export interface RegionStats { orderBucket: string; topSizes: string[] }

export const BRANCH_GEO: Record<string, GeoPoint> = {
    'sisli-mecidiyekoy': { lat: 41.07205, lng: 29.00007 },
    maslak: { lat: 41.11, lng: 29.02059 }
};

const apiRoot = () => API_ENDPOINTS.definition.get().replace(/\/definition$/, '');

export async function getMontagePoints(site?: string): Promise<MontagePointLite[]> {
    try {
        const res = await fetch(API_ENDPOINTS.montage.list(), {
            next: { revalidate: 1800 },
            headers: site ? { 'X-Site': site } : await getServerSiteHeaders(),
            signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT)
        });
        throwIfUnavailable(res, 'getMontagePoints');
        if (!res.ok) return [];
        const json = await res.json();
        return json.success ? (json.data || []) : [];
    } catch (error) {
        console.error('[locationData] getMontagePoints error:', error);
        rethrowUnavailable(error, 'getMontagePoints');
    }
}

export async function getRegionStats(site?: string): Promise<Record<string, RegionStats>> {
    try {
        const res = await fetch(`${apiRoot()}/location-stats`, {
            next: { revalidate: 21600 },
            headers: site ? { 'X-Site': site } : await getServerSiteHeaders(),
            signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT)
        });
        if (!res.ok) return {};
        const json = await res.json();
        return json.success ? json.data || {} : {};
    } catch {
        return {};
    }
}

const pointGeo = (p: MontagePointLite): GeoPoint | null =>
    p.location && typeof p.location.lat === 'number' && typeof p.location.lng === 'number'
        ? { lat: p.location.lat, lng: p.location.lng } : null;

export function nearestPoints(from: GeoPoint, points: MontagePointLite[], n: number) {
    return points
        .map(p => ({ p, g: pointGeo(p) }))
        .filter((x): x is { p: MontagePointLite; g: GeoPoint } => !!x.g)
        .map(x => ({ point: x.p, km: distanceKm(from, x.g) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, n);
}

export function nearestBranch(from: GeoPoint): { branch: Branch; km: number } {
    return BRANCHES
        .map(b => ({ branch: b, km: distanceKm(from, BRANCH_GEO[b.slug]) }))
        .sort((a, b) => a.km - b.km)[0];
}

export const pointLabel = (p: MontagePointLite) => (p.isPublicInfo && p.name ? p.name : 'Anlaşmalı Montaj Noktası');
export { hasGeo };
