'use client';

import React from 'react';
import { Col, Row } from 'react-bootstrap';
import ProductCard from '@/src/components/shop/Product/Showcase/Card';

type Props = {
    items: any[];
    loading?: boolean;
};

export default function FavouritesContent({ items, loading }: Props) {
    return (
        <div className="border-bottom my-3 py-4">
            <div className="nav flex-nowrap align-items-center justify-content-between pb-1 mb-3">
                <h2 className="h6 mb-0 text-primary">Favorilerim</h2>
            </div>

            {loading ? (
                <div className="text-center py-4">
                    <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Yükleniyor...</span>
                    </div>
                </div>
            ) : !items || items.length === 0 ? (
                <div className="text-center py-4">
                    Henüz favori ürününüz bulunmamaktadır.
                </div>
            ) : (
                <Row className="row-cols-2 row-cols-md-3 row-cols-lg-3">
                    {items.map((item) => (
                        <Col key={item._key} className="px-2">
                            <ProductCard product={item} />
                        </Col>
                    ))}
                </Row>
            )}
        </div>
    );
}