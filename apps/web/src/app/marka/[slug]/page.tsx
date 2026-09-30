/* Library */
import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

/* Services */
import { getBrandDetail } from '@/src/services/brandService';
import { filterProducts } from '@/src/services/productService';
import { getShowcaseSettings } from '@/src/services/settingsService';
import { getSeo } from '@/src/services/seoService';
import { applyTemplate } from '@/src/utils/seoTemplate';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';


/* Components - ALastik */
import AlastikSidebar from '@components/alastik/category/Sidebar/Content';
import AlastikCategoryTop from '@components/alastik/category/Top/Content';
import AlastikCategoryTireSearch from '@components/alastik/category/Top/CategoryTireSearch';
import AlastikMobileFilterSort from '@components/alastik/category/Top/MobileFilterSort';
import AlastikPagination from '@components/alastik/category/Pagination/MainPagination';

/* Components - LastikJantAVM */
import LjaSidebar from '@components/lastikjantavm/category/Sidebar/Content';
import LjaCategoryTop from '@components/lastikjantavm/category/Top/Content';
import LjaCategoryTireSearch from '@components/lastikjantavm/category/Top/CategoryTireSearch';
import LjaMobileFilterSort from '@components/lastikjantavm/category/Top/MobileFilterSort';
import LjaPagination from '@components/lastikjantavm/category/Pagination/MainPagination';

import Breadcrumb from '@/src/components/brand/Header/Breadcrumb';
import SecondHandBanner from '@/src/components/category/SecondHandBanner';


/* Context */
import { ViewModeProvider } from '@/src/context/ViewModeContext';

/* Product Mode */
import AlastikViewModeProductList from '@components/alastik/shop/Product/Showcase/Mode';
import LjaViewModeProductList from '@components/lastikjantavm/shop/Product/Showcase/Mode';
// Next 15 dinamik parametreyi URL-kodlu verir ("ar%C4%B1zal%C4%B1-lastik"); servis tekrar kodladığı için
// Türkçe karakterli marka adresleri 404 veriyordu. API'ye çözülmüş slug gönderilir.
function decodeSlug(slug: string): string {
    try { return decodeURIComponent(slug); } catch { return slug; }
}

interface Props {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
    const { slug } = await params;
    const result = await getBrandDetail(decodeSlug(slug));
    if (!result.success || !result.data) {
        return {
            title: 'Marka Bulunamadı',
            description: 'Aradığınız marka bulunamadı.'
        };
    }
    const brand = result.data;

    const seo = await getSeo();
    const tpl = seo?.brand;
    const vars = {
        'marka-adi': brand.name,
        'marka-aciklamasi': brand.seoDescription || `${brand.name} lastik modellerini inceleyin.`
    };

    // Custom seoTitle varsa sablonu atla, dogrudan goster
    const title = brand.seoTitle
        ? brand.seoTitle
        : (applyTemplate(tpl?.titleTemplate, vars) || brand.name);

    // Custom seoDescription varsa sablonu atla
    const description = brand.seoDescription
        ? brand.seoDescription
        : (applyTemplate(tpl?.descriptionTemplate, vars) || vars['marka-aciklamasi']);

    return {
        title,
        description,
        keywords: applyTemplate(tpl?.keywordsTemplate, vars) || brand.seoKeywords?.join(', '),
        // ?durum=2-el dahil filtre/sıralama adresleri noindex,follow
        ...(await canonicalMeta(`/marka/${slug}`, await searchParams))
    };
}

