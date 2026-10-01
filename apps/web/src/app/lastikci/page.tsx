// İl listesi — /lastikci (yalnızca lastikjantavm.com)
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { Container } from 'react-bootstrap';
import { ILLER } from '@/src/lib/geo';
import { getMontagePoints } from '@/src/lib/locationData';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';

const isLja = () => (headers().get('x-site') || 'alastik') === 'lastikjantavm';

export async function generateMetadata(): Promise<Metadata> {
    if (!isLja()) return {};
    return {
        title: 'İl İl Lastikçi ve Lastik Montaj Noktaları | LastikJantAVM',
        description: 'Türkiye’nin 81 ilinde lastik siparişi ve montaj: ilinizi seçin, en yakın montaj noktalarını ve bölgenizde tercih edilen lastik ebatlarını görün.',
        ...(await canonicalMeta('/lastikci'))
    };
}

export default async function CitiesPage() {
    if (!isLja()) notFound();
    const [points, origin] = await Promise.all([getMontagePoints(), getSiteOrigin()]);
    const counts = new Map<string, number>();
    for (const p of points) counts.set(p.city.toLocaleLowerCase('tr-TR'), (counts.get(p.city.toLocaleLowerCase('tr-TR')) || 0) + 1);
    const cities = [...ILLER].sort((a, b) => a.name.localeCompare(b.name, 'tr'));

    return (
        <section className="py-4">
            <JsonLd data={breadcrumbJsonLd(origin, [{ name: 'Lastikçi' }])} />
            <Container>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Ana Sayfa</Link></li>
                        <li className="breadcrumb-item active" aria-current="page">Lastikçi</li>
                    </ol>
                </nav>
                <h1 className="fs-3 fw-bold mb-2">İl İl Lastikçi ve Montaj Noktaları</h1>
                <p className="mb-4">
                    LastikJantAVM’den aldığınız lastikleri Türkiye genelindeki anlaşmalı montaj noktalarında taktırabilirsiniz.
                    İlinizi seçerek size en yakın noktaları ve bölgenizde öne çıkan lastik ebatlarını görün.
                </p>
                <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-2">
                    {cities.map(c => {
                        const n = counts.get(c.name.toLocaleLowerCase('tr-TR')) || 0;
                        return (
                            <div key={c.id} className="col">
                                <Link href={`/lastikci/${c.slug}`} className="text-black">{c.name}</Link>
                                {n > 0 && <span className="small text-muted">{` (${n} nokta)`}</span>}
                            </div>
                        );
                    })}
                </div>
            </Container>
        </section>
    );
}
