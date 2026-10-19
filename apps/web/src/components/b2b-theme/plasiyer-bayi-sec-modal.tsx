'use client';
import { useCallback, useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';
import { PremiumBadge } from './premium-badge';

type Cari = { id: string; name: string; cariKodu: string; email: string; phone: string; premium?: boolean };

export function PlasiyerBayiSecModal({ onDevamEt }: { onDevamEt?: () => void }) {
    const [token, setToken] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [cariler, setCariler] = useState<Cari[]>([]);
    const [loading, setLoading] = useState(true);
    const [entering, setEntering] = useState<string | null>(null);

    useEffect(() => {
        setToken(localStorage.getItem('plasiyerToken'));
    }, []);

    const loadCariler = useCallback(async (q: string, t: string) => {
        setLoading(true);
        try {
            const res = await fetch(API_ENDPOINTS.b2b.plasiyerCariler(q), { headers: { Authorization: `Bearer ${t}` } });
            const data = await res.json();
            setCariler(data?.success ? (data.data || []) : []);
        } catch {
            setCariler([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!token) return;
        const timer = setTimeout(() => loadCariler(search, token), 300);
        return () => clearTimeout(timer);
    }, [search, token, loadCariler]);

    const handleSelect = async (cari: Cari) => {
        if (!token) return;
        setEntering(cari.id);
        try {
            const res = await fetch(API_ENDPOINTS.b2b.plasiyerBayiGiris(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ memberId: cari.id }),
            });
            const data = await res.json();
            if (data?.success && data.data?.token) {
                localStorage.setItem('authToken', data.data.token);
                document.cookie = `authToken=${data.data.token}; path=/; max-age=${24 * 60 * 60}`;
                window.location.href = '/';
            } else {
                setEntering(null);
            }
        } catch {
            setEntering(null);
        }
    };

    return (
        <div role="dialog" aria-modal="true"
            style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ width: '100%', maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 8, boxShadow: '0 12px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid #eee' }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Bayi Seçin</h2>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: '#666' }}>Adına işlem yapmak istediğiniz bayiyi seçin.</p>
                </div>
                {onDevamEt ? (
                    <div style={{ padding: '14px 20px 0' }}>
                        <button type="button" onClick={onDevamEt}
                            style={{ width: '100%', background: '#1a1a1a', color: '#fff', border: 'none', borderRadius: 6, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
                            </svg>
                            Plasiyer olarak devam et
                        </button>
                    </div>
                ) : null}
                <div style={{ padding: '14px 20px 0' }}>
                    <input type="text" placeholder="Bayi adı, cari kodu, e-posta veya telefon ile ara..."
                        value={search} onChange={e => setSearch(e.target.value)} autoFocus
                        style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 5, fontSize: 14, outline: 'none' }} />
                </div>
                <div style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', color: '#888', padding: 24 }}>Yükleniyor...</div>
                    ) : cariler.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#888', padding: 24 }}>Bayi bulunamadı.</div>
                    ) : (
                        cariler.map(cari => (
                            <button key={cari.id} type="button" onClick={() => handleSelect(cari)} disabled={!!entering}
                                style={{ textAlign: 'left', background: '#f7f7f7', border: '1px solid #e5e5e5', borderRadius: 6, padding: '10px 14px', cursor: entering ? 'default' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: entering && entering !== cari.id ? 0.5 : 1 }}>
                                <span>
                                    <span style={{ display: 'block', fontWeight: 600, fontSize: 14 }}>{cari.name || '(isimsiz)'}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 2, fontSize: 12, color: '#888' }}>
                                        Cari Kodu: {cari.cariKodu || '-'}
                                        {cari.premium ? <PremiumBadge /> : null}
                                    </span>
                                </span>
                                <span style={{ color: 'var(--brand-primary, #1e56b3)', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>
                                    {entering === cari.id ? 'Giriliyor...' : 'Cari ile Giriş Yap'}
                                </span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
