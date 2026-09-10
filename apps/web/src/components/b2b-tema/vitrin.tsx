'use client';
// B2B anasayfa vitrini — panelden yönetilen "1. Vitrin" (theme.showcaseFirst).
// Ürünler public/homepage ucundan gelir; fiyatlar KDV hariç gösterilir.
import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';

interface VitrinUrun {
    _key: string;
    diaData?: { aciklama?: string; stokkartkodu?: string; marka?: string; m_resimler?: { aws_url?: string }[]; m_birimler?: { fiyat4?: string | number }[] };
    customData?: { seoUrl?: string; webPrice?: number; featuredImage?: string };
}

interface Vitrin {
    key: string;
    title: string;
    subtitle: string;
    products: VitrinUrun[];
}

const MEDIA = process.env.NEXT_PUBLIC_MEDIA_URL || '';

function gorsel(u: VitrinUrun): string {
    const f = u.customData?.featuredImage;
    if (f) return f.startsWith('http') || f.startsWith('/') ? f : `${MEDIA}/${f}`;
    const r = u.diaData?.m_resimler?.[0]?.aws_url || '';
    return r || '/lastikjant-logo.png';
}

function fiyatKdvHaric(u: VitrinUrun): string {
    // Vitrin fiyatı KDV hariç (bayi fiyatı) — webPrice / 1.20
    const webPrice = Number(u.customData?.webPrice || 0);
    const haric = webPrice > 0 ? webPrice / 1.2 : 0;
    return haric > 0 ? haric.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' TL' : '';
}

export function Vitrin() {
    const [vitrin, setVitrin] = useState<Vitrin | null>(null);

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
            <div className="vitrin-head">
                <h2>{vitrin.title}</h2>
                {vitrin.subtitle ? <p>{vitrin.subtitle}</p> : null}
            </div>
            <div className="vitrin-grid">
                {vitrin.products.map(u => {
                    const fiyat = fiyatKdvHaric(u);
                    return (
                        <a key={u._key} href={u.customData?.seoUrl ? `/urun/${u.customData.seoUrl}` : '#'} className="vitrin-kart">
                            <div className="vitrin-gorsel">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={gorsel(u)} alt={u.diaData?.aciklama || ''} loading="lazy" />
                            </div>
                            <div className="vitrin-bilgi">
                                {u.diaData?.marka ? <span className="vitrin-marka">{u.diaData.marka}</span> : null}
                                <span className="vitrin-ad">{u.diaData?.aciklama || ''}</span>
                                {fiyat ? (
                                    <span className="vitrin-fiyat">
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
