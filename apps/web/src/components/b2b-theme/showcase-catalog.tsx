'use client';
// Sıfır Lastik / 2.El sekmeli katalog — ürünler PANELDEN yönetilen vitrinden gelir
// (theme.showcaseFirst). Vitrin ürünleri (DIA) tema tablosunun Lastik formatına
// dönüştürülüp mevcut Katalog bileşenine beslenir.
import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';
import { Catalog } from '@components/b2b-theme/catalog';
import { SpinnerIcon } from '@components/b2b-theme/icons';
import type { Tire, Season, ProductStatus } from '@components/b2b-theme/lib/sample-data';

export interface RawProduct {
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
        m_birimler?: { fiyat4?: string | number; fiyat4Ham?: string | number }[];
        m_urunOzellikleri?: { ozellikadi?: string; detayaciklama?: string }[];
    };
    customData?: { seoUrl?: string; webPrice?: number; shippingIncludedPrice?: number; featuredImage?: string; delivery?: string };
    syncInfo?: { syncSource?: string };
}

// Sevkiyat süresi: kendi stoğumuz (DIA, XML değil) her zaman "Aynı Gün". XML
// ürünlerde kendi sevkiyat alanı (customData.delivery) esas alınır; alan
// dolu değilse (varsayılan same_day dahil) tedarikçi ürünü için "1-2 Gün".
function resolveShipping(u: RawProduct): string {
    const isXml = u.syncInfo?.syncSource === 'xml_integration';
    if (!isXml) return 'Aynı Gün';
    if (u.customData?.delivery === 'next_week') return '3-5 Gün';
    return '1-2 Gün';
}

const SEASON_MAP: Record<string, Season> = {
    '4 Mevsim': 'dortMevsim',
    'Yaz': 'yaz',
    'Kış': 'kis',
    'Kis': 'kis',
};

function resolveSeason(kod?: string): Season {
    if (!kod) return 'yaz';
    if (SEASON_MAP[kod]) return SEASON_MAP[kod];
    const k = kod.toLocaleLowerCase('tr');
    if (k.includes('4') || k.includes('mevsim')) return 'dortMevsim';
    if (k.includes('kış') || k.includes('kis')) return 'kis';
    return 'yaz';
}

function isSecondHand(u: RawProduct): boolean {
    return (u.diaData?.m_kategoriler || []).some(k => String(k?.kategori_aciklama_1 || '').startsWith('İkinci El'));
}

// DOT (üretim yılı): DIA'da ekalan5 alanında dört haneli yıl olarak tutulur
// (hem sıfır hem 2.El lastikte dolu, ör. "2026"). ekalan5 boşsa 2.El ürün
// adındaki parantez içi yıla ("... (2022)") düşülür. Bulunamazsa null.
function resolveDotYear(u: RawProduct): number | null {
    const ek = String(u.diaData?.ekalan5 || '').trim();
    if (/^(19|20)\d{2}$/.test(ek)) return parseInt(ek, 10);
    const m = String(u.diaData?.aciklama || '').match(/\((19|20)\d{2}\)/);
    if (!m) return null;
    const yil = parseInt(m[0].replace(/[()]/g, ''), 10);
    return Number.isFinite(yil) ? yil : null;
}

// Türkçe normalize: marka adı eşleştirmesi için (Lassa ↔ LASSA ↔ LASSA)
export function normalizeBrand(s: string): string {
    return String(s || '')
        .toLocaleLowerCase('tr')
        .replace(/İ/g, 'i').replace(/ı/g, 'i')
        .replace(/[^a-z0-9]/g, '');
}

