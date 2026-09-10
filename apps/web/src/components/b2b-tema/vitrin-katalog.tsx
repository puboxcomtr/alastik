'use client';
// Sıfır Lastik / 2.El sekmeli katalog — ürünler PANELDEN yönetilen vitrinden gelir
// (theme.showcaseFirst). Vitrin ürünleri (DIA) tema tablosunun Lastik formatına
// dönüştürülüp mevcut Katalog bileşenine beslenir.
import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';
import { Katalog } from '@components/b2b-tema/katalog';
import type { Lastik, Mevsim, UrunDurumu } from '@components/b2b-tema/lib/ornek-veri';

export interface HamUrun {
    _key: string;
    diaData?: {
        stokkartkodu?: string;
        aciklama?: string;
        marka?: string;
        gercek_stok?: number;
        ozelkod1kodu?: string; // mevsim
        ozelkod3kodu?: string; // ebat
        ozelkod5kodu?: string; // desen/model
        ekalan5?: string; // üretim yılı (DOT) — sıfır ve 2.El lastikte dolu, ör. "2026"
        m_kategoriler?: { kategori_aciklama_1?: string }[];
        m_resimler?: { aws_url?: string }[];
        m_birimler?: { fiyat4?: string | number }[];
    };
    customData?: { seoUrl?: string; webPrice?: number; shippingIncludedPrice?: number; featuredImage?: string };
}

const MEVSIM_MAP: Record<string, Mevsim> = {
    '4 Mevsim': 'dortMevsim',
    'Yaz': 'yaz',
    'Kış': 'kis',
    'Kis': 'kis',
};

function mevsimCoz(kod?: string): Mevsim {
    if (!kod) return 'yaz';
    if (MEVSIM_MAP[kod]) return MEVSIM_MAP[kod];
    const k = kod.toLocaleLowerCase('tr');
    if (k.includes('4') || k.includes('mevsim')) return 'dortMevsim';
    if (k.includes('kış') || k.includes('kis')) return 'kis';
    return 'yaz';
}

function ikinciElMi(u: HamUrun): boolean {
    return (u.diaData?.m_kategoriler || []).some(k => String(k?.kategori_aciklama_1 || '').startsWith('İkinci El'));
}

// DOT (üretim yılı): DIA'da ekalan5 alanında dört haneli yıl olarak tutulur
// (hem sıfır hem 2.El lastikte dolu, ör. "2026"). ekalan5 boşsa 2.El ürün
// adındaki parantez içi yıla ("... (2022)") düşülür. Bulunamazsa null.
function dotYiliCoz(u: HamUrun): number | null {
    const ek = String(u.diaData?.ekalan5 || '').trim();
    if (/^(19|20)\d{2}$/.test(ek)) return parseInt(ek, 10);
    const m = String(u.diaData?.aciklama || '').match(/\((19|20)\d{2}\)/);
    if (!m) return null;
    const yil = parseInt(m[0].replace(/[()]/g, ''), 10);
    return Number.isFinite(yil) ? yil : null;
}

// Türkçe normalize: marka adı eşleştirmesi için (Lassa ↔ LASSA ↔ LASSA)
export function normMarka(s: string): string {
    return String(s || '')
        .toLocaleLowerCase('tr')
        .replace(/İ/g, 'i').replace(/ı/g, 'i')
        .replace(/[^a-z0-9]/g, '');
}

