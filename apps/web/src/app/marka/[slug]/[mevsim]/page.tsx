import React from 'react';
import Link from 'next/link';
import { Col, Container, Row } from 'react-bootstrap';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

import { getBrandDetail } from '@/src/services/brandService';
import { filterProducts } from '@/src/services/productService';
import { getShowcaseSettings } from '@/src/services/settingsService';
import { getBrandSeoStrict, type BrandSeo, type SeasonKey } from '@/src/services/brandSeoService';
import { buildBrandSeasonContent, SEASON_BY_PATH, SEASON_INDEX_MIN, seasonLabel, type BrandContent } from '@/src/lib/brandText';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';

import LjaSidebar from '@components/lastikjantavm/category/Sidebar/Content';
import LjaCategoryTop from '@components/lastikjantavm/category/Top/Content';
import LjaCategoryTireSearch from '@components/lastikjantavm/category/Top/CategoryTireSearch';
import LjaMobileFilterSort from '@components/lastikjantavm/category/Top/MobileFilterSort';
import LjaPagination from '@components/lastikjantavm/category/Pagination/MainPagination';
import LjaViewModeProductList from '@components/lastikjantavm/shop/Product/Showcase/Mode';
import BrandSeoContent from '@/src/components/lastikjantavm/brand/BrandSeoContent';
import { ViewModeProvider } from '@/src/context/ViewModeContext';

interface Props {
    params: Promise<{ slug: string; mevsim: string }>;
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

const SEASON_DIA: Record<SeasonKey, string> = { yaz: 'Yaz', kis: 'Kış', dort: '4 Mevsim' };

function decodeSlug(slug: string): string {
    try { return decodeURIComponent(slug); } catch { return slug; }
}

interface Loaded { slug: string; mevsim: string; season: SeasonKey; brand: any; data: BrandSeo; content: BrandContent }

async function load(params: Props['params']): Promise<Loaded | null> {
    const { slug: rawSlug, mevsim } = await params;
    if ((headers().get('x-site') || 'alastik') !== 'lastikjantavm') return null;
    const season = SEASON_BY_PATH[mevsim];
    if (!season) return null;
    const slug = decodeSlug(rawSlug);
    const [result, data] = await Promise.all([getBrandDetail(slug), getBrandSeoStrict(slug, season)]);
    if (!result.success || !result.data || !data) return null;
    const content = buildBrandSeasonContent(slug, data, season);
    if (!content) return null;
    return { slug: rawSlug, mevsim, season, brand: result.data, data, content };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
    const r = await load(params);
    if (!r) return {};
    return {
        title: r.content.title,
        description: r.content.description,
        ...(await canonicalMeta(`/marka/${r.slug}/${r.mevsim}`, await searchParams)),
        ...(r.data.stats.total < SEASON_INDEX_MIN ? { robots: { index: false, follow: true } } : {})
    };
}

export default async function BrandSeasonPage({ params, searchParams }: Props) {
    const r = await load(params);
    if (!r) notFound();
    const { slug, mevsim, season, brand, content } = r;
    const filters = await searchParams;
    const showcaseSettings = await getShowcaseSettings();
    const currentPage = parseInt(filters.page || '1');

    const productsData = await filterProducts({
        marka: brand.diaMarkaAck,
        mevsim: SEASON_DIA[season],
        haricKategori: 'ikinci-el',
        genislik: filters.genislik,
        yukseklik: filters.yanak,
        cap: filters.jant,
        oem: filters.oem,
        ozellik: filters.ozellik,
        yukEndeksi: filters.yukEndeksi,
        hizEndeksi: filters.hizEndeksi,
        uretim: filters.uretim,
        arac: filters.arac,
        fiyatMin: filters.fiyatMin ? parseInt(filters.fiyatMin) : undefined,
        fiyatMax: filters.fiyatMax ? parseInt(filters.fiyatMax) : undefined,
        page: currentPage,
        limit: showcaseSettings.productsPerPage,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
    });
    const productCount = productsData?.pagination?.totalProducts ?? r.data.stats.total;
    const origin = await getSiteOrigin();

    return (
        <>
            <JsonLd data={breadcrumbJsonLd(origin, [
                { name: content.display, path: `/marka/${slug}` },
                { name: `${seasonLabel(season)} Lastikleri` }
            ])} />
            <section id="breadcumb">
                <Container>
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb">
                            <li className="breadcrumb-item"><Link href="/">Anasayfa</Link></li>
                            <li className="breadcrumb-item"><Link href={`/marka/${slug}`}>{content.display}</Link></li>
                            <li className="breadcrumb-item active" aria-current="page">{`${seasonLabel(season)} Lastikleri`}</li>
                        </ol>
                    </nav>
                </Container>
            </section>

            <ViewModeProvider>
                <section id="brand__detail">
                    <Container className="category-page-container">
                        <Row>
                            <Col lg={3}>
                                <LjaSidebar hideEbatFilters={false} brandSlug={slug} />
                            </Col>
                            <Col lg={9}>
                                <Row>
                                    <Col md={12}>
                                        <LjaMobileFilterSort hideEbatFilters={false} brandSlug={slug} />
                                    </Col>
                                    <Col md={12}>
                                        <LjaCategoryTireSearch />
                                    </Col>
                                    <Col md={12}>
                                        <LjaCategoryTop productCount={productCount} categoryName={content.h1} />
                                    </Col>
                                </Row>
                                <LjaViewModeProductList products={productsData?.products || []} />
                                {productsData?.pagination && (
                                    <Row>
                                        <Col md={12}>
                                            <LjaPagination
                                                currentPage={productsData.pagination.currentPage}
                                                totalPages={productsData.pagination.totalPages}
                                                totalProducts={productsData.pagination.totalProducts}
                                            />
                                        </Col>
                                    </Row>
                                )}
                            </Col>
                            <Col lg={12} className="order-3">
                                <BrandSeoContent content={content} display={content.display} seasonTitle={seasonLabel(season)} />
                            </Col>
                        </Row>
                    </Container>
                </section>
            </ViewModeProvider>
        </>
    );
}
