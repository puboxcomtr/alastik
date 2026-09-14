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

export function WelcomeHeading() {
    const [ad, setAd] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        fetch(API_ENDPOINTS.b2b.me(), { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { if (d?.success && d.data?.name) setAd(basHarfleriBuyut(d.data.name)); })
            .catch(() => {});
    }, []);

    return (
        <div>
            <h1 style={{ fontWeight: 400, lineHeight: 1.2, marginBottom: 0 }}>
                Hoşgeldiniz{ad ? ', ' : ''}<strong>{ad}</strong>
            </h1>
            <p className="sub" style={{ marginTop: 4, lineHeight: 1.3 }}>
                Cari bakiyeniz ve limitiniz özet olarak aşağıdadır.
            </p>
        </div>
    );
}
