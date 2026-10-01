// İl sayfası — /lastikci/<il> (yalnızca lastikjantavm.com)
// İldeki montaj noktaları (yoksa en yakınları), bölgede tercih edilen ebatlar, ilçeler, komşu iller.
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { Container, Row, Col } from 'react-bootstrap';
import { ILLER, ISTANBUL_ID, ilBySlug, ilcelerOf, nearest, hasGeo } from '@/src/lib/geo';
import { getMontagePoints, getRegionStats, nearestPoints, nearestBranch } from '@/src/lib/locationData';
import { locationIntro, winterNote } from '@/src/lib/locationText';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';
import { Card, PointsTable, TopSizes, BranchBox, LinkGrid } from '@/src/components/lastikjantavm/location/LocationParts';

interface Props { params: Promise<{ il: string }> }

const isLja = () => (headers().get('x-site') || 'alastik') === 'lastikjantavm';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { il } = await params;
    const city = ilBySlug(il);
    if (!isLja() || !city) return {};
    return {
        title: `${city.name} Lastikçi, Lastik Montajı ve Lastik Fiyatları | LastikJantAVM`,
        description: `${city.name} için lastik, jant ve kar zinciri siparişi; ${city.name} montaj noktaları, ilçeler ve bölgede tercih edilen lastik ebatları.`,
        ...(await canonicalMeta(`/lastikci/${city.slug}`))
    };
}

export default async function CityPage({ params }: Props) {
    const { il } = await params;
    const city = ilBySlug(il);
    if (!isLja() || !city) notFound();

    const [points, stats, origin] = await Promise.all([getMontagePoints(), getRegionStats(), getSiteOrigin()]);
    const inCity = points.filter(p => p.cityId ? p.cityId === city.id : p.city.toLocaleLowerCase('tr-TR') === city.name.toLocaleLowerCase('tr-TR'));
    const near = hasGeo(city) && inCity.length === 0 ? nearestPoints(city, points, 5) : [];
    const sizes = stats[`c:${city.id}`]?.topSizes || [];
    const districts = ilcelerOf(city.id);
    const neighbours = hasGeo(city) ? nearest(city, ILLER, 6, city) : [];
    const isIstanbul = city.id === ISTANBUL_ID;
    const branch = isIstanbul && hasGeo(city) ? nearestBranch(city) : null;

    const intro = locationIntro({
        seed: `il/${city.slug}`,
        place: city.name,
        pointCount: inCity.length,
        nearestKm: near[0]?.km,
        nearestPlace: near[0] ? near[0].point.city : undefined,
        topSize: sizes[0]
    });

    return (
        <section className="py-4">
            <JsonLd data={breadcrumbJsonLd(origin, [{ name: 'Lastikçi', path: '/lastikci' }, { name: city.name }])} />
            <Container>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Ana Sayfa</Link></li>
                        <li className="breadcrumb-item"><Link href="/lastikci">Lastikçi</Link></li>
                        <li className="breadcrumb-item active" aria-current="page">{city.name}</li>
                    </ol>
                </nav>
                <h1 className="fs-3 fw-bold mb-3">{`${city.name} Lastikçi ve Lastik Montajı`}</h1>
                <Row className="g-4">
                    <Col lg={8}>
                        {intro.map((t, i) => <p key={i}>{t}</p>)}

                        {isIstanbul && (
                            <Card title="İstanbul Şubelerimiz">
                                <p>Şişli Mecidiyeköy ve Maslak şubelerimizde montaj, lastik tamiri, rot balans, jant onarımı ve lastik oteli hizmeti veriyoruz.</p>
                                <div className="d-flex flex-wrap gap-2">
                                    <Link href="/subeler/sisli-mecidiyekoy" className="btn btn-dark btn-sm">Şişli Mecidiyeköy Şubesi</Link>
                                    <Link href="/subeler/maslak" className="btn btn-dark btn-sm">Maslak Şubesi</Link>
                                </div>
                            </Card>
                        )}

                        {inCity.length > 0 ? (
                            <Card title={`${city.name} Montaj Noktaları (${inCity.length})`}>
                                <PointsTable rows={inCity.map(p => ({ point: p }))} showKm={false} />
                            </Card>
                        ) : near.length > 0 && (
                            <Card title={`${city.name} Bölgesine En Yakın Montaj Noktaları`}>
                                <PointsTable rows={near} showKm />
                            </Card>
                        )}

                        <TopSizes sizes={sizes} regionName={city.name} />

                        <Card title={`${city.name} İlçeleri`}>
                            <LinkGrid links={districts.map(d => ({ href: `/lastikci/${city.slug}/${d.slug}`, label: `${d.name} lastikçi` }))} />
                        </Card>

                        <h2 className="fs-6 fw-bold mt-2">Kış Lastiği</h2>
                        <p>{winterNote(`il/${city.slug}`, city.name)}</p>
                    </Col>
                    <Col lg={4}>
                        {branch && <BranchBox branch={branch.branch} km={branch.km} placeName={city.name} />}
                        {neighbours.length > 0 && (
                            <Card title="Komşu İller">
                                <LinkGrid links={neighbours.map(n => ({ href: `/lastikci/${n.slug}`, label: n.name }))} />
                            </Card>
                        )}
                        <Card title="Aracınıza Uygun Lastik">
                            <p className="small mb-2">Marka ve modelinizi seçerek fabrika ebatlarını ve uyumlu ürünleri görün.</p>
                            <Link href="/arac" className="btn btn-outline-dark btn-sm">Araca göre lastik</Link>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </section>
    );
}
