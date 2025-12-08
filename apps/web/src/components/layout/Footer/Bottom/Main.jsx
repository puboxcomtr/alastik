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

        <Container>
            <Row className="row-fluid position-relative pt-4">
                <Col lg={5}>
                    <ul className="nav justify-content-left gap-4 order-md-3 mb-4 mb-md-0">
                        <li className="animate-underline">
                            <a className="nav-link fs-xs fw-normal p-0 animate-target" href="#!">
                                KVKK ve Gizlilik Sözleşmesi
                            </a>
                        </li>
                        <li className="animate-underline">
                            <a className="nav-link fs-xs fw-normal p-0 animate-target" href="#!">
                                Mesafeli Satış Sözleşmesi
                            </a>
                        </li>
                        <li className="animate-underline">
                            <a className="nav-link fs-xs fw-normal p-0 animate-target" href="#!">
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
                            href={"#!"} >

                            <Image
                                src={'/assets/img/etbis.webp'}
                                width={82}
                                alt={'A Lastik Logo'}
                                height={95}
                            />
                        </Link>
                    </div>
                </Col>
                <Col lg={5}>
                    <div className="d-flex justify-content-end gap-2">
                        <div>
                            <Image
                                src="/assets/img/payment-methods/visa-light-mode.svg"
                                className="d-none-dark"
                                width={58}
                                height={40}
                                alt="Visa" />
                            <Image
                                src="/assets/img/payment-methods/visa-dark-mode.svg"
                                className="d-none d-block-dark"
                                width={58}
                                height={40}
                                alt="Visa" />
                        </div>
                        <div>
                            <Image
                                src="/assets/img/payment-methods/paypal-dark-mode.svg"
                                className="d-none-dark"
                                width={58}
                                height={40}
                                alt="Visa" />
                            <Image
                                src="/assets/img/payment-methods/paypal-dark-mode.svg"
                                className="d-none d-block-dark"
                                width={58}
                                height={40}
                                alt="Visa" />
                        </div>
                        <div>
                            <Image
                                src="/assets/img/payment-methods/apple-pay-light-mode.svg"
                                className="d-none-dark"
                                width={58}
                                height={40}
                                alt="Visa" />
                            <Image
                                src="/assets/img/payment-methods/apple-pay-dark-mode.svg"
                                className="d-none d-block-dark"
                                width={58}
                                height={40}
                                alt="Visa" />
                        </div>
                    </div>
                </Col>
            </Row>
        </Container >

    );
}