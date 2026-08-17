/* Library */
import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

/* Services */
import tagService from '@/src/services/tagService';
import { getShowcaseSettings } from '@/src/services/settingsService';
import { getOtherSeo } from '@/src/services/seoService';

/* Components */
import VehicleInfo from "@/src/components/tag/Sidebar/VehicleInfo";
import Breadcrumb from "@/src/components/tag/Header/Breadcrumb";

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

/* Context */
import { ViewModeProvider } from '@/src/context/ViewModeContext';

/* Product Mode */
import AlastikViewModeProductList from '@components/alastik/shop/Product/Showcase/Mode';
import LjaViewModeProductList from '@components/lastikjantavm/shop/Product/Showcase/Mode';

interface Props {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const tag = await tagService.getTagBySlug(slug);

    if (!tag) {
        const base = await getOtherSeo('seoTag');
        const siteName = base.title?.split('|').pop()?.trim() || '';

        return {
            title: tag.seoTitle
                ? tag.seoTitle
                : (siteName ? `${tag.title} | ${siteName}` : tag.title),
            description: tag.seoDescription || `${tag.title} - En uygun lastik fiyatları ve modelleri.`,
        };
    }

    return {
        title: tag.seoTitle || `${tag.title} | ALastik.com`,
        description: tag.seoDescription || `${tag.title} - En uygun lastik fiyatları ve modelleri.`,
    };
}

export default async function TagPage({ params, searchParams }: Props) {
    const site = headers().get('x-site') || 'alastik';
    const Sidebar = site === 'lastikjantavm' ? LjaSidebar : AlastikSidebar;
    const CategoryTop = site === 'lastikjantavm' ? LjaCategoryTop : AlastikCategoryTop;
    const CategoryTireSearch = site === 'lastikjantavm' ? LjaCategoryTireSearch : AlastikCategoryTireSearch;
    const MobileFilterSort = site === 'lastikjantavm' ? LjaMobileFilterSort : AlastikMobileFilterSort;
    const Pagination = site === 'lastikjantavm' ? LjaPagination : AlastikPagination;
    const ViewModeProductList = site === 'lastikjantavm' ? LjaViewModeProductList : AlastikViewModeProductList;

    const { slug } = await params;
    const filters = await searchParams;

    const tag = await tagService.getTagBySlug(slug);

    if (!tag) {
        notFound();
    }

    const currentSize = slug.replace('-lastik-fiyatlari', '');
    const showcaseSettings = await getShowcaseSettings();
    const currentPage = parseInt(filters.page || '1');

    const activeCondition = filters.durum === 'ikinci-el' ? 'ikinci-el' : 'sifir';

    const productsData = await tagService.getTagProducts(
        slug,
        currentPage,
        showcaseSettings.productsPerPage,
        {
            durum: filters.durum,
            marka: filters.marka,
            arac: filters.arac,
            oem: filters.oem,
            mevsim: filters.mevsim,
            ozellik: filters.ozellik,
            yukEndeksi: filters.yukEndeksi,
            hizEndeksi: filters.hizEndeksi,
            uretim: filters.uretim,
            fiyatMin: filters.fiyatMin ? parseInt(filters.fiyatMin) : undefined,
            fiyatMax: filters.fiyatMax ? parseInt(filters.fiyatMax) : undefined,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder
        }
    );

    const displayProductCount = productsData?.pagination?.totalProducts ?? tag.productCount ?? 0;

    // Sıfır / İkinci El sekmeleri — etikette ikinci el ürün varsa gösterilir
    const conditionCounts = productsData?.counts || { sifir: 0, ikinciEl: 0 };
    const showConditionTabs = conditionCounts.ikinciEl > 0;
    const conditionLabel = tag.type === 'rim_pcd' ? 'Jant' : 'Lastik';
    // Sekme başına etiket adı: slug'daki ebat bölümü (örn. 185-55-r15 → 185 55 R15).
    // Mevsim gibi kelime parçaları düz büyütme yerine doğru Türkçe karşılığıyla yazılır
    // (kis → Kış; aksi halde "KİS" görünür).
    const slugTokenLabels: Record<string, string> = {
        kis: 'Kış',
        yaz: 'Yaz',
        mevsim: 'Mevsim',
        dort: 'Dört',
        jant: 'Jant',
        lastik: 'Lastik'
    };
    const sizeLabel = currentSize
        .split('-')
        .map(part => slugTokenLabels[part] || part.toLocaleUpperCase('tr-TR'))
        .join(' ');

    return (
        <>
            <section id="breadcumb">
                <Container>
                    <div className="row-fluid">
                        <Row>
                            <Col lg={12}>
                                <Breadcrumb
                                    tagName={tag.title}
                                    tagSlug={slug}
                                />
                            </Col>
                        </Row>
                    </div>
                </Container>
            </section>
            <ViewModeProvider>
                <section id="category__detail">
                    <Container className="category-page-container">
                        <div className="row-fluid">
                            <Row>
                                <Col lg={3}>
                                    <VehicleInfo currentSize={currentSize} tagType={tag.type} />
                                    <Sidebar
                                        categorySlug={tag.type === 'rim_pcd' ? 'jant' : 'lastik'}
                                        hideEbatFilters={true}
                                        tagSlug={slug}
                                        tagType={tag.type}
                                    />
                                </Col>
                                <Col lg={9}>
                                    <Row>
                                        <Col md={12}>
                                            <MobileFilterSort
                                                hideEbatFilters={true}
                                                tagSlug={slug}
                                                tagType={tag.type}
                                            />
                                        </Col>
                                        <Col md={12}>
                                            <CategoryTireSearch />
                                        </Col>
                                        {showConditionTabs && (
                                            <Col md={12}>
                                                <ul className="nav nav-tabs mb-3">
                                                    <li className="nav-item">
                                                        <Link
                                                            href={`/etiket/${slug}`}
                                                            className={`nav-link ${activeCondition === 'sifir' ? 'active' : ''}`}>
                                                            {sizeLabel} Sıfır {conditionLabel} Fiyatları
                                                        </Link>
                                                    </li>
                                                    <li className="nav-item">
                                                        <Link
                                                            href={`/etiket/${slug}?durum=ikinci-el`}
                                                            className={`nav-link ${activeCondition === 'ikinci-el' ? 'active' : ''}`}>
                                                            {sizeLabel} İkinci El {conditionLabel} Fiyatları
                                                        </Link>
                                                    </li>
                                                </ul>
                                            </Col>
                                        )}
                                        <Col md={12}>
                                            <CategoryTop
                                                productCount={displayProductCount}
                                                categoryName={tag.title}
                                            />
                                        </Col>
                                    </Row>

                                    <ViewModeProductList products={productsData?.products || []} />

                                    {productsData?.pagination && productsData.pagination.totalPages > 1 && (
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
                                </Col>
                                <Col lg={12} className="order-3">
                                    {/* Etiket SEO içeriği */}
                                    {tag.description && (
                                        <Row>
                                            <Col md={12}>
                                                <div
                                                    className="category-seo-content mt-4"
                                                    dangerouslySetInnerHTML={{ __html: tag.description }}
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