'use client';
import { useEffect, useState } from 'react';
import { SITES } from '@src/config/siteConfig';
import { API_ENDPOINTS } from '@src/config/api';
import B2BLogin from '@src/views/b2b/Login';

const site = SITES.b2b;

interface DealerInfo {
    name: string;
    email: string;
    accountCode: string;
}

const B2BHomePage = () => {
    const [checking, setChecking] = useState(true);
    const [bayi, setBayi] = useState<DealerInfo | null>(null);

    useEffect(() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (!token) { setChecking(false); return; }
        fetch(API_ENDPOINTS.b2b.me(), { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { if (d?.success) setBayi(d.data); })
            .catch(() => {})
            .finally(() => setChecking(false));
    }, []);

    const cikisYap = () => {
        localStorage.removeItem('authToken');
        document.cookie = 'authToken=; path=/; max-age=0';
        window.location.reload();
    };

    if (checking) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a1a', color: '#c9c9c9' }}>
                Yükleniyor...
            </div>
        );
    }

    if (!bayi) return <B2BLogin />;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#141414' }}>
            <header
                style={{
                    background: '#1a1a1a',
                    borderBottom: `2px solid ${site.theme.primary}`,
                    padding: '12px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                }}
            >
                <img src={site.theme.logo} alt={site.name} style={{ height: 38 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 700, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {bayi.name}
                        </div>
                        <div style={{ color: '#9a9a9a', fontSize: 11 }}>Cari Kodu: {bayi.accountCode || '-'}</div>
                    </div>
                    <button
                        type='button'
                        onClick={cikisYap}
                        style={{ background: 'transparent', border: '1px solid #3d3d3d', color: '#c9c9c9', borderRadius: 6, padding: '8px 16px', fontSize: 12, cursor: 'pointer' }}
                    >
                        Çıkış Yap
                    </button>
                </div>
            </header>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#ffffff', textAlign: 'center', padding: 24, gap: 12 }}>
                <span style={{ background: site.theme.primary, color: '#1a1a1a', borderRadius: 6, padding: '6px 16px', fontWeight: 700, fontSize: 13 }}>
                    Hazırlık Aşamasındadır
                </span>
                <p style={{ color: '#9a9a9a', fontSize: 14, margin: 0 }}>
                    Bayi platformumuz çok yakında bu sayfada hizmetinizde olacak.
                </p>
            </main>

            <footer style={{ background: '#1a1a1a', borderTop: '1px solid #2b2b2b', padding: '12px', textAlign: 'center', color: '#777', fontSize: 11 }}>
                © {new Date().getFullYear()} {site.brandTitle}
            </footer>
        </div>
    );
};

export default B2BHomePage;
