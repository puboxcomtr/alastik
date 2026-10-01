// Araç modeli sayfası — /arac/<marka>/<model> (yalnızca lastikjantavm.com)
// Uyumlu lastik (fabrika + alternatif ebatlar, stok), nesil/motor bazında ebatlar, uyumlu jant (PCD, göbek),
// kar zinciri / paleti / çorabı. Veri: Wheel-Size (vehiclefitments) + sitenin etiket stokları.
// Fabrika ebatlarında yeterli stok yoksa sayfa noindex,follow olur (kalite kapısı).
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { Container, Row, Col } from 'react-bootstrap';
import { getVehicleModel, type VehicleModelDetail, type VehicleSizeStock } from '@/src/services/vehicleService';
import { modelIntro, modelFaqs, sizeGenerations, vehicleName } from '@/src/lib/vehicleText';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';

interface Props {
    params: Promise<{ marka: string; model: string }>;
}

const ACCENT = '#e58a00';
const isLja = () => (headers().get('x-site') || 'alastik') === 'lastikjantavm';
const years = (a?: number, b?: number) => (a && b ? (a === b ? `${a}` : `${a}–${b}`) : a ? `${a}+` : '');

async function load(params: Props['params']) {
    const { marka, model } = await params;
    if (!isLja()) return null;
    return getVehicleModel(marka, model);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const d = await load(params);
    if (!d) return {};
    const name = vehicleName(d);
    const top = d.summary.oeTireSizes.slice(0, 3).join(', ');
    const seo = await canonicalMeta(`/arac/${d.makeSlug}/${d.modelSlug}`);
    return {
        title: `${name} Lastik Ebatları, Uyumlu Jant ve Kar Zinciri | LastikJantAVM`,
        description: `${name}${d.summary.yearFrom ? ` (${years(d.summary.yearFrom, d.summary.yearTo)})` : ''} orijinal lastik ebatları${top ? ` ${top}` : ''}, bijon ${d.summary.boltPatterns.join(', ') || '-'}; uyumlu lastik, jant ve kar zinciri fiyatları.`,
        ...seo,
        // Kalite kapısı: fabrika ebatlarında yeterli stok yoksa dizine eklenmez
        ...(d.stock.indexable ? {} : { robots: { index: false, follow: true } })
    };
}

function sizeHref(s: VehicleSizeStock): string | null {
    return s.tag && s.tag.count > 0 ? `/etiket/${s.tag.seoUrl}` : null;
}
function chainHref(s: VehicleSizeStock): string | null {
    if (!s.chainCount || !s.width || !s.aspect || !s.diameter) return null;
    return `/kategori/kar-zinciri?genislik=${s.width}&yanak=${s.aspect}&jant=${s.diameter}`;
}

