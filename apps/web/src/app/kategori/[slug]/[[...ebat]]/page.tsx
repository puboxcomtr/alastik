import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

import { getCategory, getCategoryMenus, getCategoryWithSize, getParentCategory } from '@/src/services/categoryService';
import { isSecondHandCategory, SECOND_HAND_CONDITION } from '@/src/config/productCondition';
import { filterProducts } from '@/src/services/productService';
import { getShowcaseSettings, getServicePoints } from '@/src/services/settingsService';
import { getSeo } from '@/src/services/seoService';
import { applyTemplate } from '@/src/utils/seoTemplate';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';
import Link from 'next/link';
import { BRANCHES } from '@/src/data/lja/subeler';
import { SERVICE_GROUPS } from '@/src/data/lja/hizmetGruplari';

import AlastikSidebar from "@components/alastik/category/Sidebar/Content";
import AlastikBreadcrumb from "@components/alastik/category/Header/Breadcrumb";
import AlastikCategorySlider from '@components/alastik/category/Top/Slider';
import AlastikCategoryMenu from '@components/alastik/category/Top/CategoryMenu';
import AlastikCategoryTop from '@components/alastik/category/Top/Content';
import AlastikCategoryTireSearch from '@components/alastik/category/Top/CategoryTireSearch';
import AlastikMobileFilterSort from '@components/alastik/category/Top/MobileFilterSort';
import AlastikPagination from '@components/alastik/category/Pagination/MainPagination';

import LjaSidebar from "@components/lastikjantavm/category/Sidebar/Content";
import LjaBreadcrumb from "@components/lastikjantavm/category/Header/Breadcrumb";
import LjaCategorySlider from '@components/lastikjantavm/category/Top/Slider';
import LjaCategoryMenu from '@components/lastikjantavm/category/Top/CategoryMenu';
import LjaMobileCategoryMenus from '@components/lastikjantavm/category/Top/MobileCategoryMenus';
import LjaCategoryTop from '@components/lastikjantavm/category/Top/Content';
import LjaCategoryTireSearch from '@components/lastikjantavm/category/Top/CategoryTireSearch';
import LjaMobileFilterSort from '@components/lastikjantavm/category/Top/MobileFilterSort';
import LjaPagination from '@components/lastikjantavm/category/Pagination/MainPagination';

import { parseTireSize } from '@/src/config/routes';

import { ViewModeProvider } from '@/src/context/ViewModeContext';

import AlastikViewModeProductList from '@components/alastik/shop/Product/Showcase/Mode';
import LjaViewModeProductList from '@components/lastikjantavm/shop/Product/Showcase/Mode';

