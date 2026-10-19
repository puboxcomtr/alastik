import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { Container, Row, Col } from 'react-bootstrap';
import { ISTANBUL_ID, ilBySlug, ilceBySlug, ilcelerOf, mahallelerOf, nearest, hasGeo, fmtKm, type Il, type Ilce } from '@/src/lib/geo';
import { getMontagePoints, getRegionStats, nearestPoints, nearestBranch } from '@/src/lib/locationData';
import { locationIntro, winterNote } from '@/src/lib/locationText';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';
import { Card, PointsTable, TopSizes, BranchBox, LinkGrid } from '@/src/components/lastikjantavm/location/LocationParts';

interface Props { params: Promise<{ il: string; ilce: string }> }

const isLja = () => (headers().get('x-site') || 'alastik') === 'lastikjantavm';
const INDEX_POINT_KM = 30;

async function load(params: Props['params']): Promise<{ city: Il; dist: Ilce } | null> {
    const { il, ilce } = await params;
    if (!isLja()) return null;
    const city = ilBySlug(il);
    const dist = city ? ilceBySlug(city.id, ilce) : undefined;
    return city && dist ? { city, dist } : null;
}

async function indexable(city: Il, dist: Ilce) {
    if (city.id === ISTANBUL_ID) return true;
    const [points, stats] = await Promise.all([getMontagePoints(), getRegionStats()]);
    if (stats[`d:${dist.id}`]?.topSizes?.length) return true;
    return hasGeo(dist) && (nearestPoints(dist, points, 1)[0]?.km ?? Infinity) <= INDEX_POINT_KM;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const r = await load(params);
    if (!r) return {};
    const { city, dist } = r;
    return {
        title: `${dist.name} Lastikçi – ${city.name} | Lastik Montajı ve Fiyatları | LastikJantAVM`,
        description: `${dist.name} (${city.name}) için lastik siparişi ve montaj: en yakın montaj noktaları ve uzaklıkları, bölgede tercih edilen lastik ebatları${city.id === ISTANBUL_ID ? ', en yakın şubemiz ve hizmetleri' : ''}.`,
        ...(await canonicalMeta(`/lastikci/${city.slug}/${dist.slug}`)),
        ...((await indexable(city, dist)) ? {} : { robots: { index: false, follow: true } })
    };
}

export default async function DistrictPage({ params }: Props) {
    const r = await load(params);
    if (!r) notFound();
    const { city, dist } = r;

    const [points, stats, origin] = await Promise.all([getMontagePoints(), getRegionStats(), getSiteOrigin()]);
    const isIstanbul = city.id === ISTANBUL_ID;
    const inDist = points.filter(p => p.district && p.district.toLocaleLowerCase('tr-TR') === dist.name.toLocaleLowerCase('tr-TR')
        && p.city.toLocaleLowerCase('tr-TR') === city.name.toLocaleLowerCase('tr-TR'));
    const near = hasGeo(dist) ? nearestPoints(dist, points, 5) : [];
    const sizes = stats[`d:${dist.id}`]?.topSizes?.length ? stats[`d:${dist.id}`].topSizes : (stats[`c:${city.id}`]?.topSizes || []);
    const branch = isIstanbul && hasGeo(dist) ? nearestBranch(dist) : null;
    const neighbours = hasGeo(dist) ? nearest(dist, ilcelerOf(city.id), 8, dist) : [];
    const mahalleler = isIstanbul ? mahallelerOf(dist.id) : [];

    const intro = locationIntro({
        seed: `ilce/${city.slug}/${dist.slug}`,
        place: dist.name,
        parent: city.name,
        pointCount: inDist.length,
        nearestKm: near[0]?.km,
        nearestPlace: near[0] ? `${near[0].point.city}${near[0].point.district ? ` / ${near[0].point.district}` : ''}` : undefined,
        branch: branch ? { name: branch.branch.shortName, km: branch.km } : undefined,
        topSize: sizes[0]
    });

    return (
        <section className="py-4">
            <JsonLd data={breadcrumbJsonLd(origin, [
                { name: 'Lastikçi', path: '/lastikci' },
                { name: city.name, path: `/lastikci/${city.slug}` },
                { name: dist.name }
            ])} />
            <Container>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Ana Sayfa</Link></li>
                        <li className="breadcrumb-item"><Link href="/lastikci">Lastikçi</Link></li>
                        <li className="breadcrumb-item"><Link href={`/lastikci/${city.slug}`}>{city.name}</Link></li>
                        <li className="breadcrumb-item active" aria-current="page">{dist.name}</li>
                    </ol>
                </nav>
                <h1 className="fs-3 fw-bold mb-3">{`${dist.name} Lastikçi ve Lastik Montajı`}</h1>
                <Row className="g-4">
                    <Col lg={8}>
                        {intro.map((t, i) => <p key={i}>{t}</p>)}

                        {branch && <BranchBox branch={branch.branch} km={branch.km} placeName={dist.name} />}

                        {near.length > 0 && (
                            <Card title={`${dist.name} Bölgesine En Yakın Montaj Noktaları`}>
                                <PointsTable rows={near} showKm />
                            </Card>
                        )}

                        <TopSizes sizes={sizes} regionName={stats[`d:${dist.id}`]?.topSizes?.length ? dist.name : city.name} />

                        {mahalleler.length > 0 && (
                            <Card title={`${dist.name} Mahalleleri`}>
                                <LinkGrid links={mahalleler.map(m => ({ href: `/lastikci/${city.slug}/${dist.slug}/${m.slug}`, label: m.name }))} />
                            </Card>
                        )}

                        <h2 className="fs-6 fw-bold mt-2">Kış Lastiği</h2>
                        <p>{winterNote(`ilce/${dist.id}`, dist.name)}</p>
                    </Col>
                    <Col lg={4}>
                        {neighbours.length > 0 && (
                            <Card title={`${dist.name} Yakınındaki İlçeler`}>
                                <LinkGrid links={neighbours.map(n => ({ href: `/lastikci/${city.slug}/${n.slug}`, label: n.name, extra: fmtKm(n.km) }))} />
                            </Card>
                        )}
                        <Card title="Aracınıza Uygun Lastik">
                            <p className="small mb-2">Marka ve modelinizi seçerek fabrika ebatlarını ve uyumlu ürünleri görün.</p>
                            <Link href="/arac" className="btn btn-outline-dark btn-sm">Araca göre lastik</Link>
                        </Card>
                        <Link href={`/lastikci/${city.slug}`} className="text-black">{`${city.name} geneli`} <i className="ri-arrow-right-line" /></Link>
                    </Col>
                </Row>
            </Container>
        </section>
    );
}
