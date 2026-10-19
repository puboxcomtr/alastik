'use client';
import Link from 'next/link';
import { ROUTES } from '@/src/config/routes';

interface BreadcrumbProps {
    query: string;
}

export default function Breadcrumb({ query }: BreadcrumbProps) {
    return (
        <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                    <Link href={ROUTES.HOME}>Ana Sayfa</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                    Arama: &quot;{query}&quot;
                </li>
            </ol>
        </nav>
    );
}