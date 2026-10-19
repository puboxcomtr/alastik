import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { Container } from 'react-bootstrap';
import { getVehicleMake } from '@/src/services/vehicleService';
import tagService from '@/src/services/tagService';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';
import { buildVehicleBrandContent } from '@/src/lib/vehicleBrandText';
import BrandSeoContent from '@/src/components/lastikjantavm/brand/BrandSeoContent';

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

async function resolveSizeLinks<T extends { href?: string; label: string }>(items: T[]): Promise<T[]> {
    const checked = await Promise.all(items.map(async item => {
        if (!item.href || !item.href.startsWith('/etiket/')) return item;
        try {
            const tag = await tagService.getTagBySlug(item.href.replace('/etiket/', ''));
            return tag && (tag.productCount ?? 1) > 0 ? item : { ...item, href: undefined };
        } catch {
            return { ...item, href: undefined };
        }
    }));
    return checked;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const d = await load(params);
    if (!d) return {};
    const content = buildVehicleBrandContent(d);
    const indexable = d.models.some(m => m.indexable);
    return {
        title: content.title,
        description: content.description,
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

    const content = buildVehicleBrandContent(d);
    const sizeSection = content.sections.find(s => s.id === 'ebatlar');
    if (sizeSection?.list) sizeSection.list = await resolveSizeLinks(sizeSection.list);
    content.sizeLinks = (await resolveSizeLinks(content.sizeLinks)).filter(l => l.href) as typeof content.sizeLinks;

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
                <h1 className="fs-3 fw-bold mb-2">{content.h1}</h1>
                {content.intro.map((t, i) => <p key={i} className={i === content.intro.length - 1 ? 'mb-4' : 'mb-2'}>{t}</p>)}
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
                <BrandSeoContent
                    content={{ ...content, intro: [] }}
                    display={content.display}
                    seriesTitle={`${content.display} Modelleri`}
                    sizesTitle={`${content.display} Lastik Ebatları`}
                />
            </Container>
        </section>
    );
}
