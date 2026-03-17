"use client";
import { Col, Row } from "react-bootstrap";
import ProductCard from "@components/shop/Product/Showcase/Card";
import OneColumn from "@components/shop/Product/Showcase/View/OneColumn";
import { useViewMode } from "@/src/context/ViewModeContext";

interface Props {
    products: any[];
}

export default function ViewModeProductList({ products }: Props) {
    const { viewMode } = useViewMode();

    if (!products || products.length === 0) {
        return (
            <Col md={12} className="text-center py-5">
                <p className="text-muted">Bu filtreye uygun ürün bulunamadı.</p>
            </Col>
        );
    }

    if (viewMode === 'list') {
        return (
            <Row>
                {products.map((product) => (
                    <Col key={product._key} xs={12} className="px-2 mb-3">
                        {/* Tekli görünüm buraya gelecek */}
                        <OneColumn product={product} />
                    </Col>
                ))}
            </Row>
        );
    }

    return (
        <Row className="row-cols-2 row-cols-md-3 row-cols-lg-3">
            {products.map((product) => (
                <Col key={product._key} className="px-2">
                    <ProductCard product={product} />
                </Col>
            ))}
        </Row>
    );
}