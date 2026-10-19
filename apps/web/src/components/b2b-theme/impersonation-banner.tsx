'use client';
import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';
import { clearStoredCart } from './cart-status';

function decodeJwt(token: string): Record<string, unknown> | null {
    try {
        const part = token.split('.')[1];
        const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
        const json = decodeURIComponent(
            atob(b64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export function ImpersonationBanner() {
    const [info, setInfo] = useState<{ spName: string; dealerName: string } | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        const payload = decodeJwt(token);
        if (!payload || !payload.impersonatedBy) return;

        const spName = String(payload.impersonatedByName || 'Plasiyer');
        setInfo({ spName, dealerName: '' });

        fetch(API_ENDPOINTS.b2b.me(), { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { if (d?.success) setInfo(prev => prev ? { ...prev, dealerName: d.data?.name || '' } : prev); })
            .catch(() => { });
    }, []);

    if (!info) return null;

    const bayiDegistir = () => {
        localStorage.removeItem('authToken');
        document.cookie = 'authToken=; path=/; max-age=0';
        try { sessionStorage.removeItem('plasiyerDevam'); } catch { }
        window.location.href = '/';
    };
    const cikis = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('plasiyerToken');
        clearStoredCart();
        document.cookie = 'authToken=; path=/; max-age=0';
        window.location.href = '/giris';
    };

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: 12,
                padding: '8px 16px',
                background: '#3a2f00',
                color: '#ffe483',
                borderBottom: '1px solid #5c4a00',
                fontSize: 13,
                fontWeight: 500,
            }}
        >
            <span>
                <strong>{info.spName}</strong> olarak
                {info.dealerName ? <> <strong>{info.dealerName}</strong> bayisi</> : ' bu bayi'} adına işlem yapıyorsunuz.
            </span>
            <span style={{ display: 'flex', gap: 8 }}>
                <button
                    type='button'
                    onClick={bayiDegistir}
                    style={{ background: 'transparent', border: '1px solid #ffe483', color: '#ffe483', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                    Bayi Değiştir
                </button>
                <button
                    type='button'
                    onClick={cikis}
                    style={{ background: '#ffe483', border: '1px solid #ffe483', color: '#3a2f00', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                >
                    Çıkış
                </button>
            </span>
        </div>
    );
}
