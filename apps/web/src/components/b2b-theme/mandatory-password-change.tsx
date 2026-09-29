'use client';
// Bayi varsayılan şifre (12345) ile girdiğinde açılan ZORUNLU şifre değiştirme modalı.
// Kapatılamaz (X yok, arka plana tıklama kapatmaz); şifre değişmeden panele geçilemez.
import { useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';

const VARSAYILAN = '12345';

/**
 * Zorunlu şifre değiştirme modalı. Bayi (authToken + b2b.sifreDegistir) ve
 * plasiyer (plasiyerToken + b2b.plasiyerSifreDegistir) için tek bileşen.
 */
export function MandatoryPasswordChange({
    onDone,
    endpoint = API_ENDPOINTS.b2b.sifreDegistir(),
    tokenKey = 'authToken',
}: { onDone: () => void; endpoint?: string; tokenKey?: string }) {
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
            style={{
                position: 'fixed', inset: 0, zIndex: 3000,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
            }}
        >
            <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 8, boxShadow: '0 12px 40px rgba(0,0,0,0.3)', overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid #eee' }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Zorunlu Şifre Değişikliği</h2>
                    <p style={{ margin: '6px 0 0', fontSize: 13, color: '#666' }}>
                        Güvenliğiniz için varsayılan şifrenizi değiştirmeniz gerekiyor. Devam etmek için yeni bir şifre belirleyin.
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
                        style={{ marginTop: 4, background: 'var(--brand-primary, #1e56b3)', color: '#fff', border: 'none', borderRadius: 5, padding: '11px', fontSize: 15, fontWeight: 700, cursor: kaydediyor ? 'default' : 'pointer' }}>
                        {kaydediyor ? 'Kaydediliyor...' : 'Şifreyi Değiştir ve Devam Et'}
                    </button>
                </div>
            </div>
        </div>
    );
}
