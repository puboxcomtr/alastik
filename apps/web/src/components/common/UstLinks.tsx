'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/src/lib/api';
import { ROUTES } from '@/src/config/routes';
import { resolveSiteFromHost } from '@/src/config/siteConfig';

type UstLink = {
    _id: string;
    name: string;
    icon?: string;
    menuType: string;
    openNewTab?: boolean;
    linkData?: any;
};

function resolveUrl(m: UstLink): string {
    switch (m.menuType) {
        case 'link': return m.linkData?.url || '#';
        case 'category': return `/kategori/${m.linkData?.categoryUrl || m.linkData?.categoryId}`;
        case 'blogCategory': return `/blog-kategori/${m.linkData?.blogCategoryUrl || m.linkData?.blogCategoryId}`;
        case 'page': return `/sayfa/${m.linkData?.pageUrl || m.linkData?.pageId}`;
        case 'blog': return `/blog/${m.linkData?.blogUrl || m.linkData?.blogId}`;
        case 'product': return `/urun/${m.linkData?.productUrl || m.linkData?.productId}`;
        case 'tag': return `/etiket/${m.linkData?.tagUrl || m.linkData?.tagId}`;
        case 'brand': return `/marka/${m.linkData?.brandUrl || m.linkData?.brandId}`;
        default: return '#';
    }
}

export default function UstLinks() {
    const [links, setLinks] = useState<UstLink[]>([]);
    const [showMontageBuy, setShowMontageBuy] = useState(false);

    useEffect(() => {
        setShowMontageBuy(resolveSiteFromHost(window.location.host) === 'lastikjantavm');
        api.menu.getUstLinks()
            .then((r: any) => {
                if (r?.success) {
                    setLinks((r.data || []).filter((m: UstLink) => m.menuType !== 'heading'));
                }
            })
            .catch(() => {});
    }, []);

    if (!links.length && !showMontageBuy) return null;

    return (
        <div className="ust-links d-none d-lg-flex justify-content-end align-items-center gap-4 pt-2">
            {showMontageBuy && (
                <Link
                    href="/bayi-formu"
                    className="ust-links__item d-inline-flex align-items-center gap-1 text-body fw-medium text-decoration-none"
                >
                    <i className="ri-store-2-line fs-lg" />
                    <span className="fs-sm">Montaj Noktamız Ol</span>
                </Link>
            )}
            {showMontageBuy && (
                <Link
                    href={ROUTES.MONTAGE_BUY}
                    className="ust-links__item d-inline-flex align-items-center gap-1 text-body fw-medium text-decoration-none"
                >
                    <i className="ri-tools-line fs-lg" />
                    <span className="fs-sm">Montaj Satın Al</span>
                </Link>
            )}
            {links.map((m) => (
                <Link
                    key={m._id}
                    href={resolveUrl(m)}
                    target={m.openNewTab ? '_blank' : undefined}
                    rel={m.openNewTab ? 'noopener noreferrer' : undefined}
                    className="ust-links__item d-inline-flex align-items-center gap-1 text-body fw-medium text-decoration-none"
                >
                    {m.icon && <i className={`${m.icon} fs-lg`} />}
                    <span className="fs-sm">{m.name}</span>
                </Link>
            ))}
        </div>
    );
}
