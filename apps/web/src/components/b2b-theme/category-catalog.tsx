'use client';
// Kategori sayfası kataloğu — ürünler canlı /products/filter'dan (X-Site: b2b)
// SUNUCU TARAFINDA sayfalanır VE filtrelenir. Marka/mevsim/DOT filtreleri tüm
// ürünlere uygulanır (yalnız görünen sayfaya değil) ve URL'e yansır
// (?page=2&marka=Lassa&mevsim=yaz). Filtre select seçenekleri facet'ten gelir
// (kategorinin tüm markaları/mevsimleri/DOT'ları). Depo stoğu page başına
// toplu çekilir.
import { useEffect, useRef, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';
import { Catalog, type ServerOptions, type ServerFilters } from '@components/b2b-theme/catalog';
import { SpinnerIcon } from '@components/b2b-theme/icons';
import { rawToTire, normalizeBrand, type RawProduct, type CariOran } from '@components/b2b-theme/showcase-catalog';
import type { Tire } from '@components/b2b-theme/lib/sample-data';

const PAGE_SIZE = 50; // her sayfada gösterilecek ürün sayısı

// Mevsim: URL/ön yüz anahtarı ↔ DIA değeri (API mevsim parametresi ozelkod1kodu ile eşleşir)
const SEASON_API: Record<string, string> = { yaz: 'Yaz', kis: 'Kış', '4mevsim': '4 Mevsim' };
const SEASON_ETIKET: Record<string, string> = { yaz: 'Yaz', kis: 'Kış', '4mevsim': '4 Mevsim' };
const SEASON_SIRA = ['yaz', 'kis', '4mevsim'];

/** DIA mevsim değerini (ör. "Kış", "2.El-Yaz") URL anahtarına çevirir. */
function seasonRawToKey(raw: string): string | null {
    const k = String(raw).toLocaleLowerCase('tr');
    if (k.includes('4') || k.includes('mevsim')) return '4mevsim';
    if (k.includes('kış') || k.includes('kis')) return 'kis';
    if (k.includes('yaz')) return 'yaz';
    return null;
}

const BOS: ServerFilters = { q: '', marka: '', mevsim: '', dot: '', depo: '' };

type SortState = { field: string; dir: 'asc' | 'desc' } | null;

export function CategoryCatalog({ kategori }: { kategori?: string }) {
    const [products, setUrunler] = useState<Tire[] | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<ServerFilters>(BOS);
    const [sort, setSort] = useState<SortState>(null);
    const [facet, setFacet] = useState<ServerOptions>({ brands: [], seasons: [], dots: [], warehouses: [] });
    const markaLogo = useRef<Record<string, string>>({});
    const cariOran = useRef<CariOran>({ tanimlifiyat: 1, fiyatyuzde: 50 });
    const firstLoad = useRef(true);

    // ── URL ↔ durum ────────────────────────────────────────────────
    // Başlangıç durumunu adres çubuğundan oku (client-only)
    function readFromUrl(): { page: number; filters: ServerFilters; sort: SortState } {
        if (typeof window === 'undefined') return { page: 1, filters: BOS, sort: null };
        const q = new URLSearchParams(window.location.search);
        const sortField = q.get('sort') || '';
        const sortDir = q.get('dir') === 'desc' ? 'desc' : 'asc';
        return {
            page: Math.max(1, parseInt(q.get('page') || '1', 10) || 1),
            filters: {
                q: q.get('q') || '',
                marka: q.get('marka') || '',
                mevsim: q.get('mevsim') || '',
                dot: q.get('dot') || '',
                depo: q.get('depo') || '',
            },
            sort: sortField ? { field: sortField, dir: sortDir } : null,
        };
    }

    // Durumu adres çubuğuna yaz (Next yeniden render tetiklemeden)
    function writeUrl(s: number, f: ServerFilters, srt: SortState): void {
        if (typeof window === 'undefined') return;
        const q = new URLSearchParams();
        if (f.q) q.set('q', f.q);
        if (f.marka) q.set('marka', f.marka);
        if (f.mevsim) q.set('mevsim', f.mevsim);
        if (f.dot) q.set('dot', f.dot);
        if (f.depo) q.set('depo', f.depo);
        if (srt) { q.set('sort', srt.field); q.set('dir', srt.dir); }
        if (s > 1) q.set('page', String(s));
        const qs = q.toString();
        const url = window.location.pathname + (qs ? `?${qs}` : '');
        window.history.pushState(null, '', url);
    }

    // ── Veri çekme ─────────────────────────────────────────────────
    function applyDepotStock(raw: RawProduct[]) {
        const token = localStorage.getItem('authToken');
        const kodlar = raw.map(u => u.diaData?.stokkartkodu).filter(Boolean) as string[];
        if (!token || kodlar.length === 0) return;
        fetch(API_ENDPOINTS.b2b.depoStok(kodlar.join(',')), { headers: { 'X-Site': 'b2b', Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(dRes => {
                if (!dRes?.success) return;
                const map = dRes.data as Record<string, { ad: string; adet: number }[]>;
                setUrunler(prev => (prev || []).map(u => {
                    const rawProduct = raw.find(h => h._key === u.id);
                    const kod = rawProduct?.diaData?.stokkartkodu || '';
                    const warehouses = map[kod];
                    if (!warehouses) return u;
                    const prevTotal = u.stocks.reduce((s, st) => s + st.available, 0);
                    const depotSum = warehouses.reduce((s, d) => s + d.adet, 0);
                    const stocks = warehouses.map(d => ({ warehouseId: d.ad, warehouseName: d.ad, available: d.adet }));
                    if (prevTotal > depotSum) {
                        stocks.push({ warehouseId: 'merkez', warehouseName: 'Merkez', available: prevTotal - depotSum });
                    }
                    return { ...u, stocks };
                }));
            })
            .catch(() => {});
    }

    // Bir sayfayı verilen filtre+sıralamayla çeker (sıralama SUNUCUDA, tüm ürünlerde)
    function loadPage(p: number, f: ServerFilters, srt: SortState) {
        setLoading(true);
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(p) });
        if (kategori) params.set('category', kategori);
        if (f.q) params.set('q', f.q);
        if (f.marka) params.set('marka', f.marka);
        if (f.mevsim) params.set('mevsim', SEASON_API[f.mevsim] || f.mevsim);
        if (f.dot) params.set('uretim', f.dot);
        if (f.depo) params.set('depo', f.depo);
        if (srt) { params.set('sortBy', srt.field); params.set('sortOrder', srt.dir); }
        fetch(`${API_ENDPOINTS.products.filter()}?${params.toString()}`, { headers: { 'X-Site': 'b2b' } })
            .then(r => r.json())
            .then(res => {
                const raw: RawProduct[] = res?.data?.products || res?.products || [];
                setTotalPages(res?.data?.pagination?.totalPages || 1);
                setUrunler(raw.map(u => rawToTire(u, markaLogo.current, cariOran.current)));
                setLoading(false);
                applyDepotStock(raw);
            })
            .catch(() => setLoading(false));
    }

    // Facet listeleri (kategorinin tüm marka/mevsim/DOT'ları) bir kez çekilir
    function loadFacets() {
        const params = new URLSearchParams({ facets: '1', limit: '1', page: '1' });
        if (kategori) params.set('category', kategori);
        fetch(`${API_ENDPOINTS.products.filter()}?${params.toString()}`, { headers: { 'X-Site': 'b2b' } })
            .then(r => r.json())
            .then(res => {
                const f = res?.data?.facets;
                if (!f) return;
                // Mevsim raw değerlerini URL anahtarına indir, tekilleştir, sırala
                const keySet = new Set<string>();
                for (const raw of (f.seasons || [])) {
                    const key = seasonRawToKey(raw);
                    if (key) keySet.add(key);
                }
                const seasons = SEASON_SIRA
                    .filter(k => keySet.has(k))
                    .map(k => ({ value: k, label: SEASON_ETIKET[k] }));
                setFacet({
                    brands: (f.brands || []) as string[],
                    seasons,
                    dots: (f.dots || []).map(String) as string[],
                    warehouses: (f.depots || []) as string[],
                });
            })
            .catch(() => {});
    }

    // Marka logoları bir kez çekilir; ardından ilk page + facet
    useEffect(() => {
        const baslat = readFromUrl();
        setPage(baslat.page);
        setFilters(baslat.filters);
        setSort(baslat.sort);
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        Promise.all([
            fetch(API_ENDPOINTS.b2b.brands(), { headers: { 'X-Site': 'b2b' } })
                .then(r => r.json())
                .then(brandRes => {
                    const map: Record<string, string> = {};
                    for (const m of (brandRes?.data || brandRes?.brands || [])) {
                        if (m?.name && m?.logo) map[normalizeBrand(m.name)] = m.logo;
                        if (m?.diaBrand && m?.logo) map[normalizeBrand(m.diaBrand)] = m.logo;
                    }
                    markaLogo.current = map;
                }).catch(() => {}),
            // Cari fiyat oranı (fiyat1 × %?) — DIA kampanya fiyat kartından dinamik
            token ? fetch(API_ENDPOINTS.b2b.fiyatOrani(), { headers: { Authorization: `Bearer ${token}`, 'X-Site': 'b2b' } })
                .then(r => r.json())
                .then(res => { if (res?.success && res.data) cariOran.current = res.data; }).catch(() => {}) : Promise.resolve(),
        ]).finally(() => {
            loadFacets();
            loadPage(baslat.page, baslat.filters, baslat.sort);
            firstLoad.current = false;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kategori]);

    // Tarayıcı geri/ileri: URL değişince durumu geri yükle
    useEffect(() => {
        function geriIleri() {
            const s = readFromUrl();
            setPage(s.page);
            setFilters(s.filters);
            setSort(s.sort);
            loadPage(s.page, s.filters, s.sort);
        }
        window.addEventListener('popstate', geriIleri);
        return () => window.removeEventListener('popstate', geriIleri);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kategori]);

    // ── Kullanıcı etkileşimleri ────────────────────────────────────
    function changePage(p: number) {
        if (p < 1 || p > totalPages || p === page) return;
        setPage(p);
        writeUrl(p, filters, sort);
        loadPage(p, filters, sort);
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function onFilterChange(parca: Partial<ServerFilters>) {
        const yeni = { ...filters, ...parca };
        setFilters(yeni);
        setPage(1);
        writeUrl(1, yeni, sort);
        loadPage(1, yeni, sort);
    }

    // Sütun başlığı: aynı sütun ise yön değişir, farklıysa artan başlar.
    // Sıralama SUNUCUDA tüm ürünlere uygulanır, 1. sayfaya dönülür, URL'e yazılır.
    function onSortChange(field: string) {
        const yeni: SortState =
            sort && sort.field === field
                ? { field, dir: sort.dir === 'asc' ? 'desc' : 'asc' }
                : { field, dir: 'asc' };
        setSort(yeni);
        setPage(1);
        writeUrl(1, filters, yeni);
        loadPage(1, filters, yeni);
    }

    if (products === null) {
        return (
            <p className="note loading-row" style={{ padding: '1rem 0' }}>
                <SpinnerIcon size={18} className="loading-brand" /> Ürünler yükleniyor…
            </p>
        );
    }
    return (
        <Catalog
            products={products}
            tabsGizle
            serverPage={page}
            serverTotalPages={totalPages}
            onServerPageChange={changePage}
            serverLoading={loading}
            serverFilters={filters}
            onServerFilterChange={onFilterChange}
            serverOptions={facet}
            serverSort={sort}
            onServerSortChange={onSortChange}
        />
    );
}
