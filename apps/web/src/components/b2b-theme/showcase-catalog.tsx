'use client';
import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';
import { Catalog } from '@components/b2b-theme/catalog';
import { SpinnerIcon } from '@components/b2b-theme/icons';
import { fetchDepotStocks } from '@components/b2b-theme/lib/depot-stock';
import type { Tire, Season, ProductStatus } from '@components/b2b-theme/lib/sample-data';

export interface RawProduct {
    _key: string;
    diaData?: {
        stokkartkodu?: string;
        aciklama?: string;
        marka?: string;
        gercek_stok?: number;
        ozelkod1kodu?: string;
        ozelkod3kodu?: string;
        ozelkod5kodu?: string;
        ozelkod7kodu?: string;
        ekalan5?: string;
        m_kategoriler?: { kategori_aciklama_1?: string }[];
        m_resimler?: { aws_url?: string; order_id?: string | number }[];
        m_birimler?: { fiyat1?: string | number; fiyat4?: string | number; fiyat4Ham?: string | number }[];
        m_urunOzellikleri?: { ozellikadi?: string; detayaciklama?: string }[];
    };
    customData?: { seoUrl?: string; webPrice?: number; shippingIncludedPrice?: number; featuredImage?: string; delivery?: string };
    syncInfo?: { syncSource?: string };
    perakendeKurus?: number | null;
}

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

function resolveDotYear(u: RawProduct): number | null {
    const ek = String(u.diaData?.ekalan5 || '').trim();
    if (/^(19|20)\d{2}$/.test(ek)) return parseInt(ek, 10);
    const m = String(u.diaData?.aciklama || '').match(/\((19|20)\d{2}\)/);
    if (!m) return null;
    const yil = parseInt(m[0].replace(/[()]/g, ''), 10);
    return Number.isFinite(yil) ? yil : null;
}

export function normalizeBrand(s: string): string {
    return String(s || '')
        .toLocaleLowerCase('tr')
        .replace(/İ/g, 'i').replace(/ı/g, 'i')
        .replace(/[^a-z0-9]/g, '');
}

export type CariOran = { tanimlifiyat?: number; fiyatyuzde?: number };

function sortByOrder(images?: { aws_url?: string; order_id?: string | number }[]): { aws_url?: string; order_id?: string | number }[] {
  return [...(images || [])].sort((a, b) => (Number(a.order_id) || 99) - (Number(b.order_id) || 99));
}

export function mergeDepotStocks(u: Tire, warehouses: { ad: string; adet: number }[]): Tire {
    const own = u.stocks[0];
    const prevTotal = u.stocks.reduce((s, st) => s + st.available, 0);
    const depotSum = warehouses.reduce((s, d) => s + d.adet, 0);
    const stocks = warehouses.map(d => ({ warehouseId: d.ad, warehouseName: d.ad, available: d.adet }));
    if (own && prevTotal > depotSum) {
        const rest = prevTotal - depotSum;
        const same = stocks.find(st => st.warehouseName.toLocaleLowerCase('tr') === own.warehouseName.toLocaleLowerCase('tr'));
        if (same) same.available += rest;
        else stocks.push({ warehouseId: own.warehouseId, warehouseName: own.warehouseName, available: rest });
    }
    return { ...u, stocks };
}

