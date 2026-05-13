'use client';
import React, { useEffect, useState } from 'react';

// Components
import Link from "next/link";
import Image from "next/image";

// MUI
import Tooltip from '@mui/material/Tooltip';
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";

import { useThemeSettings } from '@/src/hooks/Theme/useThemeSettings';

// Components
import { Container, Row, Col } from 'react-bootstrap';

export default function FooterTop() {
    const { settings } = useThemeSettings();
    const theme = settings?.value || settings || {};
    const [isMobile, setIsMobile] = useState(false);
    const [openAccordion, setOpenAccordion] = useState(null);
    const toggleAccordion = (key) => {
        setOpenAccordion((prev) => prev === key ? null : key);
    };
    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);
    if (isMobile) {
        return (
            <Container className="py-5 py-md-5 py-lg-5 bg-black footer">
                <Row className="row-fluid mb-5">
                    <Col sm={12} className='d-flex justify-content-center align-items-center gap-3 flex-column'>
                        <div className="footer__svg">
                            <Image src="/assets/img/alastik-footer-logo1.png"
                                alt="A Lastik Mobil Footer Logo"
                                width={200}
                                height={60}
                            />
                        </div>
                        <div className='footer__adress text-center'>
                            <Typography variant="body2" className="footer__text" color='white' sx={{ fontSize: '12px' }}>
                                A Lastik, modern altyapısı, güvenli ödeme sistemleri ve zengin ürün
                                yelpazesiyle lastik ve jant ihtiyaçlarınızı hızlı ve güvenilir şekilde
                                karşılamak için hizmet vermektedir.
                            </Typography>
                        </div>
                        <div
                            id="footer__social"
                            className="d-flex justify-content-center justify-content-lg-start gap-3 mt-n2 mt-md-2">

                            {[
                                { key: 'instagram', href: theme.instagram, icon: 'ri-instagram-fill', label: 'Instagram' },
                                { key: 'youtube', href: theme.youtube, icon: 'ri-youtube-fill', label: 'Youtube' },
                                { key: 'linkedin', href: theme.linkedin, icon: 'ri-linkedin-fill', label: 'Linkedin' },
                                { key: 'facebook', href: theme.facebook, icon: 'ri-facebook-fill', label: 'Facebook' },
                                { key: 'twitter', href: theme.twitter, icon: 'ri-twitter-x-fill', label: 'Twitter' },
                                { key: 'whatsapp', href: theme.whatsapp ? `https://wa.me/${theme.whatsapp.replace(/\s+/g, '').replace('+', '')}` : '', icon: 'ri-whatsapp-fill', label: 'WhatsApp' },
                            ].filter(item => item.href).map((item) => (
                                <Tooltip key={item.key} title={`A Lastik ${item.label}`}>
                                    <Link
                                        className="btn btn-icon fs-base btn-outline-secondary border-0"
                                        href={item.href}
                                        aria-label={`A Lastik ${item.label}`}
                                        target="_blank"
                                    >
                                        <i className={item.icon}></i>
                                    </Link>
                                </Tooltip>
                            ))}
                        </div>
                    </Col>
                    <Col xs={12}>
                        {[
                            {
                                key: 'kurumsal',
                                title: 'Kurumsal',
                                links: [
                                    { href: '/sayfa/hakkimizda', label: 'Biz Kimiz?' },
                                    { href: '/kampanyalar', label: 'Kampanyalar' },
                                    { href: '/jant-lastik-hesaplama', label: 'Jant Lastik Hesaplama' },
                                    { href: '/sayfa/banka-hesap-numaralari', label: 'Banka Hesap Numaraları' },
                                    { href: '/iletisim', label: 'Bize Ulaşın' },
                                ]
                            },
                            {
                                key: 'markalar',
                                title: 'Lastik Markaları',
                                links: [
                                    { href: '/marka/goodyear', label: 'Goodyear' },
                                    { href: '/marka/pirelli', label: 'Pirelli' },
                                    { href: '/marka/hankook', label: 'Hankook' },
                                    { href: '/marka/petlas', label: 'Petlas' },
                                    { href: '/marka/bridgestone', label: 'Bridgestone' },
                                    { href: '/marka/michelin', label: 'Michelin' },
                                ]
                            },
                            {
                                key: 'kategoriler',
                                title: 'Kategoriler',
                                links: [
                                    { href: '/kategori/yaz-lastikleri', label: 'Yaz Lastiği' },
                                    { href: '/kategori/kis-lastikleri', label: 'Kış Lastiği' },
                                    { href: '/kategori/4-mevsim-lastikler', label: '4 Mevsim Lastik' },
                                    { href: '/kategori/jant', label: 'Jant' },
                                ]
                            },
                        ].map((section) => (
                            <div key={section.key} className="border-bottom border-secondary">
                                <button
                                    type="button"
                                    className="d-flex justify-content-between align-items-center w-100 bg-transparent border-0 text-white py-3"
                                    onClick={() => toggleAccordion(section.key)}
                                >
                                    <span className="fw-medium">{section.title}</span>
                                    <i className={`ci-chevron-down fs-base transition-transform ${openAccordion === section.key ? 'rotate-180' : ''}`}
                                        style={{ transition: 'transform 0.3s', transform: openAccordion === section.key ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                    ></i>
                                </button>
                                <div style={{
                                    maxHeight: openAccordion === section.key ? '300px' : '0',
                                    overflow: 'hidden',
                                    transition: 'max-height 0.3s ease'
                                }}>
                                    <ul className="nav flex-column gap-2 pb-3">
                                        {section.links.map((link) => (
                                            <li key={link.href}>
                                                <Link href={link.href} className="nav-link text-white-50 fw-normal p-2 pt-1">
                                                    {link.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </Col>
                    <Col xs={12}>
                        <ul className="d-flex list-unstyled flex-row merchant justify-content-center mt-3">
                            {[
                                { key: 'trendyol', href: theme.trendyol, src: '/assets/img/pazaryeri/trendyol-logo.png', alt: 'Trendyol Pazaryeri', title: 'ALastik - Trendyol Pazaryeri', bg: '#f27a1a' },
                                { key: 'n11', href: theme.n11, src: '/assets/img/pazaryeri/n11-logo.png', alt: 'N11 Pazaryeri', title: 'ALastik - N11 Pazaryeri', bg: '#FFF' },
                                { key: 'hepsiburada', href: theme.hepsiburada, src: '/assets/img/pazaryeri/hepsiburada-logo.png', alt: 'Hepsiburada Pazaryeri', title: 'ALastik - Hepsiburada Pazaryeri', bg: '#ff6000' },
                                { key: 'pttavm', href: theme.pttavm, src: '/assets/img/pazaryeri/pttavm-logo.png', alt: 'PttAVM Pazaryeri', title: 'ALastik - PttAVM Pazaryeri', bg: '#ffc107' },
                                { key: 'pazarama', href: theme.pazarama, src: '/assets/img/pazaryeri/pazarama-logo.png', alt: 'Pazarama Pazaryeri', title: 'ALastik - Pazarama Pazaryeri', bg: '#f27a1a' },
                                { key: 'idefix', href: theme.idefix, src: '/assets/img/pazaryeri/idefix-logo.png', alt: 'İdefix Pazaryeri', title: 'ALastik - İdefix Pazaryeri', bg: '#f27a1a' },
                            ].filter(item => item.href).map((item) => (
                                <li key={item.key} style={{ borderRadius: '4px' }}>
                                    <Link className="nav-link" href={item.href} target="_blank" rel="nofollow">
                                        <Tooltip title={item.title}>
                                            <Image src={item.src} width={50} height={47} alt={item.alt} />
                                        </Tooltip>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <div id="footer__middle" className="d-flex align-items-center justify-content-center mt-4 gap-2">
                            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g clipPath="url(#clip0_2206_29097)">
                                    <path
                                        d="M24.7489 19.5095C20.2716 17.5196 15.7314 17.5196 11.2542 19.5095C10.9749 19.6336 10.7949 19.9107 10.7949 20.2163V24.6131C10.7949 29.1951 13.5004 33.3581 17.6874 35.219C17.7874 35.2634 17.8944 35.2856 18.0015 35.2856C18.1086 35.2856 18.2156 35.2634 18.3157 35.219C22.5027 33.3581 25.2081 29.1951 25.2081 24.6131V20.2163C25.2081 19.9106 25.0282 19.6336 24.7489 19.5095ZM23.6613 24.6131C23.6613 28.4685 21.451 31.9818 18.0015 33.6593C14.552 31.9818 12.3418 28.4685 12.3418 24.6131V20.7267C16.1001 19.1838 19.903 19.1838 23.6613 20.7267V24.6131Z"
                                        fill="#20D151"></path>
                                    <path
                                        d="M16.2735 26.1022C15.9714 25.8001 15.4818 25.8001 15.1797 26.1022C14.8776 26.4042 14.8776 26.894 15.1797 27.196L16.696 28.7123C16.841 28.8574 17.0378 28.9389 17.2429 28.9389C17.448 28.9389 17.6448 28.8574 17.7897 28.7123L20.8223 25.6797C21.1244 25.3777 21.1244 24.888 20.8223 24.5859C20.5202 24.2838 20.0306 24.2839 19.7285 24.5859L17.2428 27.0716L16.2735 26.1022Z"
                                        fill="#20D151"></path>
                                    <path
                                        d="M5.06285 6.551C5.4902 6.551 5.83664 6.20456 5.83664 5.77721C5.83664 5.34986 5.4902 5.00342 5.06285 5.00342C4.6355 5.00342 4.28906 5.34986 4.28906 5.77721C4.28906 6.20456 4.6355 6.551 5.06285 6.551Z"
                                        fill="#20D151"></path>
                                    <path
                                        d="M9.35191 6.551C9.77927 6.551 10.1257 6.20456 10.1257 5.77721C10.1257 5.34986 9.77927 5.00342 9.35191 5.00342C8.92456 5.00342 8.57812 5.34986 8.57812 5.77721C8.57812 6.20456 8.92456 6.551 9.35191 6.551Z"
                                        fill="#20D151"></path>
                                    <path
                                        d="M13.641 6.551C14.0683 6.551 14.4148 6.20456 14.4148 5.77721C14.4148 5.34986 14.0683 5.00342 13.641 5.00342C13.2136 5.00342 12.8672 5.34986 12.8672 5.77721C12.8672 6.20456 13.2136 6.551 13.641 6.551Z"
                                        fill="#20D151"></path>
                                    <path
                                        d="M33.0822 0.714844H2.91783C1.30894 0.714844 0 2.02378 0 3.63267V10.0658V27.2209C0 28.8298 1.30894 30.1387 2.91783 30.1387H12.1969C11.9277 29.642 11.6946 29.125 11.4996 28.5919H2.91783C2.1619 28.5919 1.54688 27.9768 1.54688 27.2209V10.8393H16.4989C16.7575 10.8393 16.999 10.71 17.1424 10.4949L19.7719 6.5505H34.4531V27.2209C34.4531 27.9768 33.8381 28.5919 33.0822 28.5919H24.5003C24.3053 29.125 24.0723 29.642 23.803 30.1387H33.0821C34.691 30.1387 35.9999 28.8298 35.9999 27.2209V5.77706V3.63267C36 2.02378 34.6911 0.714844 33.0822 0.714844ZM19.3581 5.00363C19.0995 5.00363 18.858 5.13286 18.7146 5.34802L16.085 9.29241H1.54688V3.63267C1.54688 2.87674 2.1619 2.26172 2.91783 2.26172H33.0822C33.8381 2.26172 34.4531 2.87674 34.4531 3.63267V5.00363H19.3581Z"
                                        fill="white"></path>
                                </g>
                                <defs>
                                    <clipPath id="clip0_2206_29097">
                                        <rect width="36" height="36" fill="white"></rect>
                                    </clipPath>
                                </defs>
                            </svg>
                            <div className="d-flex flex-column">
                                <Typography variant='body1' component='span'>256 bit SSL</Typography>
                                <Typography variant='h6' component='strong' fontWeight='bold'>Sertifika ile korunuyor.</Typography>
                            </div>
                        </div>
                    </Col>
                </Row>
                <Row className="row-fluid align-items-center">
                    <div className="col-md-6">
                    </div>
                </Row>
            </Container >
        );
    }

    return (
        <Container className="mt-5 py-5 py-md-5 py-lg-5 bg-black rounded-5 footer">
            <Row className="row-fluid mb-5">
                <Col md={6} className="pb-2 pb-md-0 mb-4 mb-md-0 mt-n3 mt-sm-0">
                    <div className="accordion" id="footerLinks">
                        <div className="row row-cols-1 row-cols-sm-4">
                            <div className="accordion-item col border-0">
                                <h6 className="accordion-header" id="categoriesHeading">
                                    <span className="text-white d-none d-sm-block">Kurumsal</span>
                                    <button type="button" className="accordion-button collapsed py-3 d-sm-none" data-bs-toggle="collapse"
                                        data-bs-target="#categoriesLinks" aria-expanded="false"
                                        aria-controls="categoriesLinks">Kurumsal</button>
                                </h6>
                                <div className="accordion-collapse collapse d-sm-block" id="categoriesLinks"
                                    aria-labelledby="categoriesHeading" data-bs-parent="#footerLinks">
                                    <ul className="nav flex-column gap-2 pt-sm-3 pb-3 pb-sm-0 mt-n1 mb-1 mb-sm-0">
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/sayfa/hakkimizda"
                                                className="nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0">
                                                Biz Kimiz?
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/sayfa/kampanyalar"
                                                className="nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0">
                                                Kampanyalar
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/jant-lastik-hesaplama"
                                                className="nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0">
                                                Jant Lastik Hesaplama
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/sayfa/banka-hesap-numaralari"
                                                className="nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0">
                                                Banka Hesap Numaraları
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/sayfa/lastik-terimleri-ve-anlamlari"
                                                className="nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0">
                                                Lastik Terimleri ve Anlamları
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/iletisim"
                                                className="nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0">
                                                Bize Ulaşın
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                                <Divider sx={{ display: { sm: 'none' } }} />
                            </div>
                            <div className="accordion-item col border-0">
                                <h6 className="accordion-header" id="brandsHeading">
                                    <span className="text-white d-none d-sm-block">Lastik Markaları</span>
                                    <button type="button" className="text-white accordion-button collapsed py-3 d-sm-none"
                                        data-bs-toggle="collapse" data-bs-target="#brandsLinks" aria-expanded="false"
                                        aria-controls="brandsLinks">Lastik Markaları</button>
                                </h6>
                                <div className="accordion-collapse collapse d-sm-block" id="brandsLinks" aria-labelledby="brandsHeading"
                                    data-bs-parent="#footerLinks">
                                    <ul className="nav flex-column gap-2 pt-sm-3 pb-3 pb-sm-0 mt-n1 mb-1 mb-sm-0">
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/marka/goodyear"
                                                className="nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0">
                                                Goodyear
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/marka/pirelli"
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Pirelli
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/marka/hankook"
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Hankook
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/marka/petlas'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Petlas
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/marka/bridgestone'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Bridgestone
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/marka/michelin'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Michelin
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                                <Divider sx={{ display: { sm: 'none' } }} />
                            </div>
                            <div className="accordion-item col border-0">
                                <h6 className="accordion-header" id="sizesHeading">
                                    <span className="text-white d-none d-sm-block">Popüler Ebatlar</span>
                                    <button type="button" className="text-white accordion-button collapsed py-3 d-sm-none"
                                        data-bs-toggle="collapse" data-bs-target="#sizesLinks" aria-expanded="false"
                                        aria-controls="sizesLinks">Popüler Ebatlar</button>
                                </h6>
                                <div className="accordion-collapse collapse d-sm-block" id="sizesLinks" aria-labelledby="sizesHeading"
                                    data-bs-parent="#footerLinks">
                                    <ul className="nav flex-column gap-2 pt-sm-3 pb-3 pb-sm-0 mt-n1 mb-1 mb-sm-0">
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/etiket/205-55-16'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                205/55R16
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/etiket/185-55-15'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                185/55R15
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/etiket/205-45-15'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                205/45R15
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/etiket/205-55-17'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                205/55R17
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/etiket/205-45-16'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                225/45R16
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/etiket/205-55-17'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                225/55R17
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                                <Divider sx={{ display: { sm: 'none' } }} />
                            </div>
                            <div className="accordion-item col border-0">
                                <h6 className="accordion-header" id="categoriesListHeading">
                                    <span className="text-white d-none d-sm-block">Kategoriler</span>
                                    <button type="button" className="text-white accordion-button collapsed py-3 d-sm-none"
                                        data-bs-toggle="collapse" data-bs-target="#categoriesList" aria-expanded="false"
                                        aria-controls="categoriesList">Kategoriler</button>
                                </h6>
                                <div className="accordion-collapse collapse d-sm-block" id="categoriesList" aria-labelledby="categoriesListHeading"
                                    data-bs-parent="#footerLinks">
                                    <ul className="nav flex-column gap-2 pt-sm-3 pb-3 pb-sm-0 mt-n1 mb-1 mb-sm-0">
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/kategori/yaz-lastikleri'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Yaz Lastiği
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/kategori/kis-lastikleri'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Kış Lastiği
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/kategori/4-mevsim-lastikler'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                4 Mevsim Lastik
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/kategori/elektrikli-arac-lastikleri'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Elektrikli Araç Lastiği
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/kategori/jant'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Jant
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/kategori/kar-corabi-paleti-ve-zinciri'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Kar Paleti ve Zinciri
                                            </Link>
                                        </li>
                                    </ul>
                                </div>
                                <Divider sx={{ display: { sm: 'none' } }} />
                            </div>
                        </div>
                    </div>
                </Col>
                <Col md={5} className="offset-1">
                    <div className="red_footer">
                        <div>
                            <div className="d-flex justify-content-between align-items-center">
                                <div className="d-flex flex-column">
                                    <Typography variant="body1" component="span" color='white'>
                                        Lastik ve Jant Alışverişi
                                    </Typography>
                                    <Typography variant="h6" component="strong" fontWeight="bold" color='white'>
                                        Artık Daha Kolay!
                                    </Typography>
                                </div>
                                <div className="footer__svg">
                                    <Image src="/assets/img/alastik-footer-logo1.png"
                                        alt="A Lastik Footer Logo"
                                        width={200}
                                        height={60}
                                    />
                                </div>
                            </div>
                            <Typography variant="body2" className="footer__text" color='white' sx={{ fontSize: '12px' }}>
                                A Lastik, modern altyapısı, güvenli ödeme sistemleri ve zengin ürün
                                yelpazesiyle lastik ve jant ihtiyaçlarınızı hızlı ve güvenilir şekilde
                                karşılamak için hizmet vermektedir.
                            </Typography>
                        </div>
                        <div
                            id="footer__social"
                            className="d-flex justify-content-center justify-content-lg-start gap-3 mt-n2 mt-md-2">
                            {[
                                { key: 'instagram', href: theme.instagram, icon: 'ri-instagram-fill', label: 'Instagram' },
                                { key: 'youtube', href: theme.youtube, icon: 'ri-youtube-fill', label: 'Youtube' },
                                { key: 'linkedin', href: theme.linkedin, icon: 'ri-linkedin-fill', label: 'Linkedin' },
                                { key: 'facebook', href: theme.facebook, icon: 'ri-facebook-fill', label: 'Facebook' },
                                { key: 'twitter', href: theme.twitter, icon: 'ri-twitter-x-fill', label: 'Twitter' },
                                { key: 'whatsapp', href: theme.whatsapp ? `https://wa.me/${theme.whatsapp.replace(/\s+/g, '').replace('+', '')}` : '', icon: 'ri-whatsapp-fill', label: 'WhatsApp' },
                            ].filter(item => item.href).map((item) => (
                                <Tooltip key={item.key} title={`A Lastik ${item.label}`}>
                                    <Link
                                        className="btn btn-icon fs-base btn-outline-secondary border-0"
                                        href={item.href}
                                        aria-label={`A Lastik ${item.label}`}
                                        target="_blank"
                                    >
                                        <i className={item.icon}></i>
                                    </Link>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                </Col>
            </Row>
            <Row className="row-fluid align-items-center">
                <div className="col-md-6">
                    <div id="footer__middle" className="d-flex align-items-center gap-2">
                        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clipPath="url(#clip0_2206_29097)">
                                <path
                                    d="M24.7489 19.5095C20.2716 17.5196 15.7314 17.5196 11.2542 19.5095C10.9749 19.6336 10.7949 19.9107 10.7949 20.2163V24.6131C10.7949 29.1951 13.5004 33.3581 17.6874 35.219C17.7874 35.2634 17.8944 35.2856 18.0015 35.2856C18.1086 35.2856 18.2156 35.2634 18.3157 35.219C22.5027 33.3581 25.2081 29.1951 25.2081 24.6131V20.2163C25.2081 19.9106 25.0282 19.6336 24.7489 19.5095ZM23.6613 24.6131C23.6613 28.4685 21.451 31.9818 18.0015 33.6593C14.552 31.9818 12.3418 28.4685 12.3418 24.6131V20.7267C16.1001 19.1838 19.903 19.1838 23.6613 20.7267V24.6131Z"
                                    fill="#20D151"></path>
                                <path
                                    d="M16.2735 26.1022C15.9714 25.8001 15.4818 25.8001 15.1797 26.1022C14.8776 26.4042 14.8776 26.894 15.1797 27.196L16.696 28.7123C16.841 28.8574 17.0378 28.9389 17.2429 28.9389C17.448 28.9389 17.6448 28.8574 17.7897 28.7123L20.8223 25.6797C21.1244 25.3777 21.1244 24.888 20.8223 24.5859C20.5202 24.2838 20.0306 24.2839 19.7285 24.5859L17.2428 27.0716L16.2735 26.1022Z"
                                    fill="#20D151"></path>
                                <path
                                    d="M5.06285 6.551C5.4902 6.551 5.83664 6.20456 5.83664 5.77721C5.83664 5.34986 5.4902 5.00342 5.06285 5.00342C4.6355 5.00342 4.28906 5.34986 4.28906 5.77721C4.28906 6.20456 4.6355 6.551 5.06285 6.551Z"
                                    fill="#20D151"></path>
                                <path
                                    d="M9.35191 6.551C9.77927 6.551 10.1257 6.20456 10.1257 5.77721C10.1257 5.34986 9.77927 5.00342 9.35191 5.00342C8.92456 5.00342 8.57812 5.34986 8.57812 5.77721C8.57812 6.20456 8.92456 6.551 9.35191 6.551Z"
                                    fill="#20D151"></path>
                                <path
                                    d="M13.641 6.551C14.0683 6.551 14.4148 6.20456 14.4148 5.77721C14.4148 5.34986 14.0683 5.00342 13.641 5.00342C13.2136 5.00342 12.8672 5.34986 12.8672 5.77721C12.8672 6.20456 13.2136 6.551 13.641 6.551Z"
                                    fill="#20D151"></path>
                                <path
                                    d="M33.0822 0.714844H2.91783C1.30894 0.714844 0 2.02378 0 3.63267V10.0658V27.2209C0 28.8298 1.30894 30.1387 2.91783 30.1387H12.1969C11.9277 29.642 11.6946 29.125 11.4996 28.5919H2.91783C2.1619 28.5919 1.54688 27.9768 1.54688 27.2209V10.8393H16.4989C16.7575 10.8393 16.999 10.71 17.1424 10.4949L19.7719 6.5505H34.4531V27.2209C34.4531 27.9768 33.8381 28.5919 33.0822 28.5919H24.5003C24.3053 29.125 24.0723 29.642 23.803 30.1387H33.0821C34.691 30.1387 35.9999 28.8298 35.9999 27.2209V5.77706V3.63267C36 2.02378 34.6911 0.714844 33.0822 0.714844ZM19.3581 5.00363C19.0995 5.00363 18.858 5.13286 18.7146 5.34802L16.085 9.29241H1.54688V3.63267C1.54688 2.87674 2.1619 2.26172 2.91783 2.26172H33.0822C33.8381 2.26172 34.4531 2.87674 34.4531 3.63267V5.00363H19.3581Z"
                                    fill="white"></path>
                            </g>
                            <defs>
                                <clipPath id="clip0_2206_29097">
                                    <rect width="36" height="36" fill="white"></rect>
                                </clipPath>
                            </defs>
                        </svg>
                        <div className="d-flex flex-column">
                            <Typography variant='body1' component='span'>256 bit SSL</Typography>
                            <Typography variant='h6' component='strong' fontWeight='bold'>Sertifika ile korunuyor.</Typography>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="d-flex justify-content-end">
                        <ul className="d-flex list-unstyled flex-row merchant">
                            {[
                                { key: 'trendyol', href: theme.trendyol, src: '/assets/img/pazaryeri/trendyol-logo.png', alt: 'Trendyol Pazaryeri', title: 'ALastik - Trendyol Pazaryeri', bg: '#f27a1a' },
                                { key: 'n11', href: theme.n11, src: '/assets/img/pazaryeri/n11-logo.png', alt: 'N11 Pazaryeri', title: 'ALastik - N11 Pazaryeri', bg: '#FFF' },
                                { key: 'hepsiburada', href: theme.hepsiburada, src: '/assets/img/pazaryeri/hepsiburada-logo.png', alt: 'Hepsiburada Pazaryeri', title: 'ALastik - Hepsiburada Pazaryeri', bg: '#ff6000' },
                                { key: 'pttavm', href: theme.pttavm, src: '/assets/img/pazaryeri/pttavm-logo.png', alt: 'PttAVM Pazaryeri', title: 'ALastik - PttAVM Pazaryeri', bg: '#ffc107' },
                                { key: 'pazarama', href: theme.pazarama, src: '/assets/img/pazaryeri/pazarama-logo.png', alt: 'Pazarama Pazaryeri', title: 'ALastik - Pazarama Pazaryeri', bg: '#f27a1a' },
                                { key: 'idefix', href: theme.idefix, src: '/assets/img/pazaryeri/trendyol-logo.png', alt: 'İdefix Pazaryeri', title: 'ALastik - İdefix Pazaryeri', bg: '#f27a1a' },
                            ].filter(item => item.href).map((item) => (
                                <li key={item.key} style={{ borderRadius: '4px' }}>
                                    <Link className="nav-link" href={item.href} target='_blank' rel="nofollow">
                                        <Tooltip title={item.title}>
                                            <Image
                                                src={item.src}
                                                width={90}
                                                height={47}
                                                alt={item.alt} />
                                        </Tooltip>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Row>
        </Container >
    );
}