function SizeTable({ d, sizes, withGenerations }: { d: VehicleModelDetail; sizes: VehicleSizeStock[]; withGenerations: boolean }) {
    return (
        <div className="table-responsive">
            <table className="table table-striped align-middle">
                <thead>
                    <tr>
                        <th scope="col">Ebat</th>
                        {withGenerations && <th scope="col">Kullanıldığı nesil</th>}
                        <th scope="col" className="text-end">Stokta</th>
                    </tr>
                </thead>
                <tbody>
                    {sizes.map(s => {
                        const href = sizeHref(s);
                        return (
                            <tr key={s.size}>
                                <td className="fw-semibold">
                                    {href ? <Link href={href} className="text-black">{s.size} lastik</Link> : s.size}
                                </td>
                                {withGenerations && <td className="small">{sizeGenerations(d, s.size) || '-'}</td>}
                                <td className="text-end text-nowrap">
                                    {href ? <Link href={href} className="fw-semibold" style={{ color: ACCENT }}>{s.tag!.count} ürün</Link> : <span className="text-muted">Stokta yok</span>}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default async function VehicleModelPage({ params }: Props) {
    const d = await load(params);
    if (!d) notFound();

    const name = vehicleName(d);
    const origin = await getSiteOrigin();
    const intro = modelIntro(d);
    const faqs = modelFaqs(d);
    const oeSizes = d.stock.tireSizes.filter(s => s.oe);
    const optSizes = d.stock.tireSizes.filter(s => !s.oe && (s.tag?.count || 0) > 0).slice(0, 12);
    const chainSizes = oeSizes.filter(s => s.chainCount > 0);
    const gens = [...d.generations].sort((a, b) => (b.start || 0) - (a.start || 0));

    return (
        <section className="py-4">
            <JsonLd data={[
                breadcrumbJsonLd(origin, [
                    { name: 'Araca Göre Lastik', path: '/arac' },
                    { name: d.makeName, path: `/arac/${d.makeSlug}` },
                    { name: d.modelName }
                ]),
                {
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
                }
            ]} />
            <Container>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Ana Sayfa</Link></li>
                        <li className="breadcrumb-item"><Link href="/arac">Araca Göre Lastik</Link></li>
                        <li className="breadcrumb-item"><Link href={`/arac/${d.makeSlug}`}>{d.makeName}</Link></li>
                        <li className="breadcrumb-item active" aria-current="page">{d.modelName}</li>
                    </ol>
                </nav>

                <h1 className="fs-3 fw-bold mb-3">{`${name} Uyumlu Lastik, Jant ve Kar Zinciri`}</h1>

                <Row className="g-4">
                    <Col lg={8}>
                        {intro.map((t, i) => <p key={i}>{t}</p>)}

                        <nav className="my-3 d-flex flex-wrap gap-2" aria-label="Bölümler">
                            <a href="#lastik" className="btn btn-outline-dark btn-sm">Lastik</a>
                            <a href="#nesiller" className="btn btn-outline-dark btn-sm">Nesil ve Motor</a>
                            <a href="#jant" className="btn btn-outline-dark btn-sm">Jant</a>
                            <a href="#kar" className="btn btn-outline-dark btn-sm">Kar Zinciri / Paleti / Çorabı</a>
                        </nav>

                        <div id="lastik" className="card border-0 shadow-sm rounded-3 p-4 mb-4">
                            <h2 className="fs-5 fw-bold mb-3" style={{ color: ACCENT }}>{name} Orijinal Lastik Ebatları</h2>
                            <SizeTable d={d} sizes={oeSizes} withGenerations />
                            {optSizes.length > 0 && (
                                <>
                                    <h3 className="fs-6 fw-bold mt-3 mb-2">Alternatif Uyumlu Ebatlar</h3>
                                    <p className="small text-muted">Üretici tarafından onaylı alternatif ölçüler; jant değişikliği gerektirebilir.</p>
                                    <SizeTable d={d} sizes={optSizes} withGenerations={false} />
                                </>
                            )}
                        </div>

                        <div id="nesiller" className="card border-0 shadow-sm rounded-3 p-4 mb-4">
                            <h2 className="fs-5 fw-bold mb-3" style={{ color: ACCENT }}>{name} Nesil ve Motor Bazında Lastik Ölçüleri</h2>
                            {gens.map(g => (
                                <div key={g.slug} className="mb-4">
                                    <h3 className="fs-6 fw-bold mb-1">
                                        {name} {g.name}{g.start ? ` (${years(g.start, g.end)})` : ''}
                                    </h3>
                                    {g.bodies.length > 0 && <p className="small text-muted mb-2">{g.bodies.join(', ')}</p>}
                                    <div className="table-responsive">
                                        <table className="table table-sm align-middle small">
                                            <thead>
                                                <tr>
                                                    <th>Motor / Donanım</th>
                                                    <th>Yıl</th>
                                                    <th>Orijinal lastik</th>
                                                    <th>Jant</th>
                                                    <th>Bijon</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {g.modifications.map(m => {
                                                    const oe = m.wheels.filter(w => w.oe);
                                                    const tires = [...new Set(oe.map(w => w.rear?.tire ? `${w.front.tire} / arka ${w.rear.tire}` : w.front.tire))];
                                                    const rims = [...new Set(oe.map(w => w.front.rim).filter(Boolean))];
                                                    return (
                                                        <tr key={m.slug}>
                                                            <td>{m.trim}{m.powerHp ? ` (${m.powerHp} hp${m.fuel ? `, ${m.fuel}` : ''})` : ''}</td>
                                                            <td className="text-nowrap">{years(m.startYear, m.endYear)}</td>
                                                            <td>{tires.join(', ') || '-'}</td>
                                                            <td>{rims.join(', ') || '-'}</td>
                                                            <td className="text-nowrap">{m.boltPattern || '-'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div id="jant" className="card border-0 shadow-sm rounded-3 p-4 mb-4">
                            <h2 className="fs-5 fw-bold mb-3" style={{ color: ACCENT }}>{name} Uyumlu Jant</h2>
                            <ul>
                                {d.summary.boltPatterns.length > 0 && <li>Bijon düzeni (PCD): <strong>{d.summary.boltPatterns.join(', ')}</strong></li>}
                                {d.summary.centreBores.length > 0 && <li>Göbek (merkez) deliği: <strong>{d.summary.centreBores.map(c => `${c} mm`).join(', ')}</strong></li>}
                                {d.summary.rimDiameters.length > 0 && <li>Jant çapı: <strong>{d.summary.rimDiameters.map(r => `${r}"`).join(', ')}</strong></li>}
                            </ul>
                            {d.stock.rims.some(r => r.tag && r.tag.count > 0) ? (
                                <div className="d-flex flex-wrap gap-2">
                                    {d.stock.rims.filter(r => r.tag && r.tag.count > 0).map(r => (
                                        <Link key={r.boltPattern} href={`/etiket/${r.tag!.seoUrl}`} className="btn btn-dark btn-sm">
                                            {r.boltPattern} jantlar ({r.tag!.count} ürün)
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted mb-0">Bu bijon düzeninde şu anda stoklu jantımız yok; <Link href="/kategori/jant" className="text-black">tüm jantlara</Link> göz atabilirsiniz.</p>
                            )}
                        </div>

                        <div id="kar" className="card border-0 shadow-sm rounded-3 p-4 mb-4">
                            <h2 className="fs-5 fw-bold mb-3" style={{ color: ACCENT }}>{name} Kar Zinciri, Kar Paleti ve Kar Çorabı</h2>
                            <p>Kar ekipmanı lastik ebadına göre seçilir. Aracınızın ebadını seçerek uygun ürünleri listeleyebilirsiniz.</p>
                            {chainSizes.length > 0 ? (
                                <div className="d-flex flex-wrap gap-2">
                                    {chainSizes.map(s => (
                                        <Link key={s.size} href={chainHref(s)!} className="btn btn-outline-dark btn-sm">
                                            {s.size} kar zinciri ({s.chainCount} ürün)
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted mb-0">
                                    Bu ebatlar için stoklu kar zinciri bulunamadı; <Link href="/kategori/kar-zinciri" className="text-black">kar zinciri kategorisinde</Link> ölçü seçerek arayabilirsiniz.
                                </p>
                            )}
                        </div>

                        <h2 className="fs-5 fw-bold mt-4 mb-1">Sık Sorulan Sorular</h2>
                        {faqs.map((f, i) => (
                            <div key={i} className={`py-3 ${i > 0 ? 'border-top' : ''}`}>
                                <h3 className="fs-6 fw-bold mb-1">{f.q}</h3>
                                <p className="mb-0">{f.a}</p>
                            </div>
                        ))}
                        <p className="small text-muted mt-3">
                            Ölçü verileri üretici bilgilerine dayanır (kaynak: wheel-size.com, Avrupa pazarı). Aynı modelde donanıma göre farklılık olabilir; takmadan önce mevcut lastiğinizin ebadını kontrol edin.
                        </p>
                    </Col>

                    <Col lg={4}>
                        <div style={{ position: 'sticky', top: 16 }}>
                            <div className="card border-0 shadow-sm rounded-3 p-4 mb-4">
                                <h2 className="fs-6 fw-bold mb-3">{name} Özet</h2>
                                <dl className="row small mb-0">
                                    {d.summary.yearFrom && <><dt className="col-5">Yıllar</dt><dd className="col-7">{years(d.summary.yearFrom, d.summary.yearTo)}</dd></>}
                                    <dt className="col-5">Nesil</dt><dd className="col-7">{d.generations.length}</dd>
                                    {d.summary.oeTireSizes[0] && <><dt className="col-5">Yaygın ebat</dt><dd className="col-7">{d.summary.oeTireSizes[0]}</dd></>}
                                    {d.summary.boltPatterns.length > 0 && <><dt className="col-5">Bijon</dt><dd className="col-7">{d.summary.boltPatterns.join(', ')}</dd></>}
                                    {d.summary.fuels.length > 0 && <><dt className="col-5">Yakıt</dt><dd className="col-7">{d.summary.fuels.join(', ')}</dd></>}
                                </dl>
                            </div>
                            <div className="card border-0 shadow-sm rounded-3 p-4 mb-4">
                                <div className="small text-muted mb-1">Lastiğinizi taktırın</div>
                                <Link href="/subeler" className="fw-bold text-black">Şişli Mecidiyeköy ve Maslak şubelerimiz</Link>
                            </div>
                            <Link href={`/arac/${d.makeSlug}`} className="text-black">
                                Diğer {d.makeName} modelleri <i className="ri-arrow-right-line" />
                            </Link>
                        </div>
                    </Col>
                </Row>
            </Container>
        </section>
    );
}
