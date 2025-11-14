'use client';

import Nav from 'react-bootstrap/Nav';
import Link from 'next/link';
import { useMenu } from '@/src/hooks/Menu/useMenu';
import MegaItem from './MegaItem';

interface MainMenuProps {
    handleClose: () => void;
}

export default function MainMenu({ handleClose }: MainMenuProps) {
    const { menus, loading, getMenuUrl } = useMenu();

    if (loading) {
        return (
            <Nav as="ul" className="navbar-nav">
                <Nav.Item as="li">
                    <span className="nav-link text-white">Yükleniyor...</span>
                </Nav.Item>
            </Nav>
        );
    }

    const closeMenu = () => handleClose();

    return (
        <Nav as="ul" className="navbar-nav align-items-baseline align-items-lg-center position-relative">
            {menus.map((menu) => {
                // Alt menüsü yoksa direkt link
                if (!menu.children || menu.children.length === 0) {
                    return (
                        <Nav.Item as="li" className="nav-item" key={menu._id}>
                            <Link
                                href={getMenuUrl(menu)}
                                className="nav-link text-white"
                                onClick={handleClose}
                                target={menu.openNewTab ? '_blank' : undefined}
                            >
                                {menu.name}
                            </Link>
                        </Nav.Item>
                    );
                }

                // Alt menüsü varsa MegaMenu
                return (
                    <MegaItem
                        key={menu._id}
                        id={menu._id}
                        title={menu.name}
                    >
                        <div className="p-4 d-flex flex-column flex-lg-row gap-4">
                            {menu.children.map((child) => (
                                <div style={{ minWidth: '190px' }} key={child._id}>
                                    <div className="h6 mb-2">{child.name}</div>
                                    {child.children && child.children.length > 0 && (
                                        <ul className="nav flex-column gap-2 mt-0">
                                            {child.children.map((subChild) => (
                                                <li className="d-flex w-100 pt-1" key={subChild._id}>
                                                    <Link
                                                        href={getMenuUrl(subChild)}
                                                        className="nav-link fw-normal text-truncate p-0 text-muted fs-sm animate-underline animate-target"
                                                        onClick={closeMenu}
                                                        target={subChild.openNewTab ? '_blank' : undefined}
                                                    >
                                                        {subChild.name}
                                                    </Link>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    </MegaItem>
                );
            })}
        </Nav>
    );
}