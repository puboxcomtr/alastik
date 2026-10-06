// LJA marka / marka × mevsim sayfasının ürün listesi altındaki içerik bölümü (server component).
// Giriş ve ilk bölüm açık; diğer bölümler "Devamını oku" altında, bağlantı listeleri ve SSS kapalı
// kutularda durur — sayfa kalabalık görünmez, metnin tamamı sunucu HTML'inde bulunur.
import React from 'react';
import Link from 'next/link';
import { JsonLd } from '@/src/lib/structuredData';
import type { BrandContent, Section } from '@/src/lib/brandText';

const CSS = `
.bsc { margin-top: 28px; color: #333; }
.bsc h2 { font-size: 1.15rem; font-weight: 700; margin: 22px 0 10px; color: #111; }
.bsc p { line-height: 1.7; margin-bottom: 10px; }
.bsc ul { padding-left: 1.1rem; margin-bottom: 12px; }
.bsc li { line-height: 1.65; margin-bottom: 6px; }
.bsc a { color: #111; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
.bsc-chips { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 18px; }
.bsc-chips span { font-size: .85rem; color: #6c757d; margin-right: 2px; }
.bsc-chips a { font-size: .85rem; font-weight: 600; text-decoration: none; padding: 6px 12px; border-radius: 999px; border: 1px solid #ddd; background: #fff; color: #111; }
.bsc-chips a:hover { border-color: #111; }
.bsc-chips small { color: #888; font-weight: 500; }
.bsc details { border-top: 1px solid #eee; }
.bsc details > summary { cursor: pointer; list-style: none; padding: 12px 0; font-weight: 700; display: flex; justify-content: space-between; gap: 12px; }
.bsc details > summary::-webkit-details-marker { display: none; }
.bsc details > summary::after { content: '+'; color: #999; font-size: 1.2rem; line-height: 1; }
.bsc details[open] > summary::after { content: '–'; }
.bsc .bsc-more > summary { color: #111; text-decoration: underline; text-underline-offset: 3px; justify-content: flex-start; border: 0; }
.bsc .bsc-more > summary::after { content: ''; }
.bsc .bsc-more[open] > summary { display: none; }
.bsc .bsc-more { border-top: 0; }
.bsc-links { display: flex; flex-wrap: wrap; gap: 6px 14px; padding-bottom: 12px; font-size: .9rem; }
.bsc-links a { font-weight: 500; text-decoration: none; }
.bsc-links a:hover { text-decoration: underline; }
.bsc-links small { color: #888; }
.bsc-faq p { padding-bottom: 6px; }
`;

function SectionView({ s }: { s: Section }) {
    return (
        <section id={s.id}>
            <h2>{s.title}</h2>
            {s.paragraphs.map((t, i) => <p key={i}>{t}</p>)}
            {s.list && s.list.length > 0 && (
                <ul>
                    {s.list.map((li, i) => (
                        <li key={i}>
                            {li.label && (li.href
                                ? <><Link href={li.href}>{li.label}</Link>{': '}</>
                                : <><strong>{li.label}</strong>{': '}</>)}
                            {li.text}
                        </li>
                    ))}
                </ul>
            )}
            {s.after?.map((t, i) => <p key={`a${i}`}>{t}</p>)}
        </section>
    );
}

function LinkBox({ title, links }: { title: string; links: { href: string; label: string; n?: number }[] }) {
    if (!links.length) return null;
    return (
        <details>
            <summary>{title}</summary>
            <div className="bsc-links">
                {links.map(l => (
                    <Link key={l.href} href={l.href}>{l.label}{l.n ? <small>{` (${l.n})`}</small> : null}</Link>
                ))}
            </div>
        </details>
    );
}

export default function BrandSeoContent({ content, display, seasonTitle }: { content: BrandContent; display: string; seasonTitle?: string }) {
    const [first, ...rest] = content.sections;
    return (
        <div className="bsc">
            <style>{CSS}</style>
            {content.faqs.length > 0 && (
                <JsonLd data={{
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    mainEntity: content.faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }))
                }} />
            )}

            {content.seasonLinks.length > 0 && (
                <nav className="bsc-chips" aria-label={seasonTitle ? 'Diğer mevsimler' : 'Mevsime göre'}>
                    <span>{seasonTitle ? 'Diğer mevsimler:' : `Mevsime göre ${display}:`}</span>
                    {content.seasonLinks.map(l => (
                        <Link key={l.href} href={l.href}>{l.label}{l.n ? <small>{` ${l.n}`}</small> : null}</Link>
                    ))}
                </nav>
            )}

            {content.intro.map((t, i) => <p key={i}>{t}</p>)}
            {first && <SectionView s={first} />}

            {rest.length > 0 && (
                <details className="bsc-more">
                    <summary>Devamını oku</summary>
                    {rest.map(s => <SectionView key={s.id} s={s} />)}
                </details>
            )}

            <div className="mt-3">
                <LinkBox title={`${display} Desenleri`} links={content.seriesLinks} />
                <LinkBox title={`${display} Lastik Ebatları`} links={content.sizeLinks} />
            </div>

            {content.faqs.length > 0 && (
                <div className="bsc-faq mt-3">
                    <h2>Sık Sorulan Sorular</h2>
                    {content.faqs.map(f => (
                        <details key={f.q}>
                            <summary>{f.q}</summary>
                            <p>{f.a}</p>
                        </details>
                    ))}
                </div>
            )}
        </div>
    );
}
