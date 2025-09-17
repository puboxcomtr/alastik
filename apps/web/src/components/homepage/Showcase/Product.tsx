'use client';
import React from 'react';
import Link from 'next/link';

// Components
import ProductCard from '@components/shop/Product/Showcase/Card';
import Title from '@components/shop/Product/Showcase/Title'
import { Container, Row, Col } from 'react-bootstrap';

export default function ProductShowCase() {
    return (
        <Container className="row-fluid">
            <Row>
                <Title />
            </Row>
            <Row className="row-cols-2 row-cols-md-3 row-cols-lg-4 g-4 mt-2">
                <Col>
                    <ProductCard />
                </Col>
                <Col>
                    <ProductCard />
                </Col>
                <Col>
                    <ProductCard />
                </Col>
                <Col>
                    <ProductCard />
                </Col>
                <Col>
                    <ProductCard />
                </Col>
                <Col>
                    <ProductCard />
                </Col>
                <Col>
                    <ProductCard />
                </Col>
                <Col>
                    <ProductCard />
                </Col>
                <Col>
                    <ProductCard />
                </Col>
                <Col>
                    <ProductCard />
                </Col>
                <Col>
                    <ProductCard />
                </Col>
                <Col>
                    <ProductCard />
                </Col>
            </Row>
        </Container>
    );
}