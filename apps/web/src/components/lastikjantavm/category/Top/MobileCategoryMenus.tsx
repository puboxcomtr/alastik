"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Container } from 'react-bootstrap';

interface MenuItemType {
    _id: string;
    name: string;
    menuType: 'link' | 'category' | 'page' | 'blog' | 'product' | 'tag' | 'brand' | 'heading';
    linkData?: {
        url?: string;
        categoryUrl?: string;
        categoryId?: string;
        pageUrl?: string;
        pageId?: string;
        blogUrl?: string;
        blogId?: string;
        productUrl?: string;
        productId?: string;
        tagUrl?: string;
        tagId?: string;
        brandUrl?: string;
        brandId?: string;
    };
    openNewTab?: boolean;
    children?: MenuItemType[];
}

interface MenuType {
    _id: string;
    name: string;
    menuType?: MenuItemType['menuType'];
    linkData?: MenuItemType['linkData'];
    items: MenuItemType[];
}

interface MobileCategoryMenusProps {
    menus: MenuType[];
}

function itemUrl(item: MenuItemType): string {
    if (item.menuType === 'link') return item.linkData?.url || '#';
    if (item.menuType === 'category') return `/kategori/${item.linkData?.categoryUrl || item.linkData?.categoryId}`;
    if (item.menuType === 'page') return `/sayfa/${item.linkData?.pageUrl || item.linkData?.pageId}`;
    if (item.menuType === 'blog') return `/blog/${item.linkData?.blogUrl || item.linkData?.blogId}`;
    if (item.menuType === 'product') return `/urun/${item.linkData?.productUrl || item.linkData?.productId}`;
  if (item.menuType === 'tag') return `/etiket/${item.linkData?.tagUrl || item.linkData?.tagId}`;
  if (item.menuType === 'brand') return `/marka/${item.linkData?.brandUrl || item.linkData?.brandId}`;

    return '#';
}

function flattenItems(items: MenuItemType[]): MenuItemType[] {
    return items.flatMap(item =>
        item.menuType === 'heading' ? (item.children || []) : [item, ...(item.children || [])]
    );
}

const PANEL_TRANSITION_MS = 300;

export default function MobileCategoryMenus({ menus }: MobileCategoryMenusProps) {
    const [isMobile, setIsMobile] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isPanelVisible, setIsPanelVisible] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);

        check();
        window.addEventListener('resize', check);

        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        document.body.style.overflow = openMenuId ? 'hidden' : '';

        return () => { document.body.style.overflow = ''; };
    }, [openMenuId]);

    const openPanel = (menuId: string) => {
        setOpenMenuId(menuId);
        requestAnimationFrame(() => setIsPanelVisible(true));
    };

    const closePanel = () => {
        setIsPanelVisible(false);
        setTimeout(() => setOpenMenuId(null), PANEL_TRANSITION_MS);
    };

    if (!isMobile) return null;

    const visibleMenus = (menus || []).filter(menu => flattenItems(menu.items || []).length > 0);

    if (visibleMenus.length === 0) return null;

    const openMenu = visibleMenus.find(menu => menu._id === openMenuId) || null;
    const openMenuLinks = openMenu ? flattenItems(openMenu.items) : [];

    return (
        <>
            <Container className="mb-3 px-0">
                {visibleMenus.map(menu => (
                    <button
                        key={menu._id}
                        type="button"
                        className="d-flex align-items-center justify-content-between w-100 bg-transparent border-0 border-bottom py-3 px-0 text-start fw-semibold"
                        onClick={() => openPanel(menu._id)}
                    >
                        <span className="text-truncate">{menu.name}</span>
                        <i className="ri-arrow-right-s-line fs-5 flex-shrink-0"></i>
                    </button>
                ))}
            </Container>

            {openMenu && (
                <div
                    className="offcanvas-backdrop fade show"
                    style={{ opacity: isPanelVisible ? 0.5 : 0, transition: `opacity ${PANEL_TRANSITION_MS}ms ease-in-out` }}
                    onClick={closePanel}
                />
            )}
            <div
                className="offcanvas offcanvas-start"
                style={{
                    width: '60%',
                    visibility: openMenu ? 'visible' : 'hidden',
                    transform: isPanelVisible ? 'translateX(0)' : 'translateX(-100%)',
                    transition: `transform ${PANEL_TRANSITION_MS}ms ease-in-out`
                }}
                tabIndex={-1}
            >
                <div className="offcanvas-header">
                    <h5 className="offcanvas-title text-truncate">{openMenu?.name || ''}</h5>
                    <button type="button" className="btn-close" onClick={closePanel} aria-label="Kapat" />
                </div>
                <div className="offcanvas-body">
                    <ul className="nav flex-column mb-0">
                        {openMenu?.menuType && openMenu.menuType !== 'heading' && (
                            <li className="d-flex w-100 border-bottom py-2">
                                <Link
                                    href={itemUrl({ _id: openMenu._id, name: openMenu.name, menuType: openMenu.menuType, linkData: openMenu.linkData })}
                                    className="nav-link fw-semibold fs-sm p-0"
                                    onClick={closePanel}
                                >
                                    {openMenu.name}
                                </Link>
                            </li>
                        )}
                        {openMenuLinks.map(item => (
                            <li key={item._id} className="d-flex w-100 border-bottom py-2">
                                <Link
                                    href={itemUrl(item)}
                                    className="nav-link fw-normal fs-sm text-muted p-0"
                                    target={item.openNewTab ? '_blank' : undefined}
                                    onClick={closePanel}
                                >
                                    {item.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </>
    );
}
