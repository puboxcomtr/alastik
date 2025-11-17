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

    // Alt menüleri başlıklara göre grupla
    const groupChildrenByHeading = (children: any[]) => {
        const groups: { heading: string; items: any[] }[] = [];
        let currentGroup: { heading: string; items: any[] } | null = null;

        children.forEach((child) => {
            if (child.menuType === 'heading') {
                // Yeni başlık geldi, yeni grup başlat
                if (currentGroup) {
                    groups.push(currentGroup);
                }
                currentGroup = {
                    heading: child.name,
                    items: []
                };
            } else {
                // Başlık değilse, mevcut gruba ekle
                if (currentGroup) {
                    currentGroup.items.push(child);
                } else {
                    // Henüz başlık yoksa, başlıksız grup oluştur
                    currentGroup = {
                        heading: '',
                        items: [child]
                    };
                }
            }
        });

        // Son grubu ekle
        if (currentGroup) {
            groups.push(currentGroup);
        }

        return groups;
    };

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

                // Alt menüleri başlıklara göre grupla
                const groupedChildren = groupChildrenByHeading(menu.children);

                // Alt menüsü varsa MegaMenu
                return (
                    <MegaItem
                        key={menu._id}
                        id={menu._id}
                        title={menu.name}
                    >
                        <div className="p-4 d-flex flex-column flex-lg-row gap-4">
                            {groupedChildren.map((group, groupIndex) => (
                                <div style={{ minWidth: '190px' }} key={`group-${groupIndex}`}>
                                    {/* Başlık varsa göster */}
                                    {group.heading && (
                                        <div className="h6 mb-2">{group.heading}</div>
                                    )}

                                    {/* Başlık altındaki linkler */}
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