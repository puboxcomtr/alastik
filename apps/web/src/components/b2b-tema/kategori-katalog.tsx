'use client';
// Kategori sayfası kataloğu — ürünler PANELDEN değil, canlı /products/filter
// endpoint'inden (X-Site: b2b) sunucu tarafında filtrelenip çekilir. Vitrin ile
// aynı Lastik dönüştürücüyü (hamToLastik) ve depo-stok tooltip'ini kullanır.
import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';
import { Catalog } from '@components/b2b-tema/katalog';
import { rawToTire, normalizeBrand, type RawProduct } from '@components/b2b-tema/vitrin-katalog';
import type { Tire } from '@components/b2b-tema/lib/ornek-veri';

// İlk yüklemede çekilecek ürün sayısı. Katalog istemcide filtreleyip 10'ar
// gösterir; kategori bundan büyükse bayi filtre barıyla daraltır.
const YUKLEME_LIMITI = 200;

export function KategoriKatalog({ kategori }: { kategori?: string }) {
    const [products, setUrunler] = useState<Tire[] | null>(null);

    useEffect(() => {
        const params = new URLSearchParams({ limit: String(YUKLEME_LIMITI), page: '1' });
        if (kategori) params.set('category', kategori);

        Promise.all([
            fetch(API_ENDPOINTS.b2b.brands(), { headers: { 'X-Site': 'b2b' } }).then(r => r.json()).catch(() => null),
            fetch(`${API_ENDPOINTS.products.filter()}?${params.toString()}`, { headers: { 'X-Site': 'b2b' } })
                .then(r => r.json()).catch(() => null),
        ]).then(([brandRes, res]) => {
            const brandLogo: Record<string, string> = {};
            const brands = brandRes?.data || brandRes?.brands || [];
            for (const m of brands) {
                if (m?.name && m?.logo) brandLogo[normalizeBrand(m.name)] = m.logo;
                if (m?.diaBrand && m?.logo) brandLogo[normalizeBrand(m.diaBrand)] = m.logo;
            }
            const ham: RawProduct[] = res?.data?.products || res?.products || [];
            const list = ham.map(u => rawToTire(u, brandLogo));
            setUrunler(list);

            // Depo bazlı stok (Maslak/Şişli/Fabrika) — tooltip + sepet için (ilk 120 kod)
            const kodlar = ham.map(u => u.diaData?.stokkartkodu).filter(Boolean).slice(0, 120).join(',');
            const token = localStorage.getItem('authToken');
            if (kodlar && token) {
                fetch(API_ENDPOINTS.b2b.depoStok(kodlar), { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.json())
                    .then(dRes => {
                        if (!dRes?.success) return;
                        const map = dRes.data as Record<string, { ad: string; adet: number }[]>;
                        setUrunler(prev => (prev || list).map(u => {
                            const rawProduct = ham.find(h => h._key === u.id);
                            const kod = rawProduct?.diaData?.stokkartkodu || '';
                            const warehouses = map[kod];
                            if (!warehouses) return u;
                            return {
                                ...u,
                                stocks: warehouses.map(d => ({ warehouseId: d.ad, warehouseName: d.ad, available: d.adet })),
                            };
                        }));
                    })
                    .catch(() => {});
            }
        });
    }, [kategori]);

    if (products === null) {
        return <p className="note" style={{ padding: '1rem 0' }}>Ürünler yükleniyor…</p>;
    }
    if (products.length === 0) {
        return <p className="note" style={{ padding: '1rem 0' }}>Bu kategoride ürün bulunamadı.</p>;
    }
    return <Catalog products={products} />;
}
