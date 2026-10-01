// İstanbul mahalle sayfası — /lastikci/istanbul/<ilce>/<mahalle> (yalnızca lastikjantavm.com)
// En yakın şube (km) + şube hizmetleri, komşu mahalleler. Kalite kapısı: şubeye 7 km'den yakın mahalleler
// dizine açık; diğerleri noindex,follow (sayfa kullanıcıya açık, sitemap dışı).
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { Container, Row, Col } from 'react-bootstrap';
import { ISTANBUL_ID, ilBySlug, ilceBySlug, mahalleBySlug, mahallelerOf, nearest, hasGeo, fmtKm, type Il, type Ilce, type Mahalle } from '@/src/lib/geo';
import { getRegionStats, nearestBranch } from '@/src/lib/locationData';
import { locationIntro } from '@/src/lib/locationText';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';
import { Card, TopSizes, BranchBox, LinkGrid } from '@/src/components/lastikjantavm/location/LocationParts';

interface Props { params: Promise<{ il: string; ilce: string; mahalle: string }> }

const isLja = () => (headers().get('x-site') || 'alastik') === 'lastikjantavm';
const INDEX_BRANCH_KM = 7;

async function load(params: Props['params']): Promise<{ city: Il; dist: Ilce; mah: Mahalle } | null> {
    const { il, ilce, mahalle } = await params;
    if (!isLja()) return null;
    const city = ilBySlug(il);
    if (!city || city.id !== ISTANBUL_ID) return null;
    const dist = ilceBySlug(city.id, ilce);
    const mah = dist ? mahalleBySlug(dist.id, mahalle) : undefined;
    return dist && mah ? { city, dist, mah } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const r = await load(params);
    if (!r) return {};
    const { city, dist, mah } = r;
    const b = hasGeo(mah) ? nearestBranch(mah) : null;
    return {
        title: `${mah.name} Lastikçi – ${dist.name}, İstanbul | LastikJantAVM`,
        description: `${mah.name} (${dist.name}) için lastik montajı, tamiri ve rot balans${b ? `: en yakın şubemiz ${b.branch.shortName}, yaklaşık ${fmtKm(b.km)}` : ''}. Lastik siparişi ve şube hizmet fiyatları.`,
        ...(await canonicalMeta(`/lastikci/${city.slug}/${dist.slug}/${mah.slug}`)),
        ...(b && b.km <= INDEX_BRANCH_KM ? {} : { robots: { index: false, follow: true } })
    };
}

export default async function NeighbourhoodPage({ params }: Props) {
    const r = await load(params);
    if (!r) notFound();
    const { city, dist, mah } = r;

    const [stats, origin] = await Promise.all([getRegionStats(), getSiteOrigin()]);
    const branch = hasGeo(mah) ? nearestBranch(mah) : null;
    const neighbours = hasGeo(mah) ? nearest(mah, mahallelerOf(dist.id), 8, mah) : [];
    const sizes = stats[`d:${dist.id}`]?.topSizes || [];
    const intro = locationIntro({
        seed: `mah/${dist.slug}/${mah.slug}`,
        place: mah.name,
        parent: `${dist.name}, İstanbul`,
        pointCount: 0,
        branch: branch ? { name: branch.branch.shortName, km: branch.km } : undefined,
        topSize: sizes[0]
    });

    return (
        <section className="py-4">
            <JsonLd data={breadcrumbJsonLd(origin, [
                { name: 'Lastikçi', path: '/lastikci' },
                { name: city.name, path: `/lastikci/${city.slug}` },
                { name: dist.name, path: `/lastikci/${city.slug}/${dist.slug}` },
                { name: mah.name }
            ])} />
            <Container>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Ana Sayfa</Link></li>
                        <li className="breadcrumb-item"><Link href="/lastikci">Lastikçi</Link></li>
                        <li className="breadcrumb-item"><Link href={`/lastikci/${city.slug}`}>{city.name}</Link></li>
                        <li className="breadcrumb-item"><Link href={`/lastikci/${city.slug}/${dist.slug}`}>{dist.name}</Link></li>
                        <li className="breadcrumb-item active" aria-current="page">{mah.name}</li>
                    </ol>
                </nav>
                <h1 className="fs-3 fw-bold mb-3">{`${mah.name} Lastikçi – ${dist.name}`}</h1>
                <Row className="g-4">
                    <Col lg={8}>
                        {intro.map((t, i) => <p key={i}>{t}</p>)}
                        {branch && <BranchBox branch={branch.branch} km={branch.km} placeName={mah.name} />}
                        <TopSizes sizes={sizes} regionName={dist.name} />
                    </Col>
                    <Col lg={4}>
                        {neighbours.length > 0 && (
                            <Card title="Yakın Mahalleler">
                                <LinkGrid links={neighbours.map(n => ({ href: `/lastikci/${city.slug}/${dist.slug}/${n.slug}`, label: n.name, extra: fmtKm(n.km) }))} />
                            </Card>
                        )}
                        <Link href={`/lastikci/${city.slug}/${dist.slug}`} className="text-black">{`${dist.name} geneli`} <i className="ri-arrow-right-line" /></Link>
                    </Col>
                </Row>
            </Container>
        </section>
    );
}
