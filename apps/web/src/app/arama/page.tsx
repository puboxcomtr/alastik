import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { fetchAPI, API_ENDPOINTS } from '@/src/config/api';
import { getShowcaseSettings } from '@/src/services/settingsService';


import Breadcrumb from "@components/search/Header/Breadcrumb";
import Sidebar from "@/src/components/category/Sidebar/Content";
import CategoryTop from '@components/category/Top/Content';
import MobileFilterSort from '@components/category/Top/MobileFilterSort';
import Pagination from '@/src/components/category/Pagination/MainPagination';
import { ViewModeProvider } from '@/src/context/ViewModeContext';
import ViewModeProductList from '@components/shop/Product/Showcase/Mode';

interface Props {
    searchParams: Promise<{ [key: string]: string | undefined }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
    const params = await searchParams;
    const q = params.q || '';

    return {
        title: q ? `"${q}" Arama Sonuçları | ALastik.com` : 'Arama | ALastik.com',
        description: q ? `${q} ile ilgili lastik, jant ve aksesuar arama sonuçları.` : 'Ürün arama sayfası',
        robots: { index: false, follow: false }
    };
}

export default async function SearchPage({ searchParams }: Props) {
    const params = await searchParams;
    const q = params.q || '';

    if (!q || q.length < 2) {
        redirect('/');
    }

    const showcaseSettings = await getShowcaseSettings();
    const currentPage = parseInt(params.page || '1');
    const perPage = showcaseSettings.productsPerPage || 24;

    // Backend'e filtre parametrelerini de gönder
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