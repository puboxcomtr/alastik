// Araca göre lastik — /arac (yalnızca lastikjantavm.com): tüm markalar
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { Container } from 'react-bootstrap';
import { getVehicleMakes } from '@/src/services/vehicleService';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';

const isLja = () => (headers().get('x-site') || 'alastik') === 'lastikjantavm';

export async function generateMetadata(): Promise<Metadata> {
    if (!isLja()) return {};
    return {
        title: 'Araca Göre Lastik, Jant ve Kar Zinciri – Marka ve Model Seçin | LastikJantAVM',
        description: 'Aracınızın markasını ve modelini seçin; orijinal lastik ebatlarını, jant bijon ölçüsünü ve uyumlu lastik, jant, kar zinciri seçeneklerini görün.',
        ...(await canonicalMeta('/arac'))
    };
}

export default async function VehicleMakesPage() {
    if (!isLja()) notFound();
    const makes = (await getVehicleMakes()) || [];
    const origin = await getSiteOrigin();
    const popular = [...makes].filter(m => m.indexableModelCount > 0).sort((a, b) => b.tireStock - a.tireStock).slice(0, 24);

    return (
        <section className="py-4">
            <JsonLd data={breadcrumbJsonLd(origin, [{ name: 'Araca Göre Lastik' }])} />
            <Container>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Ana Sayfa</Link></li>
                        <li className="breadcrumb-item active" aria-current="page">Araca Göre Lastik</li>
                    </ol>
                </nav>
                <h1 className="fs-3 fw-bold mb-2">Araca Göre Lastik, Jant ve Kar Zinciri</h1>
                <p className="mb-4">
                    Markanızı ve modelinizi seçin; aracınızın fabrika çıkışı lastik ebatlarını, jant bijon ölçüsünü ve
                    stoğumuzdaki uyumlu lastik, jant, kar zinciri, kar paleti ve kar çorabı seçeneklerini görün.
                </p>
                {popular.length > 0 && (
                    <>
                        <h2 className="fs-5 fw-bold mb-3">Popüler Markalar</h2>
                        <div className="d-flex flex-wrap gap-2 mb-4">
                            {popular.map(m => (
                                <Link key={m.makeSlug} href={`/arac/${m.makeSlug}`} className="btn btn-dark btn-sm">{m.makeName}</Link>
                            ))}
                        </div>
                    </>
                )}
                <h2 className="fs-5 fw-bold mb-3">Tüm Markalar</h2>
                <div className="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-2">
                    {makes.map(m => (
                        <div key={m.makeSlug} className="col">
                            <Link href={`/arac/${m.makeSlug}`} className="text-black">{m.makeName}</Link>
                            <span className="small text-muted"> ({m.modelCount})</span>
                        </div>
                    ))}
                </div>
            </Container>
        </section>
    );
}
