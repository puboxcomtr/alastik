import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';

export default function UnderConstruction() {
    return (
        <div
            className="under-construction d-flex align-items-center justify-content-center bg-light"
            style={{ minHeight: '100vh' }}
        >
            <Container>
                <Row className="justify-content-center text-center">
                    <Col md={8} lg={6}>
                        <div className="p-5">
                            <div className="mb-4">
                                <i
                                    className="ri-tools-fill text-primary"
                                    style={{ fontSize: '5rem' }}
                                ></i>
                            </div>
                            <h1 className="display-5 fw-bold mb-3">Yapım Aşamasında</h1>
                            <p className="lead text-muted mb-4">
                                Sitemiz şu anda bakım ve geliştirme çalışmaları nedeniyle geçici olarak kapalıdır.
                                En kısa sürede sizlerle tekrar buluşacağız.
                            </p>
                            <div className="d-flex justify-content-center gap-3">
                                <a href="mailto:info@alastik.com" className="btn btn-outline-primary">
                                    <i className="ri-mail-line me-2"></i>
                                    İletişim
                                </a>
                            </div>
                            <p className="text-muted mt-4 small">
                                Anlayışınız için teşekkür ederiz.
                            </p>
                        </div>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}