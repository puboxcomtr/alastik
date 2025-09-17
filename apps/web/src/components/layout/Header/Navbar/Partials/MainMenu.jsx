'use client';
import React, { useState } from 'react';
import Nav from 'react-bootstrap/Nav';
import Dropdown from 'react-bootstrap/Dropdown';
import Link from 'next/link';

export default function MainMenu({ handleClose }) {
    const [openId, setOpenId] = useState(null);
    const openAdvisorModal = (e) => {
        e.preventDefault();
        const el = document.getElementById('tireSearch');
        const bs = typeof window !== 'undefined' ? window.bootstrap : null;
        if (el && bs && bs.Modal) {
            const inst = bs.Modal.getOrCreateInstance(el);
            inst.show();
        } else if (el) {
            try {
                el.classList.add('show');
                el.style.display = 'block';
                el.removeAttribute('aria-hidden');
                document.body.classList.add('modal-open');
                const bd = document.createElement('div');
                bd.className = 'modal-backdrop fade show';
                document.body.appendChild(bd);
            } catch (_) { }
        }
    };

    const MegaItem = ({ id, title, children }) => (
        <Nav.Item as="li" className="nav-item position-static flex-grow-1">
            <div
                className="position-relative w-100"
                onMouseEnter={() => setOpenId(id)}
                onMouseLeave={() => setOpenId(null)}
            >
                <Dropdown
                    show={openId === id}
                    onToggle={(next) => setOpenId(next ? id : null)} // mobil tık
                    autoClose="outside"
                >
                    <Dropdown.Toggle
                        as="a"
                        href="#"
                        className="nav-link dropdown-toggle text-white"
                        aria-expanded={openId === id ? 'true' : 'false'}
                        onClick={(e) => {
                            e.preventDefault();
                            setOpenId((cur) => (cur === id ? null : id));
                        }}
                    >
                        {title}
                    </Dropdown.Toggle>

                    <Dropdown.Menu
                        as="div"
                        className="mega-menu p-0 border-0"
                        data-bs-popper="static"
                        renderOnMount
                    >
                        {children}
                    </Dropdown.Menu>
                </Dropdown>
            </div>
        </Nav.Item>
    );

    const closeMenu = () => setOpenId(null);

    return (
        <>
            <Nav as="ul" className="navbar-nav align-items-baseline align-items-lg-center position-relative">
                <Nav.Item as="li" className="nav-item">
                    <Link href="/" className="nav-link text-white" onClick={handleClose}>
                        Anasayfa
                    </Link>
                </Nav.Item>
                <MegaItem id="yaz" title="Yaz Lastiği">
                    <div className="p-4 d-flex flex-column flex-lg-row gap-4">
                        {/* Kolon 1 */}
                        <div style={{ minWidth: '190px' }}>
                            <div className="h6 mb-2">Popüler Lastik Ebatları</div>
                            <ul className="nav flex-column gap-2 mt-0">
                                <li className="d-flex w-100 pt-1">
                                    <Link href="/category?tip=kategori&kategori=yaz&ebat=185/65R14"
                                        className="nav-link fw-normal text-truncate p-0 text-muted fs-sm animate-underline animate-target"
                                        onClick={closeMenu}>
                                        185/65R14 Yaz Lastiği
                                    </Link>
                                </li>
                                <li className="d-flex w-100 pt-1">
                                    <Link href="/category?tip=kategori&kategori=4mevsim&ebat=205/55R16"
                                        className="nav-link fw-normal text-truncate p-0 text-muted fs-sm animate-underline animate-target"
                                        onClick={closeMenu}>
                                        205/55R16 4 Mevsim Lastiği
                                    </Link>
                                </li>
                                <li className="d-flex w-100 pt-1">
                                    <Link href="/category?tip=kategori&kategori=kis&ebat=205/65R17"
                                        className="nav-link fw-normal text-truncate p-0 text-muted fs-sm animate-underline animate-target"
                                        onClick={closeMenu}>
                                        205/65R17 Kış Lastiği
                                    </Link>
                                </li>
                            </ul>

                            <div className="h6 pt-4 mb-2">Lastik Teknolojileri</div>
                            <ul className="nav flex-column gap-2 mt-0">
                                {[
                                    { href: '/category', label: 'Runflat Lastikler' },
                                    { href: '/category', label: 'Seal Lastikler' },
                                    { href: '/category', label: 'XL-RF Lastikler' },
                                ].map((b) => (
                                    <li className="d-flex w-100 pt-1" key={b.label}>
                                        <Link href={b.href}
                                            className="nav-link fw-normal text-truncate p-0 text-muted fs-sm animate-underline animate-target"
                                            onClick={closeMenu}>
                                            {b.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Kolon 2 */}
                        <div style={{ minWidth: '190px' }}>
                            <div className="h6 mb-2">Öne Çıkan Markalar</div>
                            <ul className="nav flex-column gap-2 mt-0">
                                {[
                                    { href: '/category?tip=kategori&kategori=yaz&marka=Pirelli', label: 'Pirelli' },
                                    { href: '/category?tip=kategori&kategori=yaz&marka=Hankook', label: 'Hankook' },
                                    { href: '/category?tip=kategori&kategori=yaz&marka=Petlas', label: 'Petlas' },
                                    { href: '/category?tip=kategori&kategori=yaz&marka=Continental', label: 'Continental' },
                                    { href: '/category?tip=kategori&kategori=yaz&marka=Goodyear', label: 'Goodyear' },
                                    { href: '/category?tip=kategori&kategori=yaz&marka=Falken', label: 'Falken' },
                                    { href: '/category?tip=kategori&kategori=yaz&marka=Lassa', label: 'Lassa' },
                                    { href: '/category?tip=kategori&kategori=yaz&marka=Bridgestone', label: 'Bridgestone' },
                                    { href: '/category?tip=kategori&kategori=yaz&marka=Nokian', label: 'Nokian Tyres' },
                                    { href: '/category?tip=kategori&kategori=yaz&marka=Prometon', label: 'Prometon' }
                                ].map((b) => (
                                    <li className="d-flex w-100 pt-1" key={b.label}>
                                        <Link href={b.href}
                                            className="nav-link fw-normal text-truncate p-0 text-muted fs-sm animate-underline animate-target"
                                            onClick={closeMenu}>
                                            {b.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Kolon 3 */}
                        <div style={{ minWidth: '190px' }}>
                            <div className="h6 mb-2">Popüler Lastik Desenleri</div>
                            <ul className="nav flex-column gap-2 mt-0">
                                {[
                                    { href: '/category?tip=kategori&kategori=yaz&desen=Pirelli%20P1%20Cinturato', label: 'Pirelli P1 Cinturato' },
                                    { href: '/category?tip=kategori&kategori=kis&desen=Pirelli%20Subzero', label: 'Pirelli Subzero' },
                                    { href: '/category?tip=kategori&kategori=4mevsim&desen=Michelin%20Primacy%205', label: 'Michelin Primacy 5' },
                                    { href: '/category?tip=kategori&kategori=yaz&desen=Lassa%20Revola', label: 'Lassa Revola' },
                                    { href: '/category?tip=kategori&kategori=yaz&desen=Hankook%20Ventus%20Evo', label: 'Hankook Ventus Evo' }
                                ].map((d) => (
                                    <li className="d-flex w-100 pt-1" key={d.label}>
                                        <Link href={d.href}
                                            className="nav-link fw-normal text-truncate p-0 text-muted fs-sm animate-underline animate-target"
                                            onClick={closeMenu}>
                                            {d.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </MegaItem>
                <MegaItem id="kis" title="Kış Lastiği">
                    <div className="p-4 d-flex flex-column flex-lg-row gap-4">
                        {/* kendi kolon içeriklerin—örnek */}
                        <div style={{ minWidth: '190px' }}>
                            <div className="h6 mb-2">Popüler Ebatlar</div>
                            <ul className="nav flex-column gap-2 mt-0">
                                {[
                                    { href: '/category?tip=kategori&kategori=kis&ebat=195/65R15', label: '195/65R15 Kış Lastiği' },
                                    { href: '/category?tip=kategori&kategori=kis&ebat=205/55R16', label: '205/55R16 Kış Lastiği' },
                                    { href: '/category?tip=kategori&kategori=kis&ebat=225/45R17', label: '225/45R17 Kış Lastiği' }
                                ].map((x) => (
                                    <li className="d-flex w-100 pt-1" key={x.label}>
                                        <Link href={x.href}
                                            className="nav-link fw-normal text-truncate p-0 text-muted fs-sm"
                                            onClick={closeMenu}>
                                            {x.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={{ minWidth: '190px' }}>
                            <div className="h6 mb-2">Markalar</div>
                            <ul className="nav flex-column gap-2 mt-0">
                                {[
                                    { href: '/category?tip=kategori&kategori=kis&marka=Michelin', label: 'Michelin' },
                                    { href: '/category?tip=kategori&kategori=kis&marka=Continental', label: 'Continental' },
                                    { href: '/category?tip=kategori&kategori=kis&marka=Goodyear', label: 'Goodyear' }
                                ].map((b) => (
                                    <li className="d-flex w-100 pt-1" key={b.label}>
                                        <Link href={b.href}
                                            className="nav-link fw-normal text-truncate p-0 text-muted fs-sm animate-underline animate-target"
                                            onClick={closeMenu}>
                                            {b.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={{ minWidth: '190px' }}>
                            <div className="h6 mb-2">Desenler</div>
                            <ul className="nav flex-column gap-2 mt-0">
                                {[
                                    { href: '/category?tip=kategori&kategori=kis&desen=Alpin', label: 'Alpin Serisi' },
                                    { href: '/category?tip=kategori&kategori=kis&desen=Blizzak', label: 'Blizzak Serisi' },
                                    { href: '/category?tip=kategori&kategori=kis&desen=Nordic', label: 'Nordic Serisi' }
                                ].map((d) => (
                                    <li className="d-flex w-100 pt-1" key={d.label}>
                                        <Link href={d.href}
                                            className="nav-link fw-normal text-truncate p-0 text-muted fs-sm animate-underline animate-target"
                                            onClick={closeMenu}>
                                            {d.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </MegaItem>
                <MegaItem id="dort" title="4 Mevsim">
                    <div className="p-4 d-flex flex-column flex-lg-row gap-4">
                        <div style={{ minWidth: '190px' }}>
                            <div className="h6 mb-2">Popüler Ebatlar</div>
                            <ul className="nav flex-column gap-2 mt-0">
                                {[
                                    { href: '/category?tip=kategori&kategori=4mevsim&ebat=195/55R16', label: '195/55R16 4 Mevsim' },
                                    { href: '/category?tip=kategori&kategori=4mevsim&ebat=205/55R16', label: '205/55R16 4 Mevsim' },
                                    { href: '/category?tip=kategori&kategori=4mevsim&ebat=225/45R17', label: '225/45R17 4 Mevsim' }
                                ].map((x) => (
                                    <li className="d-flex w-100 pt-1" key={x.label}>
                                        <Link href={x.href}
                                            className="nav-link fw-normal text-truncate p-0 text-muted fs-sm animate-underline animate-target"
                                            onClick={closeMenu}>
                                            {x.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={{ minWidth: '190px' }}>
                            <div className="h6 mb-2">Markalar</div>
                            <ul className="nav flex-column gap-2 mt-0">
                                {[
                                    { href: '/category?tip=kategori&kategori=4mevsim&marka=Michelin', label: 'Michelin' },
                                    { href: '/category?tip=kategori&kategori=4mevsim&marka=Goodyear', label: 'Goodyear' },
                                    { href: '/category?tip=kategori&kategori=4mevsim&marka=Vredestein', label: 'Vredestein' }
                                ].map((b) => (
                                    <li className="d-flex w-100 pt-1" key={b.label}>
                                        <Link href={b.href}
                                            className="nav-link fw-normal text-truncate p-0 text-muted fs-sm animate-underline animate-target"
                                            onClick={closeMenu}>
                                            {b.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={{ minWidth: '190px' }}>
                            <div className="h6 mb-2">Desenler</div>
                            <ul className="nav flex-column gap-2 mt-0">
                                {[
                                    { href: '/category?tip=kategori&kategori=4mevsim&desen=CrossClimate', label: 'CrossClimate' },
                                    { href: '/category?tip=kategori&kategori=4mevsim&desen=Vector', label: 'Vector 4Seasons' },
                                    { href: '/category?tip=kategori&kategori=4mevsim&desen=Quatrac', label: 'Quatrac' }
                                ].map((d) => (
                                    <li className="d-flex w-100 pt-1" key={d.label}>
                                        <Link href={d.href}
                                            className="nav-link fw-normal text-truncate p-0 text-muted fs-sm animate-underline animate-target"
                                            onClick={closeMenu}>
                                            {d.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </MegaItem>
                {process.env.NODE_ENV === 'development' && (
                    <Nav.Item as="li" className="nav-item">
                        <Link href="/logs" className="nav-link text-warning" onClick={handleClose}>
                            📊 Loglar
                        </Link>
                    </Nav.Item>
                )}
            </Nav>
            <div className="d-flex align-items-center text-white gap-2">
                <i className="ri-message-3-line"></i>
                <button
                    type="button"
                    className="nav-link btn btn-link p-0"
                    data-bs-toggle="modal"
                    data-bs-target="#tireSearch"
                >
                    Lastik Danışmanı
                </button>
            </div>
        </>
    );
}
