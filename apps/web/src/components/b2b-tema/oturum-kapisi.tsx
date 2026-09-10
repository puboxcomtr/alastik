'use client';
// Bayi paneli oturum kapısı: token yoksa giriş sayfasına yönlendirir.
// Token varlığı hızlı kontrol edilir; derin doğrulama /me ucuyla yapılır ve
// geçersiz oturumda çıkışa zorlanır.
import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';

export function OturumKapisi({ children }: { children: React.ReactNode }) {
    const [hazir, setHazir] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = '/giris';
            return;
        }
        fetch(API_ENDPOINTS.b2b.me(), { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => {
                if (d?.success) {
                    setHazir(true);
                } else {
                    localStorage.removeItem('authToken');
                    document.cookie = 'authToken=; path=/; max-age=0';
                    window.location.href = '/giris';
                }
            })
            .catch(() => setHazir(true)); // API geçici erişilemezse panel açık kalır
    }, []);

    if (!hazir) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b6b68' }}>
                Yükleniyor...
            </div>
        );
    }
    return <>{children}</>;
}
