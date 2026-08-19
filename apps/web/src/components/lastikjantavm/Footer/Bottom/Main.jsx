'use client';
import React, { useEffect, useState } from 'react';

import Link from "next/link";
import Image from "next/image";

import { Container, Row, Col } from 'react-bootstrap';

import { useThemeSettings } from '@/src/hooks/Theme/useThemeSettings';
import { getImageUrl } from '@/src/services/themeService';

export default function FooterTop() {
    const { settings } = useThemeSettings();
    const theme = settings?.value || settings || {};
    const whatsappNumber = theme.whatsapp ? theme.whatsapp.replace(/\s+/g, '').replace('+', '') : '';
    const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '#';
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    if (isMobile) {
        return (
            <Container>
                <a
                    className="float-button"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={whatsappHref}
                    aria-label="WhatsApp ile iletişime geç"
                >
                    <i className="ri-whatsapp-line" aria-hidden="true"></i>
                    <span>Whatsapp Destek</span>
                </a>
                <Row className="row-fluid position-relative pt-4 align-items-center">
                    <Col lg={2} className="d-flex justify-content-center">
                        <div
                            style={{
                                position: 'absolute',
                                top: '-64px',
                                padding: '16px',
                                borderRadius: '10px',
                                boxShadow: '0 4px 20px 0 rgba(0, 0, 0, .03)',
                                backgroundColor: '#fff',
                            }}
                        >
                            <Link
                                href={"https://etbis.ticaret.gov.tr/tr/SiteSorgulamaSonuc?siteId=745e4066-7e80-4e3b-a831-b65ed62e3e77"} >
                                <Image
                                    src={'/lastikjantavm/assets/img/etbis.webp'}
                                    width={82}
                                    alt={'LastikJantAVM.com Logo'}
                                    height={95}
                                />
                            </Link>
                        </div>
                    </Col>
                    <Col lg={5}>
                        <div className="d-flex justify-content-end gap-2">
                            <div>
                                <Image
                                    src={getImageUrl(theme.footerSslImage)}
                                    width={754}
                                    height={30}
                                    alt="LastikJantAVM.com Ödeme Yöntemleri" />
                            </div>
                        </div>
                    </Col>
                </Row>
            </Container>
        );
    }

    return (
        <Container>
            <a
                className="float-button"
                target="_blank"
                rel="noopener noreferrer"
                href={whatsappHref}
                aria-label="WhatsApp ile iletişime geç"
            >
                <i className="ri-whatsapp-line" aria-hidden="true"></i>
                <span>Whatsapp Destek</span>
            </a>
            <Row className="row-fluid position-relative pt-4 align-items-center">
                <Col lg={5}>
                    <ul className="nav justify-content-left gap-4 order-md-3 mb-4 mb-md-0">
                        <li className="animate-underline">
                            <a className="nav-link fs-xs fw-normal p-0 animate-target" href="/sayfa/kvkk-ve-gizlilik-sozlesmesi">
                                KVKK ve Gizlilik Sözleşmesi
                            </a>
                        </li>
                        <li className="animate-underline">
                            <a className="nav-link fs-xs fw-normal p-0 animate-target" href="/sayfa/mesafeli-satis-sozlesmesi">
                                Mesafeli Satış Sözleşmesi
                            </a>
                        </li>
                        <li className="animate-underline">
                            <a className="nav-link fs-xs fw-normal p-0 animate-target" href="/sayfa/iade-politikasi">
                                İade Politikası
                            </a>
                        </li>
                    </ul>
                </Col>
                <Col lg={2} className="d-flex justify-content-center">
                    <div
                        style={{
                            position: 'absolute',
                            top: '-64px',
                            padding: '16px',
                            borderRadius: '10px',
                            boxShadow: '0 4px 20px 0 rgba(0, 0, 0, .03)',
                            backgroundColor: '#fff',
                        }}
                    >
                        <Link
                            href={"https://etbis.ticaret.gov.tr/tr/SiteSorgulamaSonuc?siteId=e032120a-5bcc-4a44-af7e-94ba2ae16bf9"} >
                            <Image
                                src={'/lastikjantavm/assets/img/etbis.webp'}
                                width={82}
                                alt={'ETBİS Kayıtlı Site'}
                                height={95}
                            />
                        </Link>
                    </div>
                </Col>
                <Col lg={5}>
                    <div className="d-flex justify-content-end gap-2">
                        <div>
                            <Image
                                src={getImageUrl(theme.footerSslImage)}
                                width={754}
                                height={30}
                                alt="Ödeme Yöntemleri" />
                        </div>
                    </div>
                </Col>
            </Row>
        </Container>
    );
}