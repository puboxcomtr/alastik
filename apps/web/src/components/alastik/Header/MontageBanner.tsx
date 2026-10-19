'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ALASTIK_MONTAGE_BANNER } from '@/src/config/montageMarquee';
import { SITES } from '@/src/config/siteConfig';

const DISMISS_KEY = 'alastik_montage_banner_closed';

export default function MontageBanner() {
    const { text, href, durationSec } = ALASTIK_MONTAGE_BANNER;
    const brandRed = SITES.alastik.theme.primary;
    const [closed, setClosed] = useState(true);

    useEffect(() => {
        try { setClosed(sessionStorage.getItem(DISMISS_KEY) === '1'); } catch { setClosed(false); }
    }, []);

    const close = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setClosed(true);
        try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {  }
    };

    if (closed) return null;

    return (
        <Link href={href} className="al-montage-banner" aria-label={text}>
            <span className="al-montage-banner-text">{text}</span>
            <button type="button" className="al-montage-banner-close" onClick={close} aria-label="Kapat">
                <i className="ri-close-line" />
            </button>
            <style>{`
                .al-montage-banner { position: relative; display: block; background: #313131; text-align: center; padding: 7px 40px; text-decoration: none; }
                .al-montage-banner-text {
                    font-size: 13px; font-weight: 600; letter-spacing: .3px;
                    background: linear-gradient(90deg, #fff 0%, #fff 42%, ${brandRed} 50%, #fff 58%, #fff 100%);
                    background-size: 220% 100%;
                    -webkit-background-clip: text; background-clip: text;
                    color: transparent;
                    animation: al-banner-shine ${durationSec}s linear infinite;
                }
                @keyframes al-banner-shine { from { background-position: 220% 0; } to { background-position: -220% 0; } }
                .al-montage-banner-close {
                    position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
                    background: none; border: 0; padding: 2px; line-height: 1;
                    color: #9a9a9a; font-size: 18px; cursor: pointer;
                }
                .al-montage-banner-close:hover { color: #fff; }
                @media (max-width: 991.98px) { .al-montage-banner-text { font-size: 12px; } }
                @media (prefers-reduced-motion: reduce) { .al-montage-banner-text { animation: none; color: #fff; background: none; } }
            `}</style>
        </Link>
    );
}