interface Props {
    params: Promise<{
        slug: string;
        ebat?: string[]
    }>;
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

function isValidSizeSlug(ebat?: string[]): boolean {
    if (!ebat || ebat.length === 0) return true;
    if (ebat.length > 1) return false;
    return /^[0-9.]+-[0-9.]+-r?[0-9.]+[a-z]?$/i.test(ebat[0]);
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
    const { slug, ebat } = await params;
    const category = await getCategory(slug);

    if (!category || !isValidSizeSlug(ebat)) {
        return {
            title: 'Kategori Bulunamadı',
            description: 'Aradığınız kategori bulunamadı.'
        };
    }

    const seo = await getSeo();
    const tpl = seo?.category;
    const seoMeta = await canonicalMeta(
        `/kategori/${slug}${ebat && ebat.length ? `/${ebat[0]}` : ''}`,
        await searchParams
    );

    if (!ebat || ebat.length === 0) {
        const vars = {
            'kategori-adi': category.name,
            'kategori-aciklamasi': (category.description && category.description.length >= 50)
                ? category.description
                : `${category.name} modelleri ve güncel fiyatları. ${category.name} kategorisindeki ürünleri inceleyin, size uygun olanı seçin.`
        };
        const title = category.seoTitle
            ? category.seoTitle
            : (applyTemplate(tpl?.titleTemplate, vars) || category.name);
        const description = category.seoDescription
            ? category.seoDescription
            : (applyTemplate(tpl?.descriptionTemplate, vars) || vars['kategori-aciklamasi']);
        return {
            title,
            description,
            keywords: applyTemplate(tpl?.keywordsTemplate, vars) || category.seoKeywords?.join(', '),
            ...seoMeta
        };
    }

    const ebatSlug = ebat[0];
    const { formatted } = parseTireSize(ebatSlug);
    const varsEbat = {
        'kategori-adi': `${category.name} ${formatted}`,
        'kategori-aciklamasi': `${category.name} kategorisinde ${formatted} ebadında lastik modellerini inceleyin.`
    };
    return {
        title: applyTemplate(tpl?.titleTemplate, varsEbat) || `${category.name} ${formatted}`,
        description: applyTemplate(tpl?.descriptionTemplate, varsEbat) || varsEbat['kategori-aciklamasi'],
        keywords: applyTemplate(tpl?.keywordsTemplate, varsEbat) || [...(category.seoKeywords || []), formatted, 'lastik'].join(', '),
        ...seoMeta
    };
}

export default async function CategoryPage({ params, searchParams }: Props) {
    const site = headers().get('x-site') || 'alastik';
    const Sidebar = site === 'lastikjantavm' ? LjaSidebar : AlastikSidebar;
    const Breadcrumb = site === 'lastikjantavm' ? LjaBreadcrumb : AlastikBreadcrumb;
    const CategorySlider = site === 'lastikjantavm' ? LjaCategorySlider : AlastikCategorySlider;
    const CategoryMenu = site === 'lastikjantavm' ? LjaCategoryMenu : AlastikCategoryMenu;
    const CategoryTop = site === 'lastikjantavm' ? LjaCategoryTop : AlastikCategoryTop;
    const CategoryTireSearch = site === 'lastikjantavm' ? LjaCategoryTireSearch : AlastikCategoryTireSearch;
    const MobileFilterSort = site === 'lastikjantavm' ? LjaMobileFilterSort : AlastikMobileFilterSort;
    const Pagination = site === 'lastikjantavm' ? LjaPagination : AlastikPagination;
    const ViewModeProductList = site === 'lastikjantavm' ? LjaViewModeProductList : AlastikViewModeProductList;

    const { slug, ebat } = await params;
    const filters = await searchParams;

    if (!isValidSizeSlug(ebat)) {
        notFound();
    }

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

    const categoryMenus = await getCategoryMenus((category as any).menuIds);

    const showcaseSettings = await getShowcaseSettings();

    const servicePoints = await getServicePoints();

    const currentPage = parseInt(filters.page || '1');

    const productsData = await filterProducts({
        category: slug,
        genislik: filters.genislik || sizeInfo?.genislik,
        yukseklik: filters.yanak || sizeInfo?.yukseklik,
        cap: filters.jant || sizeInfo?.cap,
        oem: filters.oem,
        mevsim: filters.mevsim,
        ozellik: filters.ozellik,
        yukEndeksi: filters.yukEndeksi,
        hizEndeksi: filters.hizEndeksi,
        uretim: filters.uretim,
        jantCap: filters.jantCap,
        bijon: filters.bijon,
        arac: filters.arac,
        marka: filters.marka,
        fiyatMin: filters.fiyatMin ? parseInt(filters.fiyatMin) : undefined,
        fiyatMax: filters.fiyatMax ? parseInt(filters.fiyatMax) : undefined,
        page: currentPage,
        limit: showcaseSettings.productsPerPage,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
    });

    const displayProductCount = productsData?.pagination?.totalProducts ?? category.activeProductCount;

    const hasExtraFilters = Object.keys(filters).some(k => k !== 'page' && filters[k]);
    if (hasSize && !hasExtraFilters && productsData?.pagination?.totalProducts === 0) {
        notFound();
    }

    const breadcrumbLd = breadcrumbJsonLd(await getSiteOrigin(), [
        ...(parentCategory ? [{ name: parentCategory.name, path: `/kategori/${parentCategory.slug}` }] : []),
        { name: displayName, path: `/kategori/${slug}` },
        ...(sizeInfo ? [{ name: sizeInfo.formatted }] : [])
    ]);

    const serviceGroup = site === 'lastikjantavm' ? SERVICE_GROUPS.find(g => g.categorySlug === slug) : undefined;
    const isServiceRoot = site === 'lastikjantavm' && slug === 'hizmetlerimiz';

    return (
        <>
            <JsonLd data={breadcrumbLd} />
            {(serviceGroup || isServiceRoot) && (
                <Container>
                    <p className="small text-muted my-2">
                        {'Şubelerimizde: '}
                        {BRANCHES.map((b, i) => (
                            <React.Fragment key={b.slug}>
                                {i > 0 && ' · '}
                                <Link
                                    href={serviceGroup ? `/subeler/${b.slug}/${serviceGroup.slug}` : `/subeler/${b.slug}`}
                                    className="text-reset"
                                >
                                    {serviceGroup ? `${b.shortName} ${serviceGroup.name}` : b.title}
                                </Link>
                            </React.Fragment>
                        ))}
                    </p>
                </Container>
            )}
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
                                <Col
                                 lg={3} className="mt-4 order-2 order-lg-1">
                                    <div className="d-none d-md-block">
                                        {categoryMenus.map((menu: any) => (
                                            <CategoryMenu key={menu._id} menu={menu} />
                                        ))}
                                    </div>
                                    <Sidebar hideEbatFilters={false} categorySlug={slug} hiddenFilters={category.hiddenFilters || []} />
                                </Col>
                                <Col lg={9} className="order-1 order-lg-2">
                                    <Row>
                                        <Col md={12}>
                                            <Col md={12}>
                                                <CategorySlider sliderId={category.sliderId} />
                                            </Col>
                                        </Col>
                                        <Col md={12}>
                                            {site === 'lastikjantavm' && (
                                                <LjaMobileCategoryMenus menus={categoryMenus} />
                                            )}
                                        </Col>
                                        <Col md={12}>
                                            <MobileFilterSort
                                                hideEbatFilters={false}
                                                categorySlug={slug}
                                                hiddenFilters={category.hiddenFilters || []}
                                            />
                                        </Col>
                                        <Col md={12}>
                                            <CategoryTireSearch condition={isSecondHandCategory(category) ? SECOND_HAND_CONDITION : undefined} />
                                        </Col>

                                        <Col md={12}>
                                            <CategoryTop
                                                productCount={displayProductCount}
                                                categoryName={displayName}
                                            />
                                        </Col>
                                    </Row>

                                    <ViewModeProductList products={productsData?.products || []} servicePoints={servicePoints} />
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
                                <Col lg={12} className="order-3">
                                    {category.siteContentHtml && (
                                        <Row>
                                            <Col md={12}>
                                                <div
                                                    className="category-seo-content mt-4"
                                                    dangerouslySetInnerHTML={{ __html: category.siteContentHtml }}
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