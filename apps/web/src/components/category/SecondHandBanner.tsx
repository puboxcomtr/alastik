import React from 'react';
import Link from 'next/link';

interface Props {
    href: string;
    text: string;
    accent?: string;
    accentText?: string;
}

export default function SecondHandBanner({ href, text, accent = '#e4cc15', accentText = '#232323' }: Props) {
    return (
        <>
            <style>{`
                .shb-banner {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 14px;
                    flex-wrap: wrap;
                    margin: 18px 0 8px;
                    padding: 16px 22px;
                    border-radius: 14px;
                    background: linear-gradient(100deg, #232323 0%, #313131 55%, #232323 100%);
                    text-decoration: none;
                    overflow: hidden;
                    border: 1px solid #3d3d3d;
                    transition: transform .25s ease, box-shadow .25s ease;
                }
                .shb-banner:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 22px var(--shb-glow);
                }
                .shb-banner::after {
                    content: '';
                    position: absolute;
                    top: 0; bottom: 0;
                    width: 90px;
                    background: linear-gradient(105deg, transparent, rgba(255,255,255,.22), transparent);
                    transform: skewX(-20deg);
                    animation: shbShine 2.8s ease-in-out infinite;
                }
                @keyframes shbShine {
                    0%   { left: -120px; }
                    60%  { left: calc(100% + 40px); }
                    100% { left: calc(100% + 40px); }
                }
                .shb-banner__badge {
                    background: var(--shb-accent);
                    color: var(--shb-accent-text);
                    font-weight: 800;
                    font-size: .85rem;
                    letter-spacing: .5px;
                    padding: 6px 12px;
                    border-radius: 20px;
                    white-space: nowrap;
                    animation: shbPulse 1.8s ease-in-out infinite;
                }
                @keyframes shbPulse {
                    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 var(--shb-glow); }
                    50%      { transform: scale(1.06); box-shadow: 0 0 0 9px transparent; }
                }
                .shb-banner__text {
                    color: #fff;
                    font-weight: 600;
                    text-align: center;
                }
                .shb-banner__text u { color: var(--shb-accent); }
                .shb-banner__arrow {
                    color: var(--shb-accent);
                    font-size: 1.25rem;
                    line-height: 1;
                    transition: transform .25s ease;
                }
                .shb-banner:hover .shb-banner__arrow { transform: translateX(6px); }
            `}</style>
            <Link
                href={href}
                className="shb-banner"
                style={{
                    '--shb-accent': accent,
                    '--shb-accent-text': accentText,
                    '--shb-glow': `${accent}40`
                } as React.CSSProperties}
            >
                <span className="shb-banner__badge">GARANTİLİ 2.EL</span>
                <span className="shb-banner__text">
                    {text} <u>tıklayınız</u>.
                </span>
                <span className="shb-banner__arrow">➜</span>
            </Link>
        </>
    );
}
