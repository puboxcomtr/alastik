'use client';

import { useState } from 'react';
import Nav from 'react-bootstrap/Nav';
import Dropdown from 'react-bootstrap/Dropdown';

interface MegaItemProps {
    id: string;
    title: string;
    children: React.ReactNode;
}

export default function MegaItem({ id, title, children }: MegaItemProps) {
    const [show, setShow] = useState(false);

    return (
        <Dropdown
            as={Nav.Item}
            show={show}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
            className="nav-item dropdown"
        >
            <Dropdown.Toggle
                as={Nav.Link}
                className="nav-link text-white dropdown-toggle"
                id={`dropdown-${id}`}
            >
                {title}
            </Dropdown.Toggle>

            <Dropdown.Menu className="dropdown-menu mega-dropdown">
                {children}
            </Dropdown.Menu>
        </Dropdown>
    );
}