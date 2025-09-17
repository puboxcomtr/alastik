'use client';

import Link from 'next/link';
import { Container, Row, Col } from "react-bootstrap";

export default function Topbar() {
    return (
        <Container fluid className="position-relative rounded-0">
            <Row className="row-fluid">
                <ul className="list-unstyled d-flex align-items-center justify-content-between fs-xs mb-0 flex-row p-2">
                    <li className="d-none d-lg-flex gap-2">
                        <i className="ri-bank-card-line fs-lg" />
                        <Link href="#" className="nav-link animate-underline animate-target" style={{ color: '#6f6f6f', fontWeight: 'normal' }}>
                            Güvenilir Ödeme
                        </Link>
                    </li>
                    <li className="d-none d-lg-flex gap-2">
                        <i className="ri-tools-line fs-lg" />
                        <Link href="#" className="nav-link animate-underline animate-target" style={{ color: '#6f6f6f', fontWeight: 'normal' }}>
                            329'dan Fazla Montaj Noktası
                        </Link>
                    </li>
                    <li className="d-none d-lg-flex gap-2">
                        <i className="ri-truck-line fs-lg" />
                        <Link href="#" className="nav-link animate-underline animate-target" style={{ color: '#6f6f6f', fontWeight: 'normal' }}>
                            Stoktan Hızlı Teslimat
                        </Link>
                    </li>
                    <li className="d-flex gap-2">
                        <i className="ci-credit-card fs-lg" />
                        <Link href="/iletisim" className="nav-link animate-underline animate-target gap-2" style={{ color: '#000', fontWeight: 'normal' }}>
                            İletişim: <span className="text-danger fw-semibold">0212 212 12 12</span>
                        </Link>
                    </li>
                    <li className="d-flex gap-2">
                        <Link href="#" className="nav-link gap-2 animate-underline badge text-bg-success">
                            Müşteri Memnuniyeti 8.73 / 10.00
                        </Link>
                    </li>
                </ul>
            </Row>
        </Container>
    );
}