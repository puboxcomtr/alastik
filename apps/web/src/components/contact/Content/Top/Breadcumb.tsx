import React from 'react'
import { ROUTES } from '@/src/config/routes';
import Link from 'next/link';

export default function Breadcumb() {
    return (
        <>
            <nav className="py-1" aria-label="breadcrumb">
                <ol className="breadcrumb mb-0">
                    <li className="breadcrumb-item">
                        <Link href={ROUTES.HOME} className="text-decoration-none">Anasayfa</Link>
                    </li>
                    <li className="breadcrumb-item active" aria-current="page">İletişim</li>
                </ol>
            </nav>
        </>
    )
}
