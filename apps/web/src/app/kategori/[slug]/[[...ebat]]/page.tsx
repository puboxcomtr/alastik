/* Library */
import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

/* Services */
import { getCategory, getCategoryMenus, getCategoryWithSize, getParentCategory } from '@/src/services/categoryService';
import { filterProducts } from '@/src/services/productService';
import { getShowcaseSettings } from '@/src/services/settingsService';
import { getSeo } from '@/src/services/seoService';
import { applyTemplate } from '@/src/utils/seoTemplate';

/* Components - ALastik */
import AlastikSidebar from "@components/alastik/category/Sidebar/Content";
import AlastikBreadcrumb from "@components/alastik/category/Header/Breadcrumb";
import AlastikCategorySlider from '@components/alastik/category/Top/Slider';
import AlastikCategoryMenu from '@components/alastik/category/Top/CategoryMenu';
import AlastikCategoryTop from '@components/alastik/category/Top/Content';
import AlastikCategoryTireSearch from '@components/alastik/category/Top/CategoryTireSearch';
import AlastikMobileFilterSort from '@components/alastik/category/Top/MobileFilterSort';
import AlastikPagination from '@components/alastik/category/Pagination/MainPagination';

/* Components - LastikJantAVM */
import LjaSidebar from "@components/lastikjantavm/category/Sidebar/Content";
import LjaBreadcrumb from "@components/lastikjantavm/category/Header/Breadcrumb";
import LjaCategorySlider from '@components/lastikjantavm/category/Top/Slider';
import LjaCategoryMenu from '@components/lastikjantavm/category/Top/CategoryMenu';
import LjaCategoryTop from '@components/lastikjantavm/category/Top/Content';
import LjaCategoryTireSearch from '@components/lastikjantavm/category/Top/CategoryTireSearch';
import LjaMobileFilterSort from '@components/lastikjantavm/category/Top/MobileFilterSort';
import LjaPagination from '@components/lastikjantavm/category/Pagination/MainPagination';

/* Utils */
import { parseTireSize } from '@/src/config/routes';

/* Context */
import { ViewModeProvider } from '@/src/context/ViewModeContext';

/* Product Mode */
import AlastikViewModeProductList from '@components/alastik/shop/Product/Showcase/Mode';
import LjaViewModeProductList from '@components/lastikjantavm/shop/Product/Showcase/Mode';

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
            title: 'Kategori Bulunamadı',
            description: 'Aradığınız kategori bulunamadı.'
        };
    }

    const seo = await getSeo();
    const tpl = seo?.category;

    if (!ebat || ebat.length === 0) {
        const vars = {
            'kategori-adi': category.name,
            'kategori-aciklamasi': category.description || `${category.name} kategorisinde en uygun lastik modellerini keşfedin.`
        };
        const title = category.seoTitle
            ? category.seoTitle
            : (applyTemplate(tpl?.titleTemplate, vars) || category.name);
        const description = category.description
            ? category.description
            : (applyTemplate(tpl?.descriptionTemplate, vars) || vars['kategori-aciklamasi']);
        return {
            title,
            description,
            keywords: applyTemplate(tpl?.keywordsTemplate, vars) || category.seoKeywords?.join(', ')
        };
    }

    // Ebatli kategori
    const ebatSlug = ebat[0];
    const { formatted } = parseTireSize(ebatSlug);
    const varsEbat = {
        'kategori-adi': `${category.name} ${formatted}`,
        'kategori-aciklamasi': `${category.name} kategorisinde ${formatted} ebadında lastik modellerini inceleyin.`
    };
    return {
        title: applyTemplate(tpl?.titleTemplate, varsEbat) || `${category.name} ${formatted}`,
        description: applyTemplate(tpl?.descriptionTemplate, varsEbat) || varsEbat['kategori-aciklamasi'],
        keywords: applyTemplate(tpl?.keywordsTemplate, varsEbat) || [...(category.seoKeywords || []), formatted, 'lastik'].join(', ')
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

    // Kategoriye bağlı menüler (seçilmemişse boş dizi döner)
    const categoryMenus = await getCategoryMenus((category as any).menuIds);

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
                                <Col
                                 lg={3} className="mt-4">
                                    {categoryMenus.map((menu: any) => (
                                        <CategoryMenu key={menu._id} menu={menu} />
                                    ))}
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
                                <Col lg={12}>
                                    {/* Kategori SEO Icerigi (site bazli) */}
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