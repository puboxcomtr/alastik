'use client';
// Kategori sayfası kataloğu — ürünler canlı /products/filter'dan (X-Site: b2b)
// SUNUCU TARAFINDA SAYFALANARAK çekilir. Sayfa numaralarıyla gezinilir; her sayfa
// yalnız o sayfanın ürünlerini gösterir. Depo stoğu sayfa başına toplu çekilir.
import { useEffect, useRef, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';
import { Catalog } from '@components/b2b-tema/katalog';
import { rawToTire, normalizeBrand, type RawProduct } from '@components/b2b-tema/vitrin-katalog';
import type { Tire } from '@components/b2b-tema/lib/ornek-veri';

const SAYFA_BOYU = 50; // her sayfada gösterilecek ürün sayısı

export function KategoriKatalog({ kategori }: { kategori?: string }) {
    const [products, setUrunler] = useState<Tire[] | null>(null);
    const [sayfa, setSayfa] = useState(1);
    const [toplamSayfa, setToplamSayfa] = useState(1);
    const [yukleniyor, setYukleniyor] = useState(false);
    const markaLogo = useRef<Record<string, string>>({});

    // Marka logoları bir kez çekilir (tüm sayfalarda ortak)
    useEffect(() => {
        fetch(API_ENDPOINTS.b2b.brands(), { headers: { 'X-Site': 'b2b' } })
            .then(r => r.json())
            .then(brandRes => {
                const map: Record<string, string> = {};
                for (const m of (brandRes?.data || brandRes?.brands || [])) {
                    if (m?.name && m?.logo) map[normalizeBrand(m.name)] = m.logo;
                    if (m?.diaBrand && m?.logo) map[normalizeBrand(m.diaBrand)] = m.logo;
                }
                markaLogo.current = map;
            })
            .catch(() => {});
    }, []);

    // Sayfadaki ürünler için depo stoğunu toplu çekip işler (tek grup, ≤120)
    function depoStokIsle(ham: RawProduct[]) {
        const token = localStorage.getItem('authToken');
        const kodlar = ham.map(u => u.diaData?.stokkartkodu).filter(Boolean) as string[];
        if (!token || kodlar.length === 0) return;
        fetch(API_ENDPOINTS.b2b.depoStok(kodlar.join(',')), { headers: { 'X-Site': 'b2b', Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(dRes => {
                if (!dRes?.success) return;
                const map = dRes.data as Record<string, { ad: string; adet: number }[]>;
                setUrunler(prev => (prev || []).map(u => {
                    const raw = ham.find(h => h._key === u.id);
                    const kod = raw?.diaData?.stokkartkodu || '';
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

    // Bir sayfayı çeker (mevcut listeyi bu sayfanınkiyle değiştirir)
    function sayfaYukle(p: number) {
        setYukleniyor(true);
        const params = new URLSearchParams({ limit: String(SAYFA_BOYU), page: String(p) });
        if (kategori) params.set('category', kategori);
        fetch(`${API_ENDPOINTS.products.filter()}?${params.toString()}`, { headers: { 'X-Site': 'b2b' } })
            .then(r => r.json())
            .then(res => {
                const ham: RawProduct[] = res?.data?.products || res?.products || [];
                setToplamSayfa(res?.data?.pagination?.totalPages || 1);
                setUrunler(ham.map(u => rawToTire(u, markaLogo.current)));
                setYukleniyor(false);
                depoStokIsle(ham);
            })
            .catch(() => setYukleniyor(false));
    }

    // Kategori değişince ilk sayfaya dön
    useEffect(() => {
        setUrunler(null);
        setSayfa(1);
        setToplamSayfa(1);
        sayfaYukle(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kategori]);

    function sayfaDegistir(p: number) {
        if (p < 1 || p > toplamSayfa || p === sayfa) return;
        setSayfa(p);
        sayfaYukle(p);
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (products === null) {
        return <p className="note" style={{ padding: '1rem 0' }}>Ürünler yükleniyor…</p>;
    }
    if (products.length === 0) {
        return <p className="note" style={{ padding: '1rem 0' }}>Bu kategoride ürün bulunamadı.</p>;
    }
    return (
        <Catalog
            products={products}
            tabsGizle
            serverPage={sayfa}
            serverTotalPages={toplamSayfa}
            onServerPageChange={sayfaDegistir}
            serverLoading={yukleniyor}
        />
    );
}
