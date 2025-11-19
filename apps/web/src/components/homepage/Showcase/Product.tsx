'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

// Components
import ProductCard from '@components/shop/Product/Showcase/Card';
import Title from '@components/shop/Product/Showcase/Title';
import { Container, Row, Col } from 'react-bootstrap';

// Services
import { getRandomProducts } from '@src/services/productService';

// Types
import type { Product } from '@/src/types/products';

export default function ProductShowCase() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const randomProducts = await getRandomProducts(3);
                setProducts(randomProducts);
            } catch (error) {
                console.error('Ürünler yüklenemedi:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    if (loading) {
        return (
            <Container className="row-fluid">
                <Row>
                    <Col className="text-center py-5">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Yükleniyor...</span>
                        </div>
                    </Col>
                </Row>
            </Container>
        );
    }
    if (!products || products.length === 0) {
        return null;
    }

    return (
        <Container className="row-fluid">
            <Row>
                <Title />
            </Row>
            <Row className="row-cols-2 row-cols-md-3 row-cols-lg-4 g-4 mt-2">
                {products.map((product) => (
                    <Col key={product._key}>
                        <ProductCard product={product} />
                    </Col>
                ))}
            </Row>
        </Container>
    );
}