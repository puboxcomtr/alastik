'use client';

import { useState, useEffect } from 'react';
import Nav from 'react-bootstrap/Nav';
import Dropdown from 'react-bootstrap/Dropdown';
import Link from 'next/link';

interface MegaItemProps {
    id: string;
    title: string;
    href?: string;
    children: React.ReactNode;
    openMenuId?: string | null;
    setOpenMenuId?: (id: string | null) => void;
}
export default function MegaItem({ id, title, href, children, openMenuId, setOpenMenuId }: MegaItemProps) {
    const [show, setShow] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const isOpen = isMobile ? openMenuId === id : show;

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 992);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const handleMouseEnter = () => {
        if (!isMobile) setShow(true);
    };

    const handleMouseLeave = () => {
        if (!isMobile) setShow(false);
    };

    const handleToggle = (e: React.MouseEvent) => {
        if (isMobile) {
            e.preventDefault();
            if (setOpenMenuId) {
                setOpenMenuId(openMenuId === id ? null : id);
            }
        }
    };

    return (
        <Dropdown
            as="li"
            show={isOpen}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="nav-item dropdown position-static"
        >
            {href && href !== '#' && !isMobile ? (
                <Link href={href} className="nav-link dropdown-toggle">
                    {title}
                </Link>
            ) : (
                <button
                    type="button"
                    className={`nav-link btn btn-link text-start w-100 d-flex justify-content-between align-items-center${!isMobile ? ' dropdown-toggle' : ''}`}
                    onClick={handleToggle}
                    aria-expanded={isOpen}
                    id={`dropdown-${id}`}
                    style={{ textDecoration: 'none' }}
                >
                    {title}
                    <i className={`ci-chevron-${isOpen ? 'up' : 'down'} fs-base ms-auto d-lg-none`}></i>
                </button>
            )}

            <Dropdown.Menu className="px-0 dropdown-menu mega-dropdown">
                {children}
            </Dropdown.Menu>
        </Dropdown>
    );
}