'use client';

import React from 'react';
import { Col, Container, Row } from 'react-bootstrap';

interface PageData {
    _id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    seo: {
        metaTitle: string;
        metaDescription: string;
        metaKeywords: string[];
    };
    status: string;
    template: string;
}

interface PageDetailProps {
    page: PageData;
}

export default function PageDetail({ page }: PageDetailProps) {
    return (
        <section id="page__detail" className="py-4">
            <Container>
                <div className="row-fluid">
                    <Row>
                        <Col lg={12}>
                            <div
                                className="page-content"
                                dangerouslySetInnerHTML={{ __html: page.content }}
                            />
                        </Col>
                    </Row>
                </div>
            </Container>
        </section>
    );
}