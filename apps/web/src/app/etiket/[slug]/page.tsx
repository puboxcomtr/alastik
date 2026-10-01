/* Library */
import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { Metadata } from 'next';
import SecondHandBanner from '@/src/components/category/SecondHandBanner';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';

/* Services */
import tagService from '@/src/services/tagService';
import { getShowcaseSettings } from '@/src/services/settingsService';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, breadcrumbJsonLd } from '@/src/lib/structuredData';
import VehiclesForSize from '@/src/components/lastikjantavm/seo/VehiclesForSize';
import { siteTitle } from '@/src/lib/siteMeta';

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

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
    const { slug } = await params;
    const filters = await searchParams;
    const tag = await tagService.getTagBySlug(slug);

    // Etiket yoksa sayfa 404 döner (notFound). Eski kod burada null tag'in alanlarını okuyup 500 veriyordu.
    if (!tag) {
        return { title: 'Etiket Bulunamadı' };
    }

    // canonicalMeta: ?durum=ikinci-el dahil her filtre/sıralama parametresi noindex,follow olur
    // (ikinci el görünümü sıfır lastik sayfasının kopyasıdır)
    return {
        title: tag.seoTitle || siteTitle(tag.title),
        description: tag.seoDescription || `${tag.title} - En uygun lastik fiyatları ve modelleri.`,
        ...(await canonicalMeta(`/etiket/${slug}`, filters)),
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

    const breadcrumbLd = breadcrumbJsonLd(await getSiteOrigin(), [{ name: tag.title }]);

    return (
        <>
            <JsonLd data={breadcrumbLd} />
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
                                                categoryName={activeCondition === 'ikinci-el'
                                                    ? `${sizeLabel} İkinci El ${conditionLabel} Fiyatları`
                                                    : tag.title}
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

                                    {/* İkinci el görünümüne geçiş banner'ı (sıfır görünümünde, 2.el ürün varsa) */}
                                    {showConditionTabs && activeCondition === 'sifir' && (
                                        <Row>
                                            <Col md={12}>
                                                <SecondHandBanner
                                                    href={`/etiket/${slug}?durum=ikinci-el`}
                                                    text={'İhtiyacınız olan ebatta garantili 2. el lastik seçeneklerini görmek için'}
                                                    accent={site === 'lastikjantavm' ? '#e4cc15' : '#f2223b'}
                                                    accentText={site === 'lastikjantavm' ? '#232323' : '#ffffff'}
                                                />
                                            </Col>
                                        </Row>
                                    )}
                                </Col>
                                <Col lg={12} className="order-3">
                                    {/* LJA lastik ebadı etiketleri: bu ebadı kullanan araçlar */}
                                    {site === 'lastikjantavm' && tag.type === 'tire_size' && (
                                        <VehiclesForSize
                                            sizeKey={currentSize}
                                            sizeLabel={currentSize.replace(/^(\d+)-(\d+)-r(.+)$/i, (_m, w, a, d) => `${w}/${a} R${String(d).toUpperCase()}`)}
                                        />
                                    )}
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