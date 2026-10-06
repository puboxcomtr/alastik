// Araç markası sayfası — /arac/<marka> (yalnızca lastikjantavm.com): markanın modelleri ve lastik ebatları
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { Container } from 'react-bootstrap';
import { getVehicleMake } from '@/src/services/vehicleService';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';

interface Props {
    params: Promise<{ marka: string }>;
}

const isLja = () => (headers().get('x-site') || 'alastik') === 'lastikjantavm';
const years = (a?: number, b?: number) => (a && b ? (a === b ? `${a}` : `${a}–${b}`) : a ? `${a}+` : '');

async function load(params: Props['params']) {
    const { marka } = await params;
    if (!isLja()) return null;
    return getVehicleMake(marka);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const d = await load(params);
    if (!d) return {};
    const indexable = d.models.some(m => m.indexable);
    const examples = d.models.filter(m => m.indexable).slice(0, 4).map(m => m.modelName).join(', ');
    return {
        title: `${d.makeName} Lastik Ebatları ve Uyumlu Jant – Modele Göre | LastikJantAVM`,
        description: `${d.makeName} modellerinin orijinal lastik ebatları, bijon ölçüleri ve uyumlu lastik, jant, kar zinciri seçenekleri${examples ? `: ${examples} ve diğerleri` : ''}.`,
        ...(await canonicalMeta(`/arac/${d.makeSlug}`)),
        ...(indexable ? {} : { robots: { index: false, follow: true } })
    };
}

export default async function VehicleMakePage({ params }: Props) {
    const d = await load(params);
    if (!d) notFound();
    const origin = await getSiteOrigin();
    const withStock = d.models.filter(m => m.indexable);
    const others = d.models.filter(m => !m.indexable);

    const ModelCard = ({ m }: { m: typeof d.models[number] }) => (
        <div className="col">
            <div className="card border-0 shadow-sm rounded-3 h-100">
                <div className="card-body p-3">
                    <h3 className="fs-6 fw-bold mb-1">
                        <Link href={`/arac/${m.makeSlug}/${m.modelSlug}`} className="text-black">
                            {d.makeName} {m.modelName}
                        </Link>
                    </h3>
                    {m.yearFrom && <div className="small text-muted mb-1">{years(m.yearFrom, m.yearTo)}</div>}
                    {m.oeTireSizes.length > 0 && <div className="small">Lastik: {m.oeTireSizes.slice(0, 3).join(', ')}</div>}
                    {m.boltPatterns.length > 0 && <div className="small">Bijon: {m.boltPatterns.join(', ')}</div>}
                </div>
            </div>
        </div>
    );

    return (
        <section className="py-4">
            <JsonLd data={breadcrumbJsonLd(origin, [{ name: 'Araca Göre Lastik', path: '/arac' }, { name: d.makeName }])} />
            <Container>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Ana Sayfa</Link></li>
                        <li className="breadcrumb-item"><Link href="/arac">Araca Göre Lastik</Link></li>
                        <li className="breadcrumb-item active" aria-current="page">{d.makeName}</li>
                    </ol>
                </nav>
                <h1 className="fs-3 fw-bold mb-2">{`${d.makeName} Lastik Ebatları, Uyumlu Jant ve Kar Zinciri`}</h1>
                <p className="mb-4">
                    {d.makeName} için {d.models.length} modelin orijinal lastik ebatlarını, jant bijon ölçülerini ve
                    uyumlu kar ekipmanını listeledik. Modelinizi seçerek nesil ve motor bazında ölçüleri ve stoğumuzdaki
                    uygun ürünleri görebilirsiniz.
                </p>
                {withStock.length > 0 && (
                    <>
                        <h2 className="fs-5 fw-bold mb-3">{d.makeName} Modelleri</h2>
                        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3 mb-4">
                            {withStock.map(m => <ModelCard key={m.modelSlug} m={m} />)}
                        </div>
                    </>
                )}
                {others.length > 0 && (
                    <>
                        <h2 className="fs-5 fw-bold mb-3">{withStock.length ? `Diğer ${d.makeName} Modelleri` : `${d.makeName} Modelleri`}</h2>
                        <div className="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3">
                            {others.map(m => <ModelCard key={m.modelSlug} m={m} />)}
                        </div>
                    </>
                )}
            </Container>
        </section>
    );
}
