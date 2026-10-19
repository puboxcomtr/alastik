'use client';

import React from 'react';
import BlogBreadcrumb from './Top/Breadcrumb';
import RightSidebar from './Sidebar/RightSidebar';
import { Col, Container, Row } from 'react-bootstrap';

interface BlogData {
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
    publishedAt: string;
    viewCount: number;
    featuredImage?: string;
    tags?: string[];
}

interface BlogDetailProps {
    blog: BlogData;
}

export default function BlogDetail({ blog }: BlogDetailProps) {
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <>
            <section id="breadcumb">
                <Container>
                    <div className='row-fluid'>
                        <Row>
                            <Col lg={12}>
                                <BlogBreadcrumb blogTitle={blog.title} />
                            </Col>
                        </Row>
                    </div>
                </Container>
            </section>
            <section id="blog__detail">
                <Container>
                    <div className='row-fluid'>
                        <Row>
                            <Col lg={9}>
                                <h1 className="blog__title mb-3" style={{ fontSize: '1.75rem', fontWeight: 700 }}>
                                    {blog.title}
                                </h1>
                                <div className="d-flex align-items-center gap-3 text-muted mb-4" style={{ fontSize: '0.875rem' }}>
                                    {blog.publishedAt && (
                                        <span className='d-flex gap-1'>
                                            <i className="ri-calendar-line"></i>
                                            {formatDate(blog.publishedAt)}
                                        </span>
                                    )}
                                    {blog.viewCount > 0 && (
                                        <span className='d-flex gap-1'>
                                            <i className="ri-eye-line"></i>
                                            {blog.viewCount} görüntülenme</span>
                                    )}
                                </div>
                                <div
                                    className="blog-content"
                                    dangerouslySetInnerHTML={{ __html: blog.content }}
                                />
                                {blog.tags && blog.tags.length > 0 && (
                                    <div className="mt-4 pt-3 border-top">
                                        <div className="d-flex flex-wrap gap-2">
                                            {blog.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="badge bg-light text-dark border"
                                                    style={{ fontSize: '0.8rem' }}
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Col>
                            <Col lg={3}>
                                <RightSidebar />
                            </Col>
                        </Row>
                    </div>
                </Container>
            </section >
        </>
    );
}