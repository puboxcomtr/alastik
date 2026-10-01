// Konum sayfaları (/lastikci) için yardımcılar: Türkçe slug, mesafe, konum verisi erişimi.
// Konum verisi (il / ilçe / İstanbul mahalleleri + koordinatlar) data/geo/konumlar.json içindedir;
// adres koleksiyonlarından (address_cities / districts / neighborhoods) ve OpenStreetMap koordinatlarından üretilmiştir.
import konumlar from '@/src/data/geo/konumlar.json';

export interface GeoPoint { lat: number; lng: number }
export interface Il extends Partial<GeoPoint> { id: string; name: string; slug: string }
export interface Ilce extends Partial<GeoPoint> { id: string; cityId: string; name: string; slug: string }
export interface Mahalle extends Partial<GeoPoint> { id: string; districtId: string; name: string; slug: string }

const data = konumlar as unknown as { iller: Il[]; ilceler: Ilce[]; mahalleler: Mahalle[] };

export const ILLER: Il[] = data.iller;
export const ILCELER: Ilce[] = data.ilceler;
export const MAHALLELER: Mahalle[] = data.mahalleler;

export const ISTANBUL_ID = '34';

export function trSlug(s: string): string {
    return s
        .toLocaleLowerCase('tr-TR')
        .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
        .replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

export const hasGeo = (p: Partial<GeoPoint>): p is GeoPoint => typeof p.lat === 'number' && typeof p.lng === 'number';

// Kuş uçuşu mesafe (km)
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
    const R = 6371, rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}
export const fmtKm = (km: number) => (km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km).toString()) + ' km';

export const ilBySlug = (slug: string) => ILLER.find(i => i.slug === slug);
export const ilById = (id: string) => ILLER.find(i => i.id === id);
export const ilcelerOf = (cityId: string) => ILCELER.filter(d => d.cityId === cityId).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
export const ilceBySlug = (cityId: string, slug: string) => ILCELER.find(d => d.cityId === cityId && d.slug === slug);
export const mahallelerOf = (districtId: string) => MAHALLELER.filter(m => m.districtId === districtId).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
export const mahalleBySlug = (districtId: string, slug: string) => MAHALLELER.find(m => m.districtId === districtId && m.slug === slug);

// En yakın n öğe (kendisi hariç)
export function nearest<T extends Partial<GeoPoint>>(from: GeoPoint, items: T[], n: number, exclude?: T): Array<T & { km: number }> {
    return items
        .filter(i => i !== exclude && hasGeo(i))
        .map(i => ({ ...i, km: distanceKm(from, i as GeoPoint) }))
        .sort((a, b) => a.km - b.km)
        .slice(0, n);
}

// Model/konum adına göre sabit cümle seçimi (sayfalar arası metin çeşitliliği)
export function pick<T>(seed: string, salt: string, arr: T[]): T {
    let h = 2166136261;
    const s = seed + salt;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return arr[(h >>> 0) % arr.length];
}
