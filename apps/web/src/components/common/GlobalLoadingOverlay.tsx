'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function GlobalLoadingOverlay() {
    const pathname = usePathname();
    const [show, setShow] = useState(true);

    useEffect(() => {
        // Sayfa değiştiğinde tekrar göster
        setShow(true);

        // Sayfa tamamen yüklendiğinde gizle
        const hideOverlay = () => {
            // Küçük gecikme ile fade-out
            setTimeout(() => setShow(false), 300);
        };

        if (document.readyState === 'complete') {
            // Sayfa zaten yüklendiyse hemen gizle
            hideOverlay();
        } else {
            // Yüklenme tamamlanınca gizle
            window.addEventListener('load', hideOverlay, { once: true });
            // Güvenlik için maksimum 5 saniyede zorla kapat
            const safetyTimer = setTimeout(hideOverlay, 5000);
            return () => {
                window.removeEventListener('load', hideOverlay);
                clearTimeout(safetyTimer);
            };
        }
    }, [pathname]);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: '#ffffff',
                zIndex: 99999,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                transition: 'opacity 0.3s ease-in-out',
                opacity: show ? 1 : 0,
                pointerEvents: show ? 'auto' : 'none',
                visibility: show ? 'visible' : 'hidden'
            }}
        >
            <div
                className="spinner-border"
                role="status"
                style={{ width: '3rem', height: '3rem', color: 'var(--brand-primary, #0d6efd)' }}
            >
                <span className="visually-hidden">Yükleniyor...</span>
            </div>
            <p style={{ fontSize: '14px', color: '#6c757d', margin: 0 }}>
                Yükleniyor...
            </p>
        </div>
    );
}