'use client';

import Link from 'next/link';
import { Container, Row } from "react-bootstrap";

export default function Topbar({ data }) {
    if (!data?.items) return null;

    return (
        <Container fluid className="position-relative rounded-0">
            <Row className="row-fluid">
                <ul className="list-unstyled d-flex align-items-center justify-content-between fs-xs mb-0 flex-row p-2">
                    {data.items.filter(item => item.visible).map(item => (
                        <li
                            key={item.id}
                            className={`${item.mobileVisible ? 'd-flex' : 'd-none d-lg-flex'} gap-2`}
                        >
                            {item.icon && <i className={`${item.icon} fs-lg`} />}

                            {item.badge ? (
                                <Link
                                    href={item.link}
                                    className={`nav-link gap-2 animate-underline badge ${item.badgeClass}`}
                                >
                                    {item.text}
                                </Link>
                            ) : (
                                <Link
                                    href={item.link}
                                    className="nav-link animate-underline animate-target gap-2"
                                    style={{ color: item.color || '#6f6f6f', fontWeight: 'normal' }}
                                >
                                    {item.text}
                                    {item.highlight && (
                                        <>
                                            {' '}
                                            <span
                                                className="fw-semibold"
                                                style={{ color: item.highlightColor || 'inherit' }}
                                            >
                                                {item.highlight}
                                            </span>
                                        </>
                                    )}
                                </Link>
                            )}
                        </li>
                    ))}
                </ul>
            </Row>
        </Container>
    );
}