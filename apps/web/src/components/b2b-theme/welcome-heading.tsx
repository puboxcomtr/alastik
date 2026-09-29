'use client';
// Anasayfa karşılama başlığı: "Hoşgeldiniz, <Cari Adı>" — ad oturumdan gelir,
// yalnız baş harfleri büyük yazılır; cari adı kalındır.
import { useEffect, useState } from 'react';
import { API_ENDPOINTS } from '@src/config/api';

/** Türkçe kurallarıyla her kelimenin yalnız baş harfini büyütür */
function basHarfleriBuyut(text: string): string {
    return text
        .toLocaleLowerCase('tr-TR')
        .split(/\s+/)
        .map(k => (k ? k.charAt(0).toLocaleUpperCase('tr-TR') + k.slice(1) : k))
        .join(' ');
}

/** Uzun cari adını kısaltır ve sonuna "…" ekler (tam adı title'da kalır). */
const AD_MAKS = 28;
function kisalt(text: string, max = AD_MAKS): string {
    if (text.length <= max) return text;
    return text.slice(0, max).trimEnd() + '…';
}

// authToken JWT'sinden impersonatedByName (plasiyer adı) çöz — impersonation'da onu göster
function plasiyerAdi(token: string): string {
    try {
        const p = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(decodeURIComponent(atob(p).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
        return payload?.impersonatedByName ? String(payload.impersonatedByName) : '';
    } catch {
        return '';
    }
}

export function WelcomeHeading() {
    const [ad, setAd] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        // Plasiyer bayi adına girdiyse: bayi adı yerine PLASİYER adını göster
        const sp = plasiyerAdi(token);
        if (sp) { setAd(basHarfleriBuyut(sp)); return; }
        fetch(API_ENDPOINTS.b2b.me(), { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { if (d?.success && d.data?.name) setAd(basHarfleriBuyut(d.data.name)); })
            .catch(() => {});
    }, []);

    return (
        <div>
            <h1 style={{ fontWeight: 400, lineHeight: 1.2, marginBottom: 0 }}>
                Hoşgeldiniz{ad ? ', ' : ''}<strong title={ad}>{kisalt(ad)}</strong>
            </h1>
            <p className="sub" style={{ marginTop: 4, lineHeight: 1.3 }}>
                Cari bakiyeniz ve limitiniz özet olarak aşağıdadır.
            </p>
        </div>
    );
}
