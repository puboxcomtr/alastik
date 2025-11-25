'use client';
import React, { useEffect, useState } from 'react';

// Components
import ProductCard from '@components/shop/Product/Showcase/Card';
import Title from '@components/shop/Product/Showcase/Title';
import { Container, Row, Col } from 'react-bootstrap';

// Types
import type { Product } from '@/src/types/products';

type ShowcaseData = {
    key: string
    title: string
    subtitle: string
    itemsPerRow: number
    products: Product[]
}

type Props = {
    showcaseKey?: 'first' | 'second' | 'third' | 'fourth' | 'fifth'
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api'

export default function ProductShowCase({ showcaseKey = 'second' }: Props) {
    const [showcase, setShowcase] = useState<ShowcaseData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchShowcase();
    }, [showcaseKey]);

    const fetchShowcase = async () => {
        try {
            const res = await fetch(`${API_URL}/showcases/public/homepage`)
            const result = await res.json()

            if (result.success && result.data) {
                const found = result.data.find((s: ShowcaseData) => s.key === showcaseKey)
                setShowcase(found || null)
            }
        } catch (error) {
            console.error('Vitrin yüklenemedi:', error);
        } finally {
            setLoading(false);
        }
    };

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

    if (!showcase || !showcase.products || showcase.products.length === 0) {
        return null;
    }

    // Grid column class hesapla
    const getColClass = () => {
        switch (showcase.itemsPerRow) {
            case 1: return 'row-cols-1';
            case 2: return 'row-cols-1 row-cols-md-2';
            case 3: return 'row-cols-2 row-cols-md-3';
            case 4: return 'row-cols-2 row-cols-md-3 row-cols-lg-4';
            case 5: return 'row-cols-2 row-cols-md-3 row-cols-lg-5';
            default: return 'row-cols-2 row-cols-md-3 row-cols-lg-4';
        }
    };

    return (
        <Container className="row-fluid py-4">
            <Row>
                <Col>
                    <Title
                        title={showcase.title}
                        subtitle={showcase.subtitle}
                    />
                </Col>
            </Row>
            <Row className={`${getColClass()} g-4 mt-2`}>
                {showcase.products.map((product) => (
                    <Col key={product._key}>
                        <ProductCard product={product} />
                    </Col>
                ))}
            </Row>
        </Container>
    );
}