'use client';
import React from 'react';

// Components
import Link from "next/link";
import Image from "next/image";

// MUI
import Tooltip from '@mui/material/Tooltip';
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";

// Components
import { Container, Row, Col } from 'react-bootstrap';

export default function FooterTop() {
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
                                                href="/category"
                                                className="nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0">
                                                Bize Ulaşın
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/category"
                                                className="nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0">
                                                Hakkımızda
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/category"
                                                className="nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0">
                                                Yardım / Destek
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/category"
                                                className="nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0">
                                                Politikalar
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/category"
                                                className="nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0">
                                                Blog
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/category"
                                                className="nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0">
                                                Yardım / Destek
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
                                                href="/category"
                                                className="nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0">
                                                Goodyear
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/category"
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Pirelli
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href="/category"
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Hankook
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/category'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Petlas
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/category'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Bridgestone
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/category'
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
                                                href='/category'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                205/55R16
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/category'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                185/55R15
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/category'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                205/45R15
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/category'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                205/55R17
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/category'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                225/45R16
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/category'
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
                                                href='/category'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Yaz Lastiği
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/category'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Kış Lastiği
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/category'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                4 Mevsim Lastik
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/category'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Elektrikli Araç Lastiği
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/category'
                                                className='nav-link animate-underline animate-target d-inline fw-normal text-truncate p-0'>
                                                Jant
                                            </Link>
                                        </li>
                                        <li className="d-flex w-100 pt-1">
                                            <Link
                                                href='/category'
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
                                    <Image src="/assets/img/logo/website_logo.svg"
                                        alt="A Lastik Logo"
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
                            <Tooltip title="Youtube">
                                <Link
                                    className="btn btn-icon fs-base btn-outline-secondary border-0"
                                    href="#!"
                                    aria-label="YouTube">
                                    <i className="ri-youtube-fill"></i>
                                </Link>
                            </Tooltip>
                            <Tooltip title="Facebook">
                                <Link
                                    className="btn btn-icon fs-base btn-outline-secondary border-0"
                                    href="#!"
                                    aria-label="Facebook">
                                    <i className="ri-facebook-fill"></i>
                                </Link>
                            </Tooltip>
                            <Tooltip title="Instagram">
                                <Link
                                    className="btn btn-icon fs-base btn-outline-secondary border-0"
                                    href="#!"
                                    aria-label="Instagram"
                                >
                                    <i className="ri-instagram-fill"></i>
                                </Link>
                            </Tooltip>
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
                            <li>
                                <Link
                                    className="nav-link"
                                    href="#!">
                                    <Tooltip title="ALastik - N11 Pazaryeri">
                                        <Image
                                            sx={{ marginBottom: '-3px' }}
                                            src="/assets/img/n11-logo.png"
                                            width={90}
                                            height={47}
                                            alt="N11 Pazaryeri" />
                                    </Tooltip>
                                </Link>
                            </li>
                            <li>
                                <Link
                                    className="nav-link"
                                    href="#!">
                                    <Tooltip title="ALastik - N11 Pazaryeri">
                                        <Image
                                            sx={{ marginBottom: '-3px' }}
                                            src="/assets/img/n11-logo.png"
                                            width={90}
                                            height={47}
                                            alt="N11 Pazaryeri" />
                                    </Tooltip>
                                </Link>
                            </li>
                            <li>
                                <Link
                                    className="nav-link"
                                    href="#!">
                                    <Tooltip title="ALastik - N11 Pazaryeri">
                                        <Image
                                            sx={{ marginBottom: '-3px' }}
                                            src="/assets/img/n11-logo.png"
                                            width={90}
                                            height={47}
                                            alt="N11 Pazaryeri" />
                                    </Tooltip>
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </Row>
        </Container >
    );
}