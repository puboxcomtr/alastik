"use client";

import Link from "next/link";

import { Offcanvas, Button, Nav } from "react-bootstrap";

const categories = [
    "Oto Lastik",
    "Set Lastik",
    "Yaz Lastikleri",
    "4 Mevsim Lastikler",
    "Kış Lastikleri",
    "4x4 Lastik",
    "Elektrikli Araç Lastiği",
];

export default function Category() {
    return (
        <>
            <Offcanvas.Title as="h5">Ürün Kategorileri</Offcanvas.Title>
            <Nav as="ul" className="list-unstyled d-block m-0">
                {categories.map((cat, index) => (
                    <Nav.Item as="li" key={index} className="nav d-block pt-2 mt-1">
                        <Link
                            href="/category"
                            className="nav-link animate-underline fw-normal p-0 fs-6"
                        >
                            <span className="animate-target text-truncate me-3">{cat}</span>
                        </Link>
                    </Nav.Item>
                ))}
            </Nav>
        </>
    );
}
