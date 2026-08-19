'use client';
import React, { useEffect, useState } from 'react';

// Tanıtım popup'ı: ziyaretçiye saatte en fazla bir kez gösterilir.
// Gösterim anı localStorage'a yazılır; süre dolmadan tekrar gösterilmez.
// Anahtar sürümü artırılırsa tüm ziyaretçilerde sayaç sıfırlanır (popup yeniden görünür)
const STORAGE_KEY = 'lja_banner_popup_last_seen_v2';
const SHOW_INTERVAL_MS = 60 * 60 * 1000; // 1 saat
const BANNER_SRC = '/uploads/general/lastikjantavm-banner.jpeg';

export default function BannerPopup() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        let lastSeen = 0;
        try {
            lastSeen = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10) || 0;
        } catch {
            // localStorage erişilemiyorsa (gizli mod vb.) sıklık sınırı korunamaz; popup gösterilmez
            return;
        }
        if (Date.now() - lastSeen < SHOW_INTERVAL_MS) return;

        const timer = setTimeout(() => {
            setVisible(true);
            try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { }
        }, 900);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (!visible) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setVisible(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [visible]);

    if (!visible) return null;

    return (
        <div
            onClick={() => setVisible(false)}
            style={{
                position: 'fixed', inset: 0, zIndex: 10500,
                background: 'rgba(0,0,0,.88)',
                backdropFilter: 'blur(7px)',
                WebkitBackdropFilter: 'blur(7px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '16px', animation: 'ljaPopupFade .3s ease'
            }}
        >
            <style>{`
                @keyframes ljaPopupFade { from { opacity: 0; } to { opacity: 1; } }
                @keyframes ljaPopupZoom { from { transform: scale(.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    position: 'relative', maxWidth: 'min(540px, 94vw)',
                    animation: 'ljaPopupZoom .35s ease'
                }}
            >
                <button
                    aria-label="Kapat"
                    onClick={() => setVisible(false)}
                    style={{
                        position: 'absolute', top: '-14px', right: '-14px',
                        width: '36px', height: '36px', borderRadius: '50%',
                        border: 'none', background: '#e4cc15', color: '#232323',
                        fontSize: '22px', fontWeight: 700, lineHeight: 1,
                        cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,.4)', zIndex: 1
                    }}
                >
                    ×
                </button>
                <img
                    src={BANNER_SRC}
                    alt="Yenilenmiş Lastikjantavm.com sitemiz yayındadır"
                    style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '14px', boxShadow: '0 12px 40px rgba(0,0,0,.5)' }}
                />
            </div>
        </div>
    );
}
