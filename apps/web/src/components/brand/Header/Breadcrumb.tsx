"use client";

import Link from "next/link";

interface BreadcrumbProps {
    brandName: string;
    brandSlug: string;
}

export default function BrandBreadcrumb({ brandName, brandSlug }: BreadcrumbProps) {
    return (
        <nav aria-label="breadcrumb">
            <ol className="breadcrumb">
                <li className="breadcrumb-item">
                    <Link href="/">Anasayfa</Link>
                </li>
                {/* "Markalar" adımı kaldırıldı: /markalar sayfası yok (LJA'da ana sayfaya 301, alastik'te 404) */}
                <li className="breadcrumb-item active" aria-current="page">
                    {brandName}
                </li>
            </ol>
        </nav>
    );
}