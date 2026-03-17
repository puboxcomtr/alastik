/* Library */
import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

/* Services */
import tagService from '@/src/services/tagService';
import { getShowcaseSettings } from '@/src/services/settingsService';

/* Components */
import Sidebar from "@/src/components/category/Sidebar/Content";
import VehicleInfo from "@/src/components/tag/Sidebar/VehicleInfo";
import Breadcrumb from "@/src/components/tag/Header/Breadcrumb";
import CategoryTop from '@components/category/Top/Content';
import CategoryTireSearch from '@components/category/Top/CategoryTireSearch';
import MobileFilterSort from '@components/category/Top/MobileFilterSort';
import Pagination from '@/src/components/category/Pagination/MainPagination';

/* Context */
import { ViewModeProvider } from '@/src/context/ViewModeContext';

/* Product Mode */
import ViewModeProductList from '@components/shop/Product/Showcase/Mode';

interface Props {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const tag = await tagService.getTagBySlug(slug);

    if (!tag) {
        return {
            title: 'Etiket Bulunamadı | ALastik.com',
            description: 'Aradığınız etiket bulunamadı.'
        };
    }

    return {
        title: tag.seoTitle || `${tag.title} | ALastik.com`,
        description: tag.seoDescription || `${tag.title} - En uygun lastik fiyatları ve modelleri.`,
    };
}

export default async function TagPage({ params, searchParams }: Props) {
    const { slug } = await params;
    const filters = await searchParams;

    const tag = await tagService.getTagBySlug(slug);

    if (!tag) {
        notFound();
    }

    const currentSize = slug.replace('-lastik-fiyatlari', '');
    const showcaseSettings = await getShowcaseSettings();
    const currentPage = parseInt(filters.page || '1');

    const productsData = await tagService.getTagProducts(
        slug,
        currentPage,
        showcaseSettings.productsPerPage,
        {
            marka: filters.marka,
            arac: filters.arac,
            oem: filters.oem,
            mevsim: filters.mevsim,
            ozellik: filters.ozellik,
            yukEndeksi: filters.yukEndeksi,
            hizEndeksi: filters.hizEndeksi,
            uretim: filters.uretim,
            fiyatMin: filters.fiyatMin ? parseInt(filters.fiyatMin) : undefined,
            fiyatMax: filters.fiyatMax ? parseInt(filters.fiyatMax) : undefined
        }
    );

    const displayProductCount = productsData?.pagination?.totalProducts ?? tag.productCount ?? 0;

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
                            </Row>
                        </div>
                    </Container>
                </section>
            </ViewModeProvider>
        </>
    );
}