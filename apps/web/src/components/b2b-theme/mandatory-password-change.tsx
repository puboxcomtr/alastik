'use client';
import { useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';

const VARSAYILAN = '12345';

export function MandatoryPasswordChange({
    onDone,
    onSkip,
    endpoint = API_ENDPOINTS.b2b.sifreDegistir(),
    tokenKey = 'authToken',
}: { onDone: () => void; onSkip?: () => void; endpoint?: string; tokenKey?: string }) {
    const [yeni, setYeni] = useState('');
    const [tekrar, setTekrar] = useState('');
    const [kaydediyor, setKaydediyor] = useState(false);
    const [hata, setHata] = useState('');

    const kaydet = async () => {
        setHata('');
        if (yeni.length < 4) return setHata('Yeni şifre en az 4 karakter olmalıdır.');
        if (yeni === VARSAYILAN) return setHata('Yeni şifre varsayılan şifre (12345) olamaz.');
        if (yeni !== tekrar) return setHata('Şifreler eşleşmiyor.');

        setKaydediyor(true);
        try {
            const token = localStorage.getItem(tokenKey);
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ currentPassword: VARSAYILAN, newPassword: yeni }),
            });
            const data = await res.json();
            if (data?.success) {
                onDone();
            } else {
                setHata(data?.message || 'Şifre değiştirilemedi.');
            }
        } catch {
            setHata('Şifre değiştirilemedi, lütfen tekrar deneyin.');
        } finally {
            setKaydediyor(false);
        }
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            onClick={onSkip ? (e) => { if (e.target === e.currentTarget) onSkip(); } : undefined}
            style={{
                position: 'fixed', inset: 0, zIndex: 3000,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
        >
            <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 8, boxShadow: '0 12px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid #eee' }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Şifre Belirleyin</h2>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: '#666' }}>
                        Güvenliğiniz için bir şifre belirleyebilirsiniz. Şifre belirlerseniz, sonraki girişlerde yalnız bu şifre geçerli olur. Belirlemek zorunda değilsiniz.
                    </p>
                </div>
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>Yeni Şifre</label>
                        <input type="password" value={yeni} onChange={e => setYeni(e.target.value)} autoFocus
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 5, fontSize: 14, outline: 'none' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, color: '#555', marginBottom: 4 }}>Yeni Şifre (Tekrar)</label>
                        <input type="password" value={tekrar} onChange={e => setTekrar(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') kaydet(); }}
                            style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 5, fontSize: 14, outline: 'none' }} />
                    </div>
                    {hata ? <div style={{ color: '#c62828', fontSize: 13 }}>{hata}</div> : null}
                    <button type="button" onClick={kaydet} disabled={kaydediyor}
                        style={{ marginTop: 4, background: 'var(--brand-primary, #1e56b3)', color: '#000', border: 'none', borderRadius: 5, padding: '11px', fontSize: 15, fontWeight: 700, cursor: kaydediyor ? 'default' : 'pointer' }}>
                        {kaydediyor ? 'Kaydediliyor...' : 'Şifreyi Belirle ve Devam Et'}
                    </button>
                    {onSkip ? (
                        <button type="button" onClick={onSkip} disabled={kaydediyor}
                            style={{ background: 'transparent', color: '#666', border: 'none', padding: '6px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            Daha Sonra Hatırlat
                        </button>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
