// LJA footer üstü site içi bağlantılar (server component).
// Ziyaretçiye yalnızca iki küçük, kapalı başlık görünür (<details>); bağlantılar sunucu HTML'inde
// gerçek <a href> olarak bulunur ve arama motorları tarafından taranır. Sayfa görünümünü kalabalıklaştırmaz.
// Araç verisi alınamazsa ilgili bölüm gizlenir; sayfa etkilenmez.
import React from 'react';
import Link from 'next/link';
import { BRANCHES } from '@/src/data/lja/subeler';
import { SERVICE_GROUPS } from '@/src/data/lja/hizmetGruplari';
import { getVehicleMakesSafe, getVehicleIndexSafe } from '@/src/services/vehicleService';
import { ILLER, ISTANBUL_ID, ilcelerOf } from '@/src/lib/geo';

const linkCls = 'text-reset text-decoration-none';
const summaryCls = 'small text-muted';

export default async function SeoLinks() {
    const [makes, models] = await Promise.all([getVehicleMakesSafe(), getVehicleIndexSafe()]);
    const popularMakes = makes
        .filter(m => m.indexableModelCount > 0)
        .sort((a, b) => b.tireStock - a.tireStock)
        .slice(0, 24);
    const popularModels = models
        .filter(m => m.indexable)
        .sort((a, b) => b.tireStock - a.tireStock)
        .slice(0, 30);

    return (
        <nav aria-label="Şubeler, hizmetler ve araçlar" className="container py-2" style={{ fontSize: 12 }}>
            <details className="mb-1">
                <summary className={summaryCls}>Şubelerimiz ve Hizmetlerimiz</summary>
                <div className="pt-2">
                    <Link href="/subeler" className={linkCls}>Şubelerimiz</Link>
                    {BRANCHES.map(b => (
                        <div key={b.slug} className="mt-1">
                            <Link href={`/subeler/${b.slug}`} className={`${linkCls} fw-semibold`}>{b.title}</Link>
                            {': '}
                            {SERVICE_GROUPS.map((g, i) => (
                                <React.Fragment key={g.slug}>
                                    {i > 0 && ' · '}
                                    <Link href={`/subeler/${b.slug}/${g.slug}`} className={linkCls}>{`${b.shortName} ${g.name}`}</Link>
                                </React.Fragment>
                            ))}
                        </div>
                    ))}
                </div>
            </details>
            <details className="mb-1">
                <summary className={summaryCls}>Lastikçi (İl / İlçe)</summary>
                <div className="pt-2">
                    <Link href="/lastikci" className={`${linkCls} fw-semibold`}>Tüm iller</Link>
                    {[...ILLER].sort((a, b) => a.name.localeCompare(b.name, 'tr')).map(c => (
                        <React.Fragment key={c.id}>
                            {' · '}
                            <Link href={`/lastikci/${c.slug}`} className={linkCls}>{c.name}</Link>
                        </React.Fragment>
                    ))}
                    <div className="mt-1">
                        <span className="fw-semibold">İstanbul: </span>
                        {ilcelerOf(ISTANBUL_ID).map((d, i) => (
                            <React.Fragment key={d.id}>
                                {i > 0 && ' · '}
                                <Link href={`/lastikci/istanbul/${d.slug}`} className={linkCls}>{`${d.name} lastikçi`}</Link>
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </details>
            {(popularModels.length > 0 || popularMakes.length > 0) && (
                <details>
                    <summary className={summaryCls}>Araca Göre Lastik</summary>
                    <div className="pt-2">
                        <Link href="/arac" className={`${linkCls} fw-semibold`}>Tüm markalar</Link>
                        {popularMakes.map(m => (
                            <React.Fragment key={m.makeSlug}>
                                {' · '}
                                <Link href={`/arac/${m.makeSlug}`} className={linkCls}>{m.makeName}</Link>
                            </React.Fragment>
                        ))}
                        {popularModels.length > 0 && (
                            <div className="mt-1">
                                {popularModels.map((m, i) => (
                                    <React.Fragment key={`${m.makeSlug}/${m.modelSlug}`}>
                                        {i > 0 && ' · '}
                                        <Link href={`/arac/${m.makeSlug}/${m.modelSlug}`} className={linkCls}>{`${m.makeName} ${m.modelName} lastik`}</Link>
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>
                </details>
            )}
        </nav>
    );
}
