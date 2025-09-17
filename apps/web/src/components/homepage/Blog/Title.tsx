import React from 'react';
import Link from 'next/link'

/* Components */
import BlogList from '@components/homepage/Blog/List'
import { Container, Row, Col } from 'react-bootstrap';

export default function Title() {
    return (
        <>
            <Col xs="auto">
                <h2 className="h3 mb-0">Bizden Haberler</h2>
            </Col>
            <Col className="d-flex justify-content-end">
                <Link
                    href="/category-detail"
                    className="nav-link animate-underline px-0 py-2 d-inline-flex align-items-center">
                    <span className="animate-target">Tümünü Gör</span>
                    <i className="ci-chevron-right fs-base ms-1"></i>
                </Link>
            </Col>
        </>
    );
}