export function hamToLastik(u: HamUrun, markaLogo: Record<string, string>): Lastik {
    // Fiyat kaynağı: XML üründe webPrice, kendi DIA ürünümüzde m_birimler[0].fiyat4
    // (satış fiyatı). Değer KDV dahil kabul edilir; KDV hariç net = /1.2.
    const satisFiyat = Number(u.customData?.webPrice)
        || Number(u.diaData?.m_birimler?.[0]?.fiyat4)
        || 0;
    const netKurus = satisFiyat > 0 ? Math.round((satisFiyat / 1.2) * 100) : 0;
    const kdvDahilKurus = satisFiyat > 0 ? Math.round(satisFiyat * 100) : 0;
    const stok = Number(u.diaData?.gercek_stok || 0);
    const durum: UrunDurumu = ikinciElMi(u) ? 'ikinciEl' : 'sifir';
    const ad = u.diaData?.aciklama || '';

    const markaAdi = u.diaData?.marka || '';
    const logo = markaLogo[normMarka(markaAdi)] || null;

    return {
        id: u._key,
        stokKodu: (u.diaData?.stokkartkodu || u._key).replace(/-XML$/i, ''),
        marka: markaAdi,
        markaLogoUrl: logo && !logo.includes('gorsel-bulunamadi') ? logo : null,
        ebat: u.diaData?.ozelkod3kodu || '',
        desen: u.diaData?.ozelkod5kodu || ad,
        // Tam ürün adı: DIA açıklaması (marka baştaysa çıkarılır; marka ayrı sütunda logo).
        tamAd: ad
            ? ad.replace(new RegExp('^\\s*' + markaAdi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim() || ad
            : null,
        yukHizEndeksi: null,
        mevsim: mevsimCoz(u.diaData?.ozelkod1kodu),
        dotYili: dotYiliCoz(u),
        urunDurumu: durum,
        rft: /\brft\b/i.test(ad),
        cTipi: /\bC\b/.test(ad),
        ev: /\bEV\b/i.test(ad),
        xl: /\bXL\b/i.test(ad),
        gorselUrl: u.customData?.featuredImage || u.diaData?.m_resimler?.[0]?.aws_url || null,
        stoklar: [{ warehouseId: 'merkez', depoAd: 'Merkez', kullanilabilir: stok }],
        fiyat: netKurus > 0
            ? { listeBirimKurus: kdvDahilKurus, birimNetKurus: netKurus, kdvDahilBirimKurus: kdvDahilKurus, fiyatKaynagi: 'liste' }
            : null,
    };
}

export function VitrinKatalog() {
    const [urunler, setUrunler] = useState<Lastik[] | null>(null);

    useEffect(() => {
        // Marka logoları ve vitrin ürünleri paralel çekilir
        Promise.all([
            fetch(API_ENDPOINTS.b2b.brands(), { headers: { 'X-Site': 'b2b' } }).then(r => r.json()).catch(() => null),
            fetch(API_ENDPOINTS.showcases.homepage(), { headers: { 'X-Site': 'b2b' } }).then(r => r.json()).catch(() => null),
        ]).then(([markaRes, vitrinRes]) => {
            const markaLogo: Record<string, string> = {};
            const markalar = markaRes?.data || markaRes?.brands || [];
            for (const m of markalar) {
                if (m?.name && m?.logo) markaLogo[normMarka(m.name)] = m.logo;
                if (m?.diaBrand && m?.logo) markaLogo[normMarka(m.diaBrand)] = m.logo;
            }
            // Tüm vitrinlerin (Sıfır + 2.El) ürünleri birleştirilir; ürün durumu
            // (sıfır/2.El) render aşamasında ayrılır. Aynı ürün iki vitrinde varsa
            // _key ile tekilleştirilir.
            const vitrinler = vitrinRes?.success && Array.isArray(vitrinRes.data) ? vitrinRes.data : [];
            const gorulen = new Set<string>();
            const ham: HamUrun[] = [];
            for (const v of vitrinler) {
                for (const p of (v?.products || [])) {
                    if (p?._key && !gorulen.has(p._key)) { gorulen.add(p._key); ham.push(p); }
                }
            }
            const list = ham.map(u => hamToLastik(u, markaLogo));
            setUrunler(list);

            // Depo bazlı stok (Maslak/Şişli/Fabrika) — tooltip için ayrıca çekilir
            const kodlar = ham.map(u => u.diaData?.stokkartkodu).filter(Boolean).join(',');
            const token = localStorage.getItem('authToken');
            if (kodlar && token) {
                fetch(API_ENDPOINTS.b2b.depoStok(kodlar), { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.json())
                    .then(dRes => {
                        if (!dRes?.success) return;
                        const map = dRes.data as Record<string, { ad: string; adet: number }[]>;
                        setUrunler(prev => (prev || list).map(u => {
                            const hamUrun = ham.find(h => h._key === u.id);
                            const kod = hamUrun?.diaData?.stokkartkodu || '';
                            const depolar = map[kod];
                            if (!depolar) return u;
                            return {
                                ...u,
                                stoklar: depolar.map(d => ({ warehouseId: d.ad, depoAd: d.ad, kullanilabilir: d.adet })),
                            };
                        }));
                    })
                    .catch(() => {});
            }
        });
    }, []);

    if (urunler === null) {
        return <p className="note" style={{ padding: '1rem 0' }}>Ürünler yükleniyor…</p>;
    }

    // Sekmeli tek katalog: "Sıfır Lastik" sekmesi sıfır ürünleri, "2.El Lastik"
    // sekmesi 2.El ürünleri gösterir (ayrım Katalog içindeki sekmeyle yapılır).
    return <Katalog urunler={urunler} />;
}
