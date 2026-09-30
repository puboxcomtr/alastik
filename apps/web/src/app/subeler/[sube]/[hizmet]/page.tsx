// LJA şube × hizmet sayfası — /subeler/<sube>/<hizmet> (yalnızca lastikjantavm.com)
// Örn. "Şişli Mecidiyeköy Lastik Tamiri ve Mantar Yama": şubeye özgü metin + canlı fiyat tablosu.
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { Container, Row, Col } from 'react-bootstrap';
import { BRANCHES, getBranch } from '@/src/data/lja/subeler';
import { SERVICE_GROUPS, getServiceGroup } from '@/src/data/lja/hizmetGruplari';
import { getBranchPoint, getGroupServices, branchJsonLd } from '@/src/lib/ljaBranches';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';
import { ACCENT, BranchInfoCard, ServiceTable, GroupLinks } from '@/src/components/lastikjantavm/branch/BranchParts';

interface Props {
    params: Promise<{ sube: string; hizmet: string }>;
}

const isLja = () => (headers().get('x-site') || 'alastik') === 'lastikjantavm';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { sube, hizmet } = await params;
    const branch = getBranch(sube);
    const group = getServiceGroup(hizmet);
    if (!isLja() || !branch || !group) return {};
    return {
        title: `${branch.shortName} ${group.name} Fiyatları | LastikJantAVM`,
        description: `${branch.neighborhood}, ${branch.district} LastikJantAVM şubesinde ${group.name.toLocaleLowerCase('tr-TR')}: ${group.summary} Güncel fiyatlar, adres ve çalışma saatleri.`,
        ...(await canonicalMeta(`/subeler/${branch.slug}/${group.slug}`))
    };
}

export default async function BranchServicePage({ params }: Props) {
    const { sube, hizmet } = await params;
    const branch = getBranch(sube);
    const group = getServiceGroup(hizmet);
    if (!isLja() || !branch || !group) notFound();

    const point = await getBranchPoint(branch);
    if (!point) notFound();

    const rows = await getGroupServices(group, point);
    const origin = await getSiteOrigin();
    const pagePath = `/subeler/${branch.slug}/${group.slug}`;
    const otherBranches = BRANCHES.filter(b => b.slug !== branch.slug);

    // Hizmet + fiyat teklifi (şube sağlayıcı olarak)
    const serviceLd = {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: `${branch.shortName} ${group.name}`,
        serviceType: group.name,
        url: `${origin}${pagePath}`,
        provider: { '@id': `${origin}/subeler/${branch.slug}#sube` },
        areaServed: { '@type': 'City', name: 'İstanbul' },
        ...(rows.some(r => r.price && r.price > 0) ? {
            hasOfferCatalog: {
                '@type': 'OfferCatalog',
                name: `${group.name} Fiyatları`,
                itemListElement: rows.filter(r => r.price && r.price > 0).map(r => ({
                    '@type': 'Offer',
                    itemOffered: { '@type': 'Service', name: r.name },
                    price: r.price!.toFixed(2),
                    priceCurrency: 'TRY'
                }))
            }
        } : {})
    };

    return (
        <section className="py-4">
            <JsonLd data={[
                branchJsonLd(origin, branch, point),
                serviceLd,
                breadcrumbJsonLd(origin, [
                    { name: 'Şubelerimiz', path: '/subeler' },
                    { name: `${branch.shortName} Şubesi`, path: `/subeler/${branch.slug}` },
                    { name: group.name }
                ])
            ]} />
            <Container>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Ana Sayfa</Link></li>
                        <li className="breadcrumb-item"><Link href="/subeler">Şubelerimiz</Link></li>
                        <li className="breadcrumb-item"><Link href={`/subeler/${branch.slug}`}>{branch.shortName} Şubesi</Link></li>
                        <li className="breadcrumb-item active" aria-current="page">{group.name}</li>
                    </ol>
                </nav>

                <h1 className="fs-3 fw-bold mb-3">{branch.shortName} {group.name}</h1>

                <Row className="g-4">
                    <Col lg={8}>
                        {group.text[branch.slug].map((t, i) => <p key={i}>{t}</p>)}

                        <div className="card border-0 shadow-sm rounded-3 my-4">
                            <div className="card-body p-4">
                                <h2 className="fs-5 fw-bold mb-3" style={{ color: ACCENT }}>
                                    {branch.shortName} {group.name} Fiyatları
                                </h2>
                                <ServiceTable rows={rows} />
                                {group.categorySlug && (
                                    <Link href={`/kategori/${group.categorySlug}`} className="d-inline-block mt-3 fw-semibold text-black">
                                        Hizmeti online satın al <i className="ri-arrow-right-line" />
                                    </Link>
                                )}
                            </div>
                        </div>

                        <h2 className="fs-5 fw-bold mt-4 mb-3">{branch.shortName} Şubesindeki Diğer Hizmetler</h2>
                        <GroupLinks branch={branch} groups={SERVICE_GROUPS} currentSlug={group.slug} />

                        {otherBranches.map(b => (
                            <p key={b.slug} className="mt-4 mb-0">
                                Bu hizmeti <Link href={`/subeler/${b.slug}/${group.slug}`} className="fw-semibold text-black">
                                    {b.shortName} şubemizde
                                </Link> de alabilirsiniz.
                            </p>
                        ))}
                    </Col>

                    <Col lg={4}>
                        <div style={{ position: 'sticky', top: 16 }}>
                            <BranchInfoCard branch={branch} point={point} />
                        </div>
                    </Col>
                </Row>
            </Container>
        </section>
    );
}
