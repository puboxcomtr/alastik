// LJA şube sayfaları için sunucu tarafı veri: şube kaydı (montaj noktası) + hizmet fiyatları.
// Yalnızca server component / generateMetadata içinde kullanılır.
import { API_ENDPOINTS, getServerSiteHeaders } from '@/src/config/api';
import { filterProducts } from '@/src/services/productService';
import { throwIfUnavailable, rethrowUnavailable, PAGE_FETCH_TIMEOUT } from '@/src/lib/apiError';
import type { Branch } from '@/src/data/lja/subeler';
import type { ServiceGroup } from '@/src/data/lja/hizmetGruplari';

export interface BranchPoint {
    _id: string;
    name: string;
    address?: string;
    phone?: string;
    city: string;
    district: string;
    workingSchedule?: Record<string, { open: string; close: string }>;
    amenities: string[];
    services: Array<{ productKey: string; sku: string; name: string; price: number | null; isMontage?: boolean }>;
}

export interface ServiceRow {
    name: string;
    // KDV dahil satış fiyatı (TL); 0 = ücretsiz / fiyata dahil
    price: number | null;
    // Hizmet ürün sayfası (varsa)
    url: string | null;
}

export const DAYS: { key: string; label: string; schema: string }[] = [
    { key: 'monday', label: 'Pazartesi', schema: 'Monday' },
    { key: 'tuesday', label: 'Salı', schema: 'Tuesday' },
    { key: 'wednesday', label: 'Çarşamba', schema: 'Wednesday' },
    { key: 'thursday', label: 'Perşembe', schema: 'Thursday' },
    { key: 'friday', label: 'Cuma', schema: 'Friday' },
    { key: 'saturday', label: 'Cumartesi', schema: 'Saturday' },
    { key: 'sunday', label: 'Pazar', schema: 'Sunday' }
];

export const AMENITY_LABELS: Record<string, { label: string; icon: string }> = {
    wc: { label: 'WC', icon: 'ri-user-3-line' },
    waiting_room: { label: 'Bekleme Salonu', icon: 'ri-armchair-line' },
    wifi: { label: 'Wi-Fi', icon: 'ri-wifi-line' },
    air_conditioning: { label: 'Klima', icon: 'ri-windy-line' },
    refreshments: { label: 'İkram', icon: 'ri-cup-line' },
    oil_change: { label: 'Yağ Değişimi', icon: 'ri-drop-line' },
    headlight_check: { label: 'Far Kontrolü', icon: 'ri-lightbulb-line' }
};

// Şube kaydı; kayıt yoksa null (sayfa 404), API hatasında hata fırlatılır (sayfa 500)
export async function getBranchPoint(branch: Branch): Promise<BranchPoint | null> {
    try {
        const res = await fetch(API_ENDPOINTS.montage.detail(branch.montagePointId), {
            next: { revalidate: 300 },
            headers: await getServerSiteHeaders(),
            signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT)
        });
        throwIfUnavailable(res, 'getBranchPoint');
        if (!res.ok) return null;
        const json = await res.json();
        return json.success ? json.data : null;
    } catch (error) {
        console.error('[ljaBranches] getBranchPoint error:', error);
        rethrowUnavailable(error, 'getBranchPoint');
    }
}

// Grubun hizmetleri: katalog kategorisindeki hizmet ürünleri (sitede görünen KDV dahil fiyatla);
// montaj grubu için şube kaydındaki montaj hizmetleri
export async function getGroupServices(group: ServiceGroup, point: BranchPoint): Promise<ServiceRow[]> {
    if (!group.categorySlug) {
        return point.services
            .filter(s => s.isMontage)
            .map(s => ({ name: s.name, price: s.price, url: null }));
    }
    const data = await filterProducts({ category: group.categorySlug, limit: 100 });
    const rows: ServiceRow[] = (data?.products || []).map((p: any) => ({
        name: p.diaData?.aciklama || '',
        price: Number(p.diaData?.m_birimler?.[0]?.fiyat4) || null,
        url: p.customData?.seoUrl ? `/urun/${p.customData.seoUrl}` : null
    }));
    return rows
        .filter(r => r.name)
        .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
}

export function formatPrice(price: number | null): string {
    if (price === null) return 'Şubeden öğrenin';
    if (price === 0) return 'Ücretsiz*';
    return `${price.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} TL`;
}

export function mapUrl(branch: Branch): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(branch.mapQuery)}`;
}

// Şubenin yerel işletme verisi (AutoRepair) — şube ve hizmet sayfalarında
export function branchJsonLd(origin: string, branch: Branch, point: BranchPoint) {
    const hours = DAYS
        .map(d => ({ d, h: point.workingSchedule?.[d.key] }))
        .filter(x => x.h?.open && x.h?.close)
        .map(x => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: x.d.schema, opens: x.h!.open, closes: x.h!.close }));
    return {
        '@context': 'https://schema.org',
        '@type': 'AutoRepair',
        '@id': `${origin}/subeler/${branch.slug}#sube`,
        name: `LastikJantAVM ${branch.shortName} Şubesi (${point.name})`,
        url: `${origin}/subeler/${branch.slug}`,
        ...(point.phone ? { telephone: point.phone } : {}),
        ...(point.address ? {
            address: {
                '@type': 'PostalAddress',
                streetAddress: point.address,
                addressLocality: branch.district,
                addressRegion: 'İstanbul',
                addressCountry: 'TR'
            }
        } : {}),
        ...(hours.length ? { openingHoursSpecification: hours } : {}),
        hasMap: mapUrl(branch),
        parentOrganization: { '@id': `${origin}/#organization` },
        priceRange: '₺₺'
    };
}
