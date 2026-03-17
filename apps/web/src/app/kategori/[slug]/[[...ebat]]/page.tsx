// apps/web/src/app/kategori/[slug]/[[...ebat]]/page.tsx
/* Library */
import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

/* Services */
import { getCategory, getCategoryWithSize, getParentCategory } from '@/src/services/categoryService';
import { filterProducts } from '@/src/services/productService';
import { getShowcaseSettings } from '@/src/services/settingsService';

/* Components */
import Sidebar from "@/src/components/category/Sidebar/Content";
import Breadcrumb from "@/src/components/category/Header/Breadcrumb";
import CategorySlider from '@components/category/Top/Slider';
import CategoryTop from '@components/category/Top/Content';
import CategoryTireSearch from '@components/category/Top/CategoryTireSearch';
import MobileFilterSort from '@components/category/Top/MobileFilterSort';
import Pagination from '@/src/components/category/Pagination/MainPagination';

/* Utils */
import { parseTireSize } from '@/src/config/routes';

/* Context */
import { ViewModeProvider } from '@/src/context/ViewModeContext';

/* Product Mode */ 
import ViewModeProductList from '@components/shop/Product/Showcase/Mode';


interface Props {
    params: Promise<{
        slug: string;
        ebat?: string[]
    }>;
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug, ebat } = await params;
    const category = await getCategory(slug);

    if (!category) {
        return {
            title: 'Kategori Bulunamadı | ALastik.com',
            description: 'Aradığınız kategori bulunamadı.'
        };
    }

    if (!ebat || ebat.length === 0) {
        return {
            title: `${category.seoTitle || category.name} | ALastik.com`,
            description: category.description || `${category.name} kategorisinde en uygun lastik modellerini keşfedin.`,
            keywords: category.seoKeywords?.join(', ')
        };
    }

    const ebatSlug = ebat[0];
    const { formatted } = parseTireSize(ebatSlug);

    return {
        title: `${category.name} ${formatted} | ALastik.com`,
        description: `${category.name} kategorisinde ${formatted} ebadında lastik modellerini inceleyin.`,
        keywords: [...(category.seoKeywords || []), formatted, 'lastik'].join(', ')
    };
}

export default async function CategoryPage({ params, searchParams }: Props) {
    const { slug, ebat } = await params;
    const filters = await searchParams;

    const hasSize = ebat && ebat.length > 0;
    const category = hasSize
        ? await getCategoryWithSize(slug, ebat[0])
        : await getCategory(slug);

    if (!category) {
        notFound();
    }

    const parentCategory = category.parent ? await getParentCategory(category.parent) : null;
    const sizeInfo = hasSize ? parseTireSize(ebat[0]) : null;
    const displayName = category.name;

    // Showcase ayarlarını al
    const showcaseSettings = await getShowcaseSettings();

    // Sayfa numarasını al
    const currentPage = parseInt(filters.page || '1');

    // Ürünleri filtrele (pagination ile)
    const productsData = await filterProducts({
        category: slug,
        // Lastik parametreleri
        genislik: filters.genislik || sizeInfo?.genislik,
        yukseklik: filters.yanak || sizeInfo?.yukseklik,
        cap: filters.jant || sizeInfo?.cap,
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
        marka: filters.marka,
        fiyatMin: filters.fiyatMin ? parseInt(filters.fiyatMin) : undefined,
        fiyatMax: filters.fiyatMax ? parseInt(filters.fiyatMax) : undefined,
        page: currentPage,
        limit: showcaseSettings.productsPerPage,
        // Sıralama parametreleri
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
    });

    const displayProductCount = productsData?.pagination?.totalProducts ?? category.activeProductCount;

    return (
        <>
            <section id="breadcumb">
                <Container>
                    <div className="row-fluid">
                        <Row>
                            <Col lg={12}>
                                <Breadcrumb
                                    categoryName={displayName}
                                    categorySlug={slug}
                                    parentCategory={parentCategory}
                                    sizeInfo={sizeInfo}
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
                                    <Sidebar hideEbatFilters={false} categorySlug={slug} />
                                </Col>

                                <Col lg={9}>
                                    <Row>
                                        <Col md={12}>
                                            <Col md={12}>
                                                <CategorySlider sliderId={category.sliderId} />
                                            </Col>
                                        </Col>
                                        <Col md={12}>
                                            <MobileFilterSort
                                                hideEbatFilters={false}
                                                categorySlug={slug}
                                            />
                                        </Col>
                                        <Col md={12}>
                                            <CategoryTireSearch />
                                        </Col>

                                        <Col md={12}>
                                            <CategoryTop
                                                productCount={displayProductCount}
                                                categoryName={displayName}
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