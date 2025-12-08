// apps/web/src/components/tag/Header/Breadcrumb.tsx
'use client';

import Link from 'next/link';
import { ROUTES } from '@/src/config/routes';

interface BreadcrumbProps {
    tagName: string;
    tagSlug: string;
}

export default function Breadcrumb({ tagName, tagSlug }: BreadcrumbProps) {
    return (
        <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                    <Link href={ROUTES.HOME}>Ana Sayfa</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                    {tagName}
                </li>
            </ol>
        </nav>
    );
}