export function rawToTire(u: RawProduct, brandLogo: Record<string, string>): Tire {
    // Fiyat kaynağı: XML üründe webPrice; kendi DIA ürünümüzde F4 TOPTAN fiyatı
    // = m_birimler[0].fiyat4Ham (DIA ham fiyat4). fiyat4 alanı ALastik/B2C için
    // __dinamik__16 ile ezilir; b2b/toptan ham fiyatı kullanmalı. Ham yoksa
    // (henüz senkronlanmadıysa) fiyat4'e düşülür. Değer KDV dahil; net = /1.2.
    const satisFiyat = Number(u.customData?.webPrice)
        || Number(u.diaData?.m_birimler?.[0]?.fiyat4Ham)
        || Number(u.diaData?.m_birimler?.[0]?.fiyat4)
        || 0;
    const netKurus = satisFiyat > 0 ? Math.round((satisFiyat / 1.2) * 100) : 0;
    const kdvDahilKurus = satisFiyat > 0 ? Math.round(satisFiyat * 100) : 0;
    const stok = Number(u.diaData?.gercek_stok || 0);
    // XML (tedarikçi) ürünlerinin fiziksel deposu yok; stok "Fabrika" olarak
    // etiketlenir (kendi stokta "Merkez"; canlı depo verisi gelince değişir).
    const isXmlProduct = u.syncInfo?.syncSource === 'xml_integration';
    const durum: ProductStatus = isSecondHand(u) ? 'ikinciEl' : 'sifir';
    const ad = u.diaData?.aciklama || '';

    const brandName = u.diaData?.marka || '';
    const logo = brandLogo[normalizeBrand(brandName)] || null;

    // AB Lastik Etiketi — DIA ürün özelliklerinden (boş olanlar atlanır)
    const ozellik = (ad2: string): string => {
        const v = (u.diaData?.m_urunOzellikleri || [])
            .find(o => (o.ozellikadi || '').trim() === ad2)?.detayaciklama;
        return String(v || '').trim();
    };
    const label = {
        yolTutus: ozellik('Islak Zeminde Frenleme'),
        yakit: ozellik('Yakıt Verimliliği'),
        gurultu: ozellik('Gürültü Seviyesi'),
    };
    const hasLabel = Boolean(label.yolTutus || label.yakit || label.gurultu);

    return {
        label: hasLabel ? label : undefined,
        id: u._key,
        stockCode: (u.diaData?.stokkartkodu || u._key).replace(/-XML$/i, ''),
        marka: brandName,
        brandLogoUrl: logo && !logo.includes('gorsel-bulunamadi') ? logo : null,
        size: u.diaData?.ozelkod3kodu || '',
        pattern: u.diaData?.ozelkod5kodu || ad,
        // Tam ürün adı: DIA açıklaması (marka baştaysa çıkarılır; marka ayrı sütunda logo).
        fullName: ad
            ? ad.replace(new RegExp('^\\s*' + brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim() || ad
            : null,
        loadSpeedIndex: null,
        mevsim: resolveSeason(u.diaData?.ozelkod1kodu),
        dotYear: resolveDotYear(u),
        productStatus: durum,
        rft: /\brft\b/i.test(ad),
        cTipi: /\bC\b/.test(ad),
        ev: /\bEV\b/i.test(ad),
        xl: /\bXL\b/i.test(ad),
        imageUrl: u.customData?.featuredImage || u.diaData?.m_resimler?.[0]?.aws_url || null,
        sevkiyat: resolveShipping(u),
        slug: u.customData?.seoUrl || (u.diaData?.stokkartkodu || u._key),
        stocks: [{
            warehouseId: isXmlProduct ? 'fabrika' : 'merkez',
            warehouseName: isXmlProduct ? 'Fabrika' : 'Merkez',
            available: stok,
        }],
        fiyat: netKurus > 0
            ? { listeBirimKurus: kdvDahilKurus, birimNetKurus: netKurus, kdvDahilBirimKurus: kdvDahilKurus, priceSource: 'liste' }
            : null,
    };
}

export function ShowcaseCatalog() {
    const [products, setUrunler] = useState<Tire[] | null>(null);

    useEffect(() => {
        // Marka logoları ve vitrin ürünleri paralel çekilir
        Promise.all([
            fetch(API_ENDPOINTS.b2b.brands(), { headers: { 'X-Site': 'b2b' } }).then(r => r.json()).catch(() => null),
            fetch(API_ENDPOINTS.showcases.homepage(), { headers: { 'X-Site': 'b2b' } }).then(r => r.json()).catch(() => null),
        ]).then(([brandRes, showcaseRes]) => {
            const brandLogo: Record<string, string> = {};
            const brands = brandRes?.data || brandRes?.brands || [];
            for (const m of brands) {
                if (m?.name && m?.logo) brandLogo[normalizeBrand(m.name)] = m.logo;
                if (m?.diaBrand && m?.logo) brandLogo[normalizeBrand(m.diaBrand)] = m.logo;
            }
            // Tüm vitrinlerin (Sıfır + 2.El) ürünleri birleştirilir; ürün durumu
            // (sıfır/2.El) render aşamasında ayrılır. Aynı ürün iki vitrinde varsa
            // _key ile tekilleştirilir.
            const showcases = showcaseRes?.success && Array.isArray(showcaseRes.data) ? showcaseRes.data : [];
            const gorulen = new Set<string>();
            const raw: RawProduct[] = [];
            for (const v of showcases) {
                for (const p of (v?.products || [])) {
                    if (p?._key && !gorulen.has(p._key)) { gorulen.add(p._key); raw.push(p); }
                }
            }
            const list = raw.map(u => rawToTire(u, brandLogo));
            setUrunler(list);

            // Depo bazlı stok (Maslak/Şişli/Fabrika) — tooltip için ayrıca çekilir
            const kodlar = raw.map(u => u.diaData?.stokkartkodu).filter(Boolean).join(',');
            const token = localStorage.getItem('authToken');
            if (kodlar && token) {
                fetch(API_ENDPOINTS.b2b.depoStok(kodlar), { headers: { 'X-Site': 'b2b', Authorization: `Bearer ${token}` } })
                    .then(r => r.json())
                    .then(dRes => {
                        if (!dRes?.success) return;
                        const map = dRes.data as Record<string, { ad: string; adet: number }[]>;
                        setUrunler(prev => (prev || list).map(u => {
                            const rawProduct = raw.find(h => h._key === u.id);
                            const kod = rawProduct?.diaData?.stokkartkodu || '';
                            const warehouses = map[kod];
                            if (!warehouses) return u;
                            // Depo dağılımı gercek_stok'tan azsa (stok listelenmemiş bir depoda),
                            // toplam kaybolmasın diye kalan "Merkez" olarak eklenir.
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
        });
    }, []);

    if (products === null) {
        return (
            <p className="note loading-row" style={{ padding: '1rem 0' }}>
                <SpinnerIcon size={18} className="loading-brand" /> Ürünler yükleniyor…
            </p>
        );
    }

    // Sekmeli tek katalog: "Sıfır Lastik" sekmesi sıfır ürünleri, "2.El Lastik"
    // sekmesi 2.El ürünleri gösterir (ayrım Katalog içindeki sekmeyle yapılır).
    return <Catalog products={products} />;
}
