
/* Library */
import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';

/* @Import Page */
import Sidebar from "@/src/components/category/Sidebar/Content";
import Breadcrumb from "@/src/components/category/Header/Breadcrumb";
import ProductCard from '@components/shop/Product/Showcase/Card';
import CategorySlider from '@components/category/Top/Slider';
import CategoryTop from '@components/category/Top/Content';
import CategoryTireSearch from '@components/category/Top/CategoryTireSearch';
interface CategoryPageProps {
    params: {
        slug: string;
    };
}

export default async function CategoryDetailPage(
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    return (
        <Container style={{ background: "#f6f6f6" }}>
            <Row className="row-fluid">
                <Row className="my-3">
                    <Col className="px-4">
                        <Breadcrumb categorySlug={slug} />
                    </Col>
                </Row>
                <Row>
                    <Col lg={3}>
                        <Sidebar />
                    </Col>
                    <Col lg={9}>
                        <Row>
                            <Col md={12} >
                                <CategorySlider />
                            </Col>
                            <Col md={12} >
                                <CategoryTireSearch />
                            </Col>
                            <Col md={12} >
                                <CategoryTop />
                            </Col>
                        </Row>
                        <Row className="row-cols-2 row-cols-md-3 row-cols-lg-3">
                            {Array.from({ length: 20 }).map((_, i) => (
                                <Col key={i} className="px-2">
                                    <ProductCard />
                                </Col>
                            ))}
                        </Row>
                    </Col>
                </Row>
            </Row>
        </Container>
    );
}
