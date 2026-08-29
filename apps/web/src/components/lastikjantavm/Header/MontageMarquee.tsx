'use client';

import Link from 'next/link';
import { MONTAGE_MARQUEE } from '@/src/config/montageMarquee';

/** Siyah şeritte sürekli kayan "81 ilde montaj" yazısı; tüm şerit montaj noktalarına link verir */
export default function MontageMarquee() {
    const { text, href, gapPx, repeat, durationSec, durationSecMobile } = MONTAGE_MARQUEE;
    // İki eş kopya art arda kayar; ilk kopya bitince ikinci başa gelir → kesintisiz döngü
    const track = Array.from({ length: repeat }, (_, i) => (
        <span key={i} className="lja-marquee-item">
{text}
        </span>
    ));

    return (
        <Link href={href} className="lja-marquee" aria-label={text}>
            <div className="lja-marquee-track">
                <div className="lja-marquee-group">{track}</div>
                <div className="lja-marquee-group" aria-hidden="true">{track}</div>
            </div>
            <style>{`
                .lja-marquee { display: block; background: #000; color: #fff; text-decoration: none; overflow: hidden; white-space: nowrap; }
                .lja-marquee:hover { color: #e4cc15; }
                .lja-marquee-track { display: flex; width: max-content; animation: lja-marquee-scroll ${durationSec}s linear infinite; }
                .lja-marquee:hover .lja-marquee-track { animation-play-state: paused; }
                .lja-marquee-group { display: flex; gap: ${gapPx}px; padding-right: ${gapPx}px; }
                .lja-marquee-item { display: inline-flex; align-items: center; font-size: 13px; font-weight: 600; letter-spacing: .3px; padding: 6px 0; }
                @keyframes lja-marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
                @media (max-width: 991.98px) {
                    .lja-marquee-track { animation-duration: ${durationSecMobile}s; }
                    .lja-marquee-item { font-size: 12px; padding: 5px 0; }
                }
                @media (prefers-reduced-motion: reduce) { .lja-marquee-track { animation: none; } }
            `}</style>
        </Link>
    );
}
