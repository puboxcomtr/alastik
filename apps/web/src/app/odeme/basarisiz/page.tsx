'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Container, Row, Col } from 'react-bootstrap';
import { ROUTES } from '@/src/config/routes';
import { useDefinition } from '@/src/hooks/Theme/useDefinition';

export default function PaymentFailedPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { definition } = useDefinition();
    const error = searchParams.get('error') || 'Ödeme işlemi tamamlanamadı';
    const [isValidAccess, setIsValidAccess] = useState(false);

    useEffect(() => {
        let metaRobots = document.querySelector('meta[name="robots"]') as HTMLMetaElement;
        if (!metaRobots) {
            metaRobots = document.createElement('meta');
            metaRobots.setAttribute('name', 'robots');
            document.head.appendChild(metaRobots);
        }
        metaRobots.setAttribute('content', 'noindex, nofollow');

        const referrer = document.referrer;
        const isFromOurSite = referrer.includes('alastik.com') || referrer.includes('localhost');

        if (!isFromOurSite && !searchParams.get('error')) {
            router.push(ROUTES.HOME);
            return;
        }

        setIsValidAccess(true);
    }, [router, searchParams]);

    if (!isValidAccess) {
        return null;
    }

    const phoneNumber = definition?.companyInfo?.phone || '0212 212 12 12';
    const phoneLink = phoneNumber.replace(/\s/g, '');
    return (
        <Container>
            <Row className="row-fluid">
                <Col lg="12">
                    <div className="card border-0">
                        <div className='card-body border mt-4 rounded'>
                            <div className="d-flex text-center justify-content-center align-items-center flex-column" style={{ minHeight: '400px' }}>
                                <div className="text-danger" style={{ fontSize: '80px' }}>
                                    <i className="ri-close-circle-fill"></i>
                                </div>
                                <h5 className='mb-1'>{error}</h5>
                                <p>
                                    Ödeme Sırasında Bir Hata Oluştu.
                                </p>
                                <div className="d-flex gap-3 flex-wrap justify-content-center">
                                    <Link href={ROUTES.HOME} className="btn btn-primary">
                                        <i className="ri-home-line me-2"></i>
                                        Anasayfa
                                    </Link>
                                    <Link href={ROUTES.HOME} className="btn btn-outline-secondary">
                                        <i className="ri-refresh-line me-2"></i>
                                        Alışverişe Devam Et
                                    </Link>
                                </div>
                                <div className="mt-4">
                                    <span className="text-muted small fs-2x">
                                        Bizimle iletişime geçmek için <a className='text-primary animate-underline animate-target' href={`tel:+9${phoneLink}`}>{phoneNumber}</a> arayabilir veya <span className="fw-semibold">canlı destek</span> aracılığıyla bize ulaşabilirsiniz.
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Col>
            </Row>
        </Container>
    );
}