export default async function BrandPage({ params, searchParams }: Props) {
    const site = headers().get('x-site') || 'alastik';
    const Sidebar = site === 'lastikjantavm' ? LjaSidebar : AlastikSidebar;
    const CategoryTop = site === 'lastikjantavm' ? LjaCategoryTop : AlastikCategoryTop;
    const CategoryTireSearch = site === 'lastikjantavm' ? LjaCategoryTireSearch : AlastikCategoryTireSearch;
    const MobileFilterSort = site === 'lastikjantavm' ? LjaMobileFilterSort : AlastikMobileFilterSort;
    const Pagination = site === 'lastikjantavm' ? LjaPagination : AlastikPagination;
    const ViewModeProductList = site === 'lastikjantavm' ? LjaViewModeProductList : AlastikViewModeProductList;

    const { slug } = await params;
    const filters = await searchParams;

    const result = await getBrandDetail(decodeSlug(slug));

    if (!result.success || !result.data) {
        notFound();
    }

    const brand = result.data;
    const showcaseSettings = await getShowcaseSettings();
    const currentPage = parseInt(filters.page || '1');

    // LJA marka sayfasında Sıfır / 2.El sekmeleri: 2.El sekmesi ikinci-el kategorisini
    // listeler, Sıfır sekmesi bu kategoriyi dışlar. Diğer sitelerde davranış değişmez.
    const hasConditionTabs = site === 'lastikjantavm';
    const isSecondHand = hasConditionTabs && filters.durum === '2-el';

    const productsData = await filterProducts({
        marka: brand.diaMarkaAck,
        // İkinci El üst kategorisi jantları da içerir; marka sekmesi lastik alt kategorisini kullanır
        category: isSecondHand ? 'ikinci-el-arac-lastikleri' : undefined,
        haricKategori: hasConditionTabs && !isSecondHand ? 'ikinci-el' : undefined,
        // Lastik parametreleri
        genislik: filters.genislik,
        yukseklik: filters.yanak,
        cap: filters.jant,
        oem: filters.oem,
        mevsim: filters.mevsim,
        ozellik: filters.ozellik,
        yukEndeksi: filters.yukEndeksi,
        hizEndeksi: filters.hizEndeksi,
        uretim: filters.uretim,
        // Jant parametreleri
        jantCap: filters.jantCap,
        bijon: filters.bijon,
        // Ortak parametreler
        arac: filters.arac,
        fiyatMin: filters.fiyatMin ? parseInt(filters.fiyatMin) : undefined,
        fiyatMax: filters.fiyatMax ? parseInt(filters.fiyatMax) : undefined,
        page: currentPage,
        limit: showcaseSettings.productsPerPage,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
    });
    const displayProductCount = productsData?.pagination?.totalProducts ?? brand.productCount;

    const breadcrumbLd = breadcrumbJsonLd(await getSiteOrigin(), [{ name: brand.name }]);

    return (
        <>
            <JsonLd data={breadcrumbLd} />
            <section id="breadcumb">
                <Container>
                    <div className="row-fluid">
                        <Row>
                            <Col lg={12}>
                                <Breadcrumb
                                    brandName={brand.name}
                                    brandSlug={slug}
                                />
                            </Col>
                        </Row>
                    </div>
                </Container>
            </section>

            <ViewModeProvider>
                <section id="brand__detail">
                    <Container className="category-page-container">
                        <div className="row-fluid">
                            <Row>
                                <Col lg={3}>
                                    <Sidebar
                                        hideEbatFilters={false}
                                        brandSlug={slug}
                                    />
                                </Col>

                                <Col lg={9}>
                                    <Row>
                                        <Col md={12}>
                                            <MobileFilterSort
                                                hideEbatFilters={false}
                                                brandSlug={slug}
                                            />
                                        </Col>
                                        <Col md={12}>
                                            <CategoryTireSearch />
                                        </Col>
                                        <Col md={12}>
                                            <CategoryTop
                                                productCount={displayProductCount}
                                                categoryName={isSecondHand ? `${brand.name} 2.EL` : brand.name}
                                            />
                                        </Col>
                                    </Row>

                                    {/* Ürün Listesi */}
                                    <ViewModeProductList products={productsData?.products || []} />

                                    {/* Pagination */}
                                    {productsData?.pagination && (
                                        <Row>
                                            <Col md={12}>
                                                <Pagination
                                                    currentPage={productsData.pagination.currentPage}
                                                    totalPages={productsData.pagination.totalPages}
                                                    totalProducts={productsData.pagination.totalProducts}
                                                />
                                            </Col>
                                        </Row>
                                    )}

                                    {/* 2.El ürünlere geçiş banner'ı (sadece LJA, sıfır görünümünde) */}
                                    {hasConditionTabs && !isSecondHand && (
                                        <Row>
                                            <Col md={12}>
                                                <SecondHandBanner
                                                    href={`/marka/${slug}?durum=2-el`}
                                                    text={`${brand.diaMarkaAck || brand.name} markasında garantili 2. el lastik seçeneklerini görmek için`}
                                                />
                                            </Col>
                                        </Row>
                                    )}
                                </Col>
                                <Col lg={12} className="order-3">
                                    {/* Marka SEO içeriği */}
                                    {brand.description && (
                                        <Row>
                                            <Col md={12}>
                                                <div
                                                    className="category-seo-content mt-4"
                                                    dangerouslySetInnerHTML={{ __html: brand.description }}
                                                />
                                            </Col>
                                        </Row>
                                    )}
                                </Col>
                            </Row>
                        </div>
                    </Container>
                </section>
            </ViewModeProvider>
        </>
    );
}