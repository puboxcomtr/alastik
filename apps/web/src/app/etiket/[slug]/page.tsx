// apps/web/src/app/etiket/[slug]/page.tsx

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
import ProductCard from '@components/shop/Product/Showcase/Card';
import CategoryTop from '@components/category/Top/Content';
import CategoryTireSearch from '@components/category/Top/CategoryTireSearch';
import Pagination from '@/src/components/category/Pagination/MainPagination';

interface Props {
    params: Promise<{
        slug: string;
    }>;
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
    // Mevcut ebat
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
            oem: filters.oem
        }
    );
    const displayProductCount = productsData?.pagination?.totalProducts ?? tag.productCount ?? 0;

    return (
        <Container className="tag-page-container">
            <Row className="row-fluid">
                <Row className="my-3">
                    <Col>
                        <Breadcrumb
                            tagName={tag.title}
                            tagSlug={slug}
                        />
                    </Col>
                </Row>

                <Row>
                    <Col lg={3}>
                        {/* Araç Bilgisi (varsa) */}
                        <VehicleInfo currentSize={currentSize} />
                        {/* Normal Sidebar */}
                        <Sidebar hideEbatFilters={true} tagSlug={slug} />
                    </Col>

                    <Col lg={9}>
                        <Row>
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

                        <Row className="row-cols-2 row-cols-md-3 row-cols-lg-3">
                            {productsData?.products && productsData.products.length > 0 ? (
                                productsData.products.map((product) => (
                                    <Col key={product._key} className="px-2">
                                        <ProductCard product={product} />
                                    </Col>
                                ))
                            ) : (
                                <Col md={12} className="text-center py-5">
                                    <p className="text-muted">Bu etikete ait ürün bulunamadı.</p>
                                </Col>
                            )}
                        </Row>

                        {/* Pagination */}
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
            </Row>
        </Container>
    );
}