import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { fetchAPI, API_ENDPOINTS } from '@/src/config/api';
import { getShowcaseSettings } from '@/src/services/settingsService';

import { getOtherSeo } from '@/src/services/seoService';

import Breadcrumb from "@components/search/Header/Breadcrumb";

import AlastikSidebar from '@components/alastik/category/Sidebar/Content';
import AlastikCategoryTop from '@components/alastik/category/Top/Content';
import AlastikMobileFilterSort from '@components/alastik/category/Top/MobileFilterSort';
import AlastikPagination from '@components/alastik/category/Pagination/MainPagination';

import LjaSidebar from '@components/lastikjantavm/category/Sidebar/Content';
import LjaCategoryTop from '@components/lastikjantavm/category/Top/Content';
import LjaMobileFilterSort from '@components/lastikjantavm/category/Top/MobileFilterSort';
import LjaPagination from '@components/lastikjantavm/category/Pagination/MainPagination';

import { ViewModeProvider } from '@/src/context/ViewModeContext';
import AlastikViewModeProductList from '@components/alastik/shop/Product/Showcase/Mode';
import LjaViewModeProductList from '@components/lastikjantavm/shop/Product/Showcase/Mode';

interface Props {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const params = await searchParams;
    const q = params.q || '';
    if (q) {
        const base = await getOtherSeo('productSearch', true);
        const siteName = base.title?.split('|').pop()?.trim() || '';
        return {
            ...base,
            title: siteName ? `"${q}" Arama Sonuçları | ${siteName}` : `"${q}" Arama Sonuçları`,
            description: `${q} ile ilgili lastik, jant ve aksesuar arama sonuçları.`,
        };
    }

    return await getOtherSeo('productSearch', true);
}

export default async function SearchPage({ searchParams }: Props) {
    const site = headers().get('x-site') || 'alastik';
    const Sidebar = site === 'lastikjantavm' ? LjaSidebar : AlastikSidebar;
    const CategoryTop = site === 'lastikjantavm' ? LjaCategoryTop : AlastikCategoryTop;
    const MobileFilterSort = site === 'lastikjantavm' ? LjaMobileFilterSort : AlastikMobileFilterSort;
    const Pagination = site === 'lastikjantavm' ? LjaPagination : AlastikPagination;
    const ViewModeProductList = site === 'lastikjantavm' ? LjaViewModeProductList : AlastikViewModeProductList;

    const params = await searchParams;
    const q = params.q || '';

    if (!q || q.length < 2) {
        redirect('/');
    }

    const showcaseSettings = await getShowcaseSettings();
    const currentPage = parseInt(params.page || '1');
    const perPage = showcaseSettings.productsPerPage || 24;

    const queryParams = new URLSearchParams();
    queryParams.set('q', q);
    queryParams.set('page', String(currentPage));
    queryParams.set('limit', String(perPage));

    const filterKeys = ['marka', 'mevsim', 'ozellik', 'yukEndeksi', 'hizEndeksi', 'uretim', 'fiyatMin', 'fiyatMax', 'arac', 'oem', 'sortBy', 'sortOrder', 'genislik', 'yanak', 'yukseklik', 'jant', 'cap'];
    filterKeys.forEach(key => {
        const val = params[key];
        if (val) queryParams.set(key, val);
    });

    const response = await fetchAPI(
        `${API_ENDPOINTS.search.results()}?${queryParams.toString()}`
    );

    const products = response?.data?.products || [];
    const pagination = response?.data?.pagination || {
        currentPage: 1,
        totalPages: 0,
        totalProducts: 0
    };

    return (
        <>
            <section id="breadcumb">
                <Container>
                    <div className="row-fluid">
                        <Row>
                            <Col lg={12}>
                                <Breadcrumb query={q} />
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
                                    <Sidebar searchQuery={q} />
                                </Col>
                                <Col lg={9}>
                                    <Row>
                                        <Col md={12}>
                                            <MobileFilterSort />
                                        </Col>
                                        <Col md={12}>
                                            <CategoryTop
                                                productCount={pagination.totalProducts}
                                                categoryName={`"${q}" için arama sonuçları`}
                                            />
                                        </Col>
                                    </Row>

                                    {products.length > 0 ? (
                                        <ViewModeProductList products={products} />
                                    ) : (
                                        <div className="text-center py-5">
                                            <h5>Aramanızla eşleşen ürün bulunamadı.</h5>
                                            <p className="text-muted">Farklı bir arama terimi deneyebilirsiniz.</p>
                                        </div>
                                    )}

                                    {pagination.totalPages > 1 && (
                                        <Row>
                                            <Col md={12}>
                                                <Pagination
                                                    currentPage={pagination.currentPage}
                                                    totalPages={pagination.totalPages}
                                                    totalProducts={pagination.totalProducts}
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