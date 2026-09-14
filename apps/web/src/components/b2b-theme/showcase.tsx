'use client';
// B2B anasayfa vitrini — panelden yönetilen "1. Vitrin" (theme.showcaseFirst).
// Ürünler public/homepage ucundan gelir; fiyatlar KDV hariç gösterilir.
import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';

interface ShowcaseProduct {
    _key: string;
    diaData?: { aciklama?: string; stokkartkodu?: string; marka?: string; m_resimler?: { aws_url?: string }[]; m_birimler?: { fiyat4?: string | number }[] };
    customData?: { seoUrl?: string; webPrice?: number; featuredImage?: string };
}

interface Showcase {
    key: string;
    title: string;
    subtitle: string;
    products: ShowcaseProduct[];
}

const MEDIA = process.env.NEXT_PUBLIC_MEDIA_URL || '';

function gorsel(u: ShowcaseProduct): string {
    const f = u.customData?.featuredImage;
    if (f) return f.startsWith('http') || f.startsWith('/') ? f : `${MEDIA}/${f}`;
    const r = u.diaData?.m_resimler?.[0]?.aws_url || '';
    return r || '/lastikjant-logo.png';
}

function priceExclVat(u: ShowcaseProduct): string {
    // Vitrin fiyatı KDV hariç (bayi fiyatı) — webPrice / 1.20
    const webPrice = Number(u.customData?.webPrice || 0);
    const haric = webPrice > 0 ? webPrice / 1.2 : 0;
    return haric > 0 ? haric.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL' : '';
}

export function Showcase() {
    const [vitrin, setVitrin] = useState<Showcase | null>(null);

    useEffect(() => {
        fetch(API_ENDPOINTS.showcases.homepage(), { headers: { 'X-Site': 'b2b' } })
            .then(r => r.json())
            .then(d => {
                if (d?.success && Array.isArray(d.data) && d.data.length > 0) setVitrin(d.data[0]);
            })
            .catch(() => {});
    }, []);

    if (!vitrin || vitrin.products.length === 0) return null;

    return (
        <section className="vitrin">
            <div className="showcase-head">
                <h2>{vitrin.title}</h2>
                {vitrin.subtitle ? <p>{vitrin.subtitle}</p> : null}
            </div>
            <div className="showcase-grid">
                {vitrin.products.map(u => {
                    const fiyat = priceExclVat(u);
                    return (
                        <a key={u._key} href={u.customData?.seoUrl ? `/urun/${u.customData.seoUrl}` : '#'} className="showcase-card">
                            <div className="showcase-image">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={gorsel(u)} alt={u.diaData?.aciklama || ''} loading="lazy" />
                            </div>
                            <div className="showcase-info">
                                {u.diaData?.marka ? <span className="showcase-brand">{u.diaData.marka}</span> : null}
                                <span className="showcase-name">{u.diaData?.aciklama || ''}</span>
                                {fiyat ? (
                                    <span className="showcase-price">
                                        {fiyat} <small>+ KDV</small>
                                    </span>
                                ) : null}
                            </div>
                        </a>
                    );
                })}
            </div>
        </section>
    );
}
