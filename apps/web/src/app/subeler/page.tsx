import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { Container, Row, Col } from 'react-bootstrap';
import { BRANCHES } from '@/src/data/lja/subeler';
import { SERVICE_GROUPS } from '@/src/data/lja/hizmetGruplari';
import { getBranchPoint } from '@/src/lib/ljaBranches';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';
import { ACCENT } from '@/src/components/lastikjantavm/branch/BranchParts';

const isLja = () => (headers().get('x-site') || 'alastik') === 'lastikjantavm';

export async function generateMetadata(): Promise<Metadata> {
    if (!isLja()) return {};
    return {
        title: 'Şubelerimiz: Şişli Mecidiyeköy ve Maslak Lastik Servisi | LastikJantAVM',
        description: 'LastikJantAVM’nin İstanbul’daki Şişli Mecidiyeköy ve Maslak 1453 şubeleri: adres, telefon, çalışma saatleri, lastik montajı, rot balans, mantar yama ve lastik oteli fiyatları.',
        ...(await canonicalMeta('/subeler'))
    };
}

export default async function BranchesPage() {
    if (!isLja()) notFound();
    const points = await Promise.all(BRANCHES.map(b => getBranchPoint(b)));
    const origin = await getSiteOrigin();

    return (
        <section className="py-4">
            <JsonLd data={breadcrumbJsonLd(origin, [{ name: 'Şubelerimiz' }])} />
            <Container>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Ana Sayfa</Link></li>
                        <li className="breadcrumb-item active" aria-current="page">Şubelerimiz</li>
                    </ol>
                </nav>
                <h1 className="fs-3 fw-bold mb-2">LastikJantAVM Şubeleri</h1>
                <p className="mb-4">
                    İstanbul’da iki şubemizde lastik montajı, rot balans, lastik tamiri, jant onarımı ve lastik oteli
                    hizmeti veriyoruz. Sitemizden aldığınız lastikler için sipariş sırasında şubelerimizden birini
                    montaj noktası olarak seçebilirsiniz.
                </p>
                <Row className="g-4">
                    {BRANCHES.map((b, i) => {
                        const p = points[i];
                        return (
                            <Col md={6} key={b.slug}>
                                <div className="card border-0 shadow-sm rounded-3 h-100">
                                    <div className="card-body p-4">
                                        <h2 className="fs-4 fw-bold mb-2">
                                            <Link href={`/subeler/${b.slug}`} className="text-decoration-none" style={{ color: ACCENT }}>
                                                {b.shortName} Şubesi
                                            </Link>
                                        </h2>
                                        {p?.address && <p className="mb-1">{p.address}, {b.district} / İstanbul</p>}
                                        {p?.phone && (
                                            <p className="mb-3">
                                                <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="text-black fw-semibold">{p.phone}</a>
                                            </p>
                                        )}
                                        <p className="small text-muted mb-2">Hizmetler:</p>
                                        <ul className="small mb-3">
                                            {SERVICE_GROUPS.map(g => (
                                                <li key={g.slug}>
                                                    <Link href={`/subeler/${b.slug}/${g.slug}`} className="text-black">
                                                        {b.shortName} {g.name}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                        <Link href={`/subeler/${b.slug}`} className="btn btn-dark btn-sm">
                                            Şube Detayı ve Fiyatlar
                                        </Link>
                                    </div>
                                </div>
                            </Col>
                        );
                    })}
                </Row>
            </Container>
        </section>
    );
}
