'use client';
import { useState } from 'react';
import Nav from 'react-bootstrap/Nav';
import Link from 'next/link';
import { useMenu } from '@/src/hooks/Menu/useMenu';
import MegaItem from './MegaItem';

interface MainMenuProps {
    handleClose: () => void;
}

export default function MainMenu({ handleClose }: MainMenuProps) {
    const { menus, getMenuUrl } = useMenu();
    const closeMenu = () => handleClose?.();
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    // Alt menüleri başlıklara göre grupla
    const groupChildrenByHeading = (children: any[]) => {
        const groups: { heading: string; items: any[] }[] = [];
        let currentGroup: { heading: string; items: any[] } | null = null;

        children.forEach((child) => {
            if (child.menuType === 'heading') {
                if (currentGroup) {
                    groups.push(currentGroup);
                }
                currentGroup = {
                    heading: child.name,
                    items: []
                };
            } else {
                if (currentGroup) {
                    currentGroup.items.push(child);
                } else {
                    currentGroup = {
                        heading: '',
                        items: [child]
                    };
                }
            }
        });
        if (currentGroup) {
            groups.push(currentGroup);
        }

        return groups;
    };

    return (
        <Nav as="ul" id="mobile__menu" className="navbar-nav align-items-baseline align-items-lg-center position-relative">
            {menus.map((menu) => {
                if (!menu.children || menu.children.length === 0) {
                    return (
                        <Nav.Item as="li" className="nav-item" key={menu._id}>
                            <Link
                                href={getMenuUrl(menu)}
                                className="nav-link"
                                onClick={handleClose}
                                target={menu.openNewTab ? '_blank' : undefined}
                            >
                                {menu.name}
                            </Link>
                        </Nav.Item>
                    );
                }
                const groupedChildren = groupChildrenByHeading(menu.children);
                return (
                    <MegaItem
                        key={menu._id}
                        id={menu._id}
                        title={menu.name}
                        href={getMenuUrl(menu)}
                        openMenuId={openMenuId}
                        setOpenMenuId={setOpenMenuId}
                    >
                        <div className="mobile__mega d-flex flex-column flex-lg-row gap-4">
                            {groupedChildren.map((group, groupIndex) => (
                                <div style={{ minWidth: '190px' }} key={`group-${groupIndex}`}>
                                    {group.heading && (
                                        <div className="h6 mb-2">{group.heading}</div>
                                    )}
                                    {group.items.length > 0 && (
                                        <ul className="nav flex-column gap-2 mt-0">
                                            {group.items.map((item) => (
                                                <li className="d-flex w-100 pt-1" key={item._id}>
                                                    <Link
                                                        href={getMenuUrl(item)}
                                                        className="nav-link fw-normal text-truncate p-0 text-muted fs-sm animate-underline animate-target"
                                                        onClick={closeMenu}
                                                        target={item.openNewTab ? '_blank' : undefined}
                                                    >
                                                        {item.name}
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