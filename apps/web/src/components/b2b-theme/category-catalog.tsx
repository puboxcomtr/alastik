'use client';
import { useEffect, useRef, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';
import { Catalog, type ServerOptions, type ServerFilters } from '@components/b2b-theme/catalog';
import { SpinnerIcon } from '@components/b2b-theme/icons';
import { DEFAULT_CATALOG_FILTERS, filtersForProductTypes, hiddenColumnsForProductTypes, hasNewTireProductType, withoutHiddenFilters, withHiddenFilterColumns, type CatalogFilterKey, type CatalogColumnKey } from '@components/b2b-theme/lib/catalog-filters';
import { rawToTire, normalizeBrand, mergeDepotStocks, type RawProduct, type CariOran } from '@components/b2b-theme/showcase-catalog';
import { fetchDepotStocks } from '@components/b2b-theme/lib/depot-stock';
import type { Tire } from '@components/b2b-theme/lib/sample-data';

const PAGE_SIZE = 50;
const PRESERVED_TAB_PARAM = 'tab';
const SHOWCASE_URL_PARAM = 'vitrin';
const DEFAULT_SHOWCASE_KEY = 'first';

const SEASON_API: Record<string, string> = { yaz: 'Yaz', kis: 'Kış', '4mevsim': '4 Mevsim' };
const SEASON_ETIKET: Record<string, string> = { yaz: 'Yaz', kis: 'Kış', '4mevsim': '4 Mevsim' };
const SEASON_SIRA = ['yaz', 'kis', '4mevsim'];

function seasonRawToKey(raw: string): string | null {
    const k = String(raw).toLocaleLowerCase('tr');
    if (k.includes('4') || k.includes('mevsim')) return '4mevsim';
    if (k.includes('kış') || k.includes('kis')) return 'kis';
    if (k.includes('yaz')) return 'yaz';
    return null;
}

const BOS: ServerFilters = { q: '', marka: '', mevsim: '', dot: '', oem: '', depo: '', rft: false, cTipi: false, xl: false, ev: false, jantCap: '', bijon: '', showcase: false };

function plasiyerOturumu(): boolean {
    if (typeof window === 'undefined') return false;
    try { return !!localStorage.getItem('plasiyerToken') && !localStorage.getItem('authToken'); } catch { return false; }
}

function plasiyerXmlToken(): string {
    if (typeof window === 'undefined') return '';
    try {
        const authToken = localStorage.getItem('authToken') || '';
        if (!authToken) return localStorage.getItem('plasiyerToken') || '';
        const payload = JSON.parse(atob(authToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload?.impersonatedBy ? authToken : '';
    } catch { return ''; }
}

type SortState = { field: string; dir: 'asc' | 'desc' } | null;

export function CategoryCatalog({ kategori }: { kategori?: string }) {
    const [products, setUrunler] = useState<Tire[] | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<ServerFilters>(BOS);
    const [sort, setSort] = useState<SortState>(null);
    const [facet, setFacet] = useState<ServerOptions>({ brands: [], brandLogos: {}, seasons: [], dots: [], oems: [], warehouses: [] });
    const [visibleFilters, setVisibleFilters] = useState<CatalogFilterKey[]>(DEFAULT_CATALOG_FILTERS);
    const [hiddenColumns, setHiddenColumns] = useState<CatalogColumnKey[]>([]);
    const markaLogo = useRef<Record<string, string>>({});
    const showcaseKey = useRef<string>(DEFAULT_SHOWCASE_KEY);
    const cariOran = useRef<CariOran>({ tanimlifiyat: 1, fiyatyuzde: 50 });
    const firstLoad = useRef(true);
    const [plasiyer, setPlasiyer] = useState(false);
    const [plasiyerGroup, setPlasiyerGroup] = useState('');
    const [retailPriceNote, setRetailPriceNote] = useState('');
    const [newTireCategory, setNewTireCategory] = useState(false);
    useEffect(() => {
        const active = plasiyerOturumu();
        setPlasiyer(active);
        if (!active) return;
        const token = localStorage.getItem('plasiyerToken');
        fetch(API_ENDPOINTS.b2b.plasiyerMe(), { headers: { Authorization: `Bearer ${token}`, 'X-Site': 'b2b' } })
            .then(r => r.json())
            .then(d => { if (d?.success) setPlasiyerGroup(String(d.data?.salesGroup || '')); })
            .catch(() => {});
        fetch(API_ENDPOINTS.b2b.themeSettings(), { headers: { 'X-Site': 'b2b' } })
            .then(r => r.json())
            .then(d => { if (d?.success) setRetailPriceNote(String(d.data?.retailSalespersonPriceNote || '').trim()); })
            .catch(() => {});
    }, []);

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
                oem: q.get('oem') || '',
                depo: q.get('depo') || '',
                rft: q.get('rft') === '1',
                cTipi: q.get('cserisi') === '1',
                xl: q.get('xl') === '1',
                ev: q.get('ev') === '1',
                jantCap: q.get('jantcap') || '',
                bijon: q.get('bijon') || '',
                showcase: q.get(SHOWCASE_URL_PARAM) === '1',
            },
            sort: sortField ? { field: sortField, dir: sortDir } : null,
        };
    }

    function writeUrl(s: number, f: ServerFilters, srt: SortState): void {
        if (typeof window === 'undefined') return;
        const q = new URLSearchParams();
        const activeTab = new URLSearchParams(window.location.search).get(PRESERVED_TAB_PARAM);
        if (activeTab) q.set(PRESERVED_TAB_PARAM, activeTab);
        if (f.q) q.set('q', f.q);
        if (f.marka) q.set('marka', f.marka);
        if (f.mevsim) q.set('mevsim', f.mevsim);
        if (f.dot) q.set('dot', f.dot);
        if (f.oem) q.set('oem', f.oem);
        if (f.depo) q.set('depo', f.depo);
        if (f.rft) q.set('rft', '1');
        if (f.cTipi) q.set('cserisi', '1');
        if (f.xl) q.set('xl', '1');
        if (f.ev) q.set('ev', '1');
        if (f.jantCap) q.set('jantcap', f.jantCap);
        if (f.bijon) q.set('bijon', f.bijon);
        if (f.showcase) q.set(SHOWCASE_URL_PARAM, '1');
        if (srt) { q.set('sort', srt.field); q.set('dir', srt.dir); }
        if (s > 1) q.set('page', String(s));
        const qs = q.toString();
        const url = window.location.pathname + (qs ? `?${qs}` : '');
        window.history.pushState(null, '', url);
    }

    function applyDepotStock(raw: RawProduct[]) {
        const kodlar = raw.map(u => u.diaData?.stokkartkodu).filter(Boolean) as string[];
        fetchDepotStocks(kodlar).then(map => {
            if (!map) return;
            setUrunler(prev => (prev || []).map(u => {
                const rawProduct = raw.find(h => h._key === u.id);
                const kod = rawProduct?.diaData?.stokkartkodu || '';
                const warehouses = map[kod];
                return warehouses ? mergeDepotStocks(u, warehouses) : u;
            }));
        });
    }

    function applyXmlSources(raw: RawProduct[]) {
        const token = plasiyerXmlToken();
        if (!token) return;
        const idToCode = new Map(raw.filter(u => u.syncInfo?.syncSource === 'xml_integration' && u.diaData?.stokkartkodu)
            .map(u => [u._key, u.diaData!.stokkartkodu as string]));
        const kodlar = [...idToCode.values()];
        if (!kodlar.length) return;
        fetch(API_ENDPOINTS.b2b.plasiyerXmlKaynak(kodlar.join(',')), { headers: { 'X-Site': 'b2b', Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(res => {
                const map = (res?.success ? res.data : null) as Record<string, string> | null;
                if (!map) return;
                setUrunler(prev => (prev || []).map(u => {
                    const source = map[idToCode.get(u.id) || ''];
                    return source ? { ...u, xmlSource: source } : u;
                }));
            })
            .catch(() => {  });
    }

    function loadPage(p: number, f: ServerFilters, srt: SortState) {
        setLoading(true);
        const params = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(p) });
        if (kategori) params.set('category', kategori);
        if (f.q) params.set('q', f.q);
        if (f.marka) params.set('marka', f.marka);
        if (f.mevsim) params.set('mevsim', f.mevsim.split(',').map(k => SEASON_API[k] || k).join(','));
        if (f.dot) params.set('uretim', f.dot);
        if (f.oem) params.set('oem', f.oem);
        if (f.depo) params.set('depo', f.depo);
        if (f.rft) params.set('rft', '1');
        if (f.cTipi) params.set('cserisi', '1');
        if (f.xl) params.set('xl', '1');
        if (f.ev) params.set('ev', '1');
        if (f.jantCap) params.set('jantCap', f.jantCap);
        if (f.bijon) params.set('bijon', f.bijon);
        if (f.showcase) params.set('vitrin', showcaseKey.current);
        if (srt) { params.set('sortBy', srt.field); params.set('sortOrder', srt.dir); }
        if (plasiyerOturumu()) params.set('perakende', '1');
        fetch(`${API_ENDPOINTS.products.filter()}?${params.toString()}`, { headers: { 'X-Site': 'b2b' } })
            .then(r => r.json())
            .then(res => {
                const raw: RawProduct[] = res?.data?.products || res?.products || [];
                setTotalPages(res?.data?.pagination?.totalPages || 1);
                setUrunler(raw.map(u => rawToTire(u, markaLogo.current, cariOran.current)));
                setLoading(false);
                applyDepotStock(raw);
                applyXmlSources(raw);
            })
            .catch(() => setLoading(false));
    }

    function loadFacets() {
        const params = new URLSearchParams({ facets: '1', limit: '1', page: '1' });
        if (kategori) params.set('category', kategori);
        fetch(`${API_ENDPOINTS.products.filter()}?${params.toString()}`, { headers: { 'X-Site': 'b2b' } })
            .then(r => r.json())
            .then(res => {
                const f = res?.data?.facets;
                if (!f) return;
                if (f.showcaseFilter?.key) showcaseKey.current = f.showcaseFilter.key;
                setNewTireCategory(hasNewTireProductType((f.productTypes || []) as string[]));
                setVisibleFilters(withoutHiddenFilters(filtersForProductTypes((f.productTypes || []) as string[]), (f.hiddenFilters || []) as string[]));
                setHiddenColumns(withHiddenFilterColumns(hiddenColumnsForProductTypes((f.productTypes || []) as string[]), (f.hiddenFilters || []) as string[]));
                const keySet = new Set<string>();
                for (const raw of (f.seasons || [])) {
                    const key = seasonRawToKey(raw);
                    if (key) keySet.add(key);
                }
                const seasons = SEASON_SIRA
                    .filter(k => keySet.has(k))
                    .map(k => ({ value: k, label: SEASON_ETIKET[k] }));
                const brands = (f.brands || []) as string[];
                const brandLogos: Record<string, string> = {};
                for (const name of brands) {
                    const lg = markaLogo.current[normalizeBrand(name)];
                    if (lg && !lg.includes('gorsel-bulunamadi')) brandLogos[name] = lg;
                }
                setFacet({
                    brands,
                    brandLogos,
                    seasons,
                    dots: (f.dots || []).map(String) as string[],
                    oems: (f.oems || []) as string[],
                    warehouses: (f.depots || []) as string[],
                    rimDiameters: (f.rimDiameters || []) as string[],
                    boltPatterns: (f.boltPatterns || []) as string[],
                    showcaseFilter: f.showcaseFilter || null,
                });
            })
            .catch(() => {});
    }

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
            plasiyer={plasiyer}
            plasiyerGroup={plasiyerGroup}
            retailPriceNote={newTireCategory ? retailPriceNote : ''}
            visibleFilters={visibleFilters}
            hiddenColumns={hiddenColumns}
        />
    );
}
