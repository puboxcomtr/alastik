'use client';
// Anasayfa başlık aksiyonları:
//  - Bayi (veya bayi adına giriş): Cari Hesap Özeti / Sipariş Ver / Cari Ekstre
//  - Plasiyer bayisiz devam: sadece "Bayi Seç" (aynı btn-ghost stili)
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function PageHeadActions() {
    const [plasiyer, setPlasiyer] = useState(false);
    const [hazir, setHazir] = useState(false);

    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        const plasiyerToken = localStorage.getItem('plasiyerToken');
        setPlasiyer(!authToken && !!plasiyerToken);
        setHazir(true);
    }, []);

    if (!hazir) return <div className="page-head-actions" />;

    if (plasiyer) {
        const bayiSec = () => {
            try { sessionStorage.removeItem('plasiyerDevam'); } catch { }
            window.location.href = '/';
        };
        return (
            <div className="page-head-actions">
                <button type="button" className="btn-ghost" onClick={bayiSec}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                    </svg>
                    Bayi Seç
                </button>
            </div>
        );
    }

    return (
        <div className="page-head-actions">
            <Link className="btn-ghost" href="/cari">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M16 12h.01M2 10h20" />
                </svg>
                Cari Hesap Özeti
            </Link>
            <Link className="btn-ghost" href="/">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="9" cy="20" r="1.5" />
                    <circle cx="18" cy="20" r="1.5" />
                    <path d="M2 3h3l2.4 12.3a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 7H6" />
                </svg>
                Sipariş Ver
            </Link>
            <Link className="btn-ghost" href="/raporlar/cari-hareketler">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
                </svg>
                Cari Ekstre
            </Link>
        </div>
    );
}