export function rawToTire(u: RawProduct, brandLogo: Record<string, string>, cariOran?: CariOran): Tire {
    const xmlKaynak = u.syncInfo?.syncSource === 'xml_integration'
        || /-XML$/i.test(u.diaData?.stokkartkodu || '');
    const b2cOran = parseFloat(String(u.diaData?.birimindirimorani || '').replace(/[^0-9.]/g, ''))
        || Number(u.diaData?.b2c_indirimorani) || 0;
    const fiyat4 = Number(u.diaData?.m_birimler?.[0]?.fiyat4Ham) || Number(u.diaData?.m_birimler?.[0]?.fiyat4) || 0;
    const oranSifir = !xmlKaynak && (b2cOran === 0 || isSecondHand(u)) && fiyat4 > 0;
    const oran = (Number(cariOran?.fiyatyuzde) > 0 ? Number(cariOran?.fiyatyuzde) : 50) / 100;
    const listeFiyat = xmlKaynak
        ? (Number(u.customData?.webPrice) || 0)
        : (Number(u.diaData?.m_birimler?.[0]?.fiyat1) || 0);
    const satisFiyat = xmlKaynak
        ? listeFiyat
        : (oranSifir ? fiyat4 : Math.round(listeFiyat * oran * 100) / 100);
    const netKurus = satisFiyat > 0 ? Math.round((satisFiyat / 1.2) * 100) : 0;
    const kdvDahilKurus = satisFiyat > 0 ? Math.round(satisFiyat * 100) : 0;
    const listeKurus = oranSifir ? kdvDahilKurus : (listeFiyat > 0 ? Math.round(listeFiyat * 100) : kdvDahilKurus);
    const stok = Number(u.diaData?.gercek_stok || 0);
    const isXmlProduct = u.syncInfo?.syncSource === 'xml_integration';
    const durum: ProductStatus = isSecondHand(u) ? 'ikinciEl' : 'sifir';
    const ad = u.diaData?.aciklama || '';

    const brandName = u.diaData?.marka || '';
    const logo = brandLogo[normalizeBrand(brandName)] || null;

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
        fullName: ad
            ? ad.replace(new RegExp('^\\s*' + brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), '').trim() || ad
            : null,
        loadSpeedIndex: null,
        mevsim: resolveSeason(u.diaData?.ozelkod1kodu),
        dotYear: resolveDotYear(u),
        productStatus: durum,
        productType: u.diaData?.ozelkod7kodu || '',
        diaStockCode: u.diaData?.stokkartkodu || '',
        rft: /\brft\b/i.test(ad),
        cTipi: /\bC\b/.test(ad),
        ev: /\bEV\b/i.test(ad),
        xl: /\bXL\b/i.test(ad),
        imageUrl: u.customData?.featuredImage || sortByOrder(u.diaData?.m_resimler)[0]?.aws_url || null,
        images: sortByOrder(u.diaData?.m_resimler).map(r => r.aws_url).filter((x): x is string => Boolean(x)),
        xml: xmlKaynak,
        sevkiyat: resolveShipping(u),
        slug: u.customData?.seoUrl || (u.diaData?.stokkartkodu || u._key),
        stocks: [{
            warehouseId: isXmlProduct ? 'fabrika' : 'merkez',
            warehouseName: isXmlProduct ? 'Fabrika' : 'Merkez',
            available: stok,
        }],
        fiyat: netKurus > 0
            ? { listeBirimKurus: listeKurus, birimNetKurus: netKurus, kdvDahilBirimKurus: kdvDahilKurus, priceSource: 'liste', kdvHaric: oranSifir }
            : null,
        perakendeKurus: (typeof u.perakendeKurus === 'number' && u.perakendeKurus > 0) ? u.perakendeKurus : null,
    };
}

export function ShowcaseCatalog() {
    const [products, setUrunler] = useState<Tire[] | null>(null);

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        Promise.all([
            fetch(API_ENDPOINTS.b2b.brands(), { headers: { 'X-Site': 'b2b' } }).then(r => r.json()).catch(() => null),
            fetch(API_ENDPOINTS.showcases.homepage(), { headers: { 'X-Site': 'b2b' } }).then(r => r.json()).catch(() => null),
            token ? fetch(API_ENDPOINTS.b2b.fiyatOrani(), { headers: { Authorization: `Bearer ${token}`, 'X-Site': 'b2b' } }).then(r => r.json()).catch(() => null) : Promise.resolve(null),
        ]).then(([brandRes, showcaseRes, oranRes]) => {
            const cariOran: CariOran | undefined = (oranRes?.success && oranRes.data) ? oranRes.data : undefined;
            const brandLogo: Record<string, string> = {};
            const brands = brandRes?.data || brandRes?.brands || [];
            for (const m of brands) {
                if (m?.name && m?.logo) brandLogo[normalizeBrand(m.name)] = m.logo;
                if (m?.diaBrand && m?.logo) brandLogo[normalizeBrand(m.diaBrand)] = m.logo;
            }
            const showcases = showcaseRes?.success && Array.isArray(showcaseRes.data) ? showcaseRes.data : [];
            const gorulen = new Set<string>();
            const raw: RawProduct[] = [];
            for (const v of showcases) {
                for (const p of (v?.products || [])) {
                    if (p?._key && !gorulen.has(p._key)) { gorulen.add(p._key); raw.push(p); }
                }
            }
            const list = raw.map(u => rawToTire(u, brandLogo, cariOran));
            setUrunler(list);

            const kodlar = raw.map(u => u.diaData?.stokkartkodu).filter(Boolean) as string[];
            fetchDepotStocks(kodlar).then(map => {
                if (!map) return;
                setUrunler(prev => (prev || list).map(u => {
                    const rawProduct = raw.find(h => h._key === u.id);
                    const kod = rawProduct?.diaData?.stokkartkodu || '';
                    const warehouses = map[kod];
                    return warehouses ? mergeDepotStocks(u, warehouses) : u;
                }));
            });
        });
    }, []);

    if (products === null) {
        return (
            <p className="note loading-row" style={{ padding: '1rem 0' }}>
                <SpinnerIcon size={18} className="loading-brand" /> Ürünler yükleniyor…
            </p>
        );
    }

    return <Catalog products={products} />;
}
