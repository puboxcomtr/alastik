/* Library */
import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

/* Services */
import { getBrandDetail } from '@/src/services/brandService';
import { filterProducts } from '@/src/services/productService';
import { getShowcaseSettings } from '@/src/services/settingsService';

/* Components */
import Sidebar from '@/src/components/category/Sidebar/Content';
import Breadcrumb from '@/src/components/brand/Header/Breadcrumb';

import CategoryTop from '@/src/components/category/Top/Content';
import CategoryTireSearch from '@/src/components/category/Top/CategoryTireSearch';
import MobileFilterSort from '@/src/components/category/Top/MobileFilterSort';
import Pagination from '@/src/components/category/Pagination/MainPagination';

/* Context */
import { ViewModeProvider } from '@/src/context/ViewModeContext';

/* Product Mode */
import ViewModeProductList from '@/src/components/shop/Product/Showcase/Mode';

interface Props {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const result = await getBrandDetail(slug);

    if (!result.success || !result.data) {
        return {
            title: 'Marka Bulunamadı | ALastik.com',
            description: 'Aradığınız marka bulunamadı.'
        };
    }

    const brand = result.data;

    return {
        title: `${brand.seoTitle || brand.name} | ALastik.com`,
        description: brand.seoDescription || `${brand.name} lastik modellerini inceleyin.`,
        keywords: brand.seoKeywords?.join(', ')
    };
}

export default async function BrandPage({ params, searchParams }: Props) {
    const { slug } = await params;
    const filters = await searchParams;

    const result = await getBrandDetail(slug);

    if (!result.success || !result.data) {
        notFound();
    }

    const brand = result.data;
    const showcaseSettings = await getShowcaseSettings();
    const currentPage = parseInt(filters.page || '1');

    const productsData = await filterProducts({
        marka: brand.diaMarkaAck,
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

    return (
        <>
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
                                                categoryName={brand.name}
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
                                </Col>
                            </Row>
                        </div>
                    </Container>
                </section>
            </ViewModeProvider>
        </>
    );
}