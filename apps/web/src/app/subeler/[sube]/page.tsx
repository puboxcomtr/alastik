import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { Container, Row, Col } from 'react-bootstrap';
import { BRANCHES, getBranch } from '@/src/data/lja/subeler';
import { SERVICE_GROUPS } from '@/src/data/lja/hizmetGruplari';
import { getBranchPoint, getGroupServices, branchJsonLd } from '@/src/lib/ljaBranches';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';
import { ACCENT, BranchInfoCard, ServiceTable, FaqList } from '@/src/components/lastikjantavm/branch/BranchParts';

interface Props {
    params: Promise<{ sube: string }>;
}

const isLja = () => (headers().get('x-site') || 'alastik') === 'lastikjantavm';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { sube } = await params;
    const branch = getBranch(sube);
    if (!isLja() || !branch) return {};
    return {
        title: `${branch.title} | Adres, Saatler ve Fiyatlar - LastikJantAVM`,
        description: `LastikJantAVM ${branch.shortName} şubesi (${branch.neighborhood}, ${branch.district}): lastik montajı, rot balans, mantar yama, jant pres, lastik oteli ve diğer hizmetlerin güncel fiyatları, adres ve çalışma saatleri.`,
        ...(await canonicalMeta(`/subeler/${branch.slug}`))
    };
}

export default async function BranchPage({ params }: Props) {
    const { sube } = await params;
    const branch = getBranch(sube);
    if (!isLja() || !branch) notFound();

    const point = await getBranchPoint(branch);
    if (!point) notFound();

    const groupRows = await Promise.all(SERVICE_GROUPS.map(g => getGroupServices(g, point)));
    const origin = await getSiteOrigin();
    const otherBranches = BRANCHES.filter(b => b.slug !== branch.slug);

    const faqLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: branch.faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
    };

    return (
        <section className="py-4">
            <JsonLd data={[
                branchJsonLd(origin, branch, point),
                breadcrumbJsonLd(origin, [{ name: 'Şubelerimiz', path: '/subeler' }, { name: `${branch.shortName} Şubesi` }]),
                faqLd
            ]} />
            <Container>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Ana Sayfa</Link></li>
                        <li className="breadcrumb-item"><Link href="/subeler">Şubelerimiz</Link></li>
                        <li className="breadcrumb-item active" aria-current="page">{branch.shortName} Şubesi</li>
                    </ol>
                </nav>

                <h1 className="fs-3 fw-bold mb-3">{branch.title}</h1>

                <Row className="g-4">
                    <Col lg={8}>
                        {branch.intro.map((t, i) => <p key={i}>{t}</p>)}

                        <nav className="my-4" aria-label="Hizmetler">
                            <div className="d-flex flex-wrap gap-2">
                                {SERVICE_GROUPS.map(g => (
                                    <a key={g.slug} href={`#${g.slug}`} className="btn btn-outline-dark btn-sm">{g.name}</a>
                                ))}
                            </div>
                        </nav>

                        {SERVICE_GROUPS.map((g, i) => (
                            <div key={g.slug} id={g.slug} className="card border-0 shadow-sm rounded-3 mb-4">
                                <div className="card-body p-4">
                                    <h2 className="fs-5 fw-bold mb-1" style={{ color: ACCENT }}>
                                        {branch.shortName} {g.name}
                                    </h2>
                                    <p className="text-muted mb-3">{g.summary}</p>
                                    <ServiceTable rows={groupRows[i]} />
                                    <Link href={`/subeler/${branch.slug}/${g.slug}`} className="d-inline-block mt-3 fw-semibold text-black">
                                        {branch.shortName} {g.name} hakkında detaylı bilgi <i className="ri-arrow-right-line" />
                                    </Link>
                                </div>
                            </div>
                        ))}

                        <h2 className="fs-5 fw-bold mt-4 mb-2">Şubeye Nasıl Gelinir?</h2>
                        {branch.location.map((t, i) => <p key={i}>{t}</p>)}

                        <h2 className="fs-5 fw-bold mt-4 mb-1">Sık Sorulan Sorular</h2>
                        <FaqList faqs={branch.faqs} />
                    </Col>

                    <Col lg={4}>
                        <div style={{ position: 'sticky', top: 16 }}>
                            <BranchInfoCard branch={branch} point={point} />
                            {otherBranches.map(b => (
                                <div key={b.slug} className="card border-0 shadow-sm rounded-3 mb-4">
                                    <div className="card-body p-4">
                                        <div className="small text-muted mb-1">Diğer şubemiz</div>
                                        <Link href={`/subeler/${b.slug}`} className="fw-bold text-black">
                                            {b.title}
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Col>
                </Row>
            </Container>
        </section>
    );
}
