import React from 'react';

export type Crumb = { name: string; path?: string };

export function JsonLd({ data }: { data: object | object[] }) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
        />
    );
}

export function breadcrumbJsonLd(origin: string, crumbs: Crumb[]) {
    const items = [{ name: 'Ana Sayfa', path: '/' }, ...crumbs].filter(c => c.name);
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.name,
            ...(i < items.length - 1 && c.path ? { item: `${origin}${c.path}` } : {})
        }))
    };
}

const SITE_IDENTITY: Record<string, { name: string; telephone?: string }> = {
    lastikjantavm: { name: 'LastikJantAVM', telephone: '+90-212-212-08-08' },
    alastik: { name: 'ALastik.com' }
};

export function siteJsonLd(siteSlug: string, origin: string) {
    const identity = SITE_IDENTITY[siteSlug];
    if (!identity) return [];
    return [
        {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            '@id': `${origin}/#organization`,
            name: identity.name,
            url: origin,
            ...(identity.telephone
                ? { contactPoint: { '@type': 'ContactPoint', telephone: identity.telephone, contactType: 'customer service', areaServed: 'TR', availableLanguage: 'Turkish' } }
                : {})
        },
        {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': `${origin}/#website`,
            name: identity.name,
            url: origin,
            inLanguage: 'tr-TR',
            publisher: { '@id': `${origin}/#organization` },
            potentialAction: {
                '@type': 'SearchAction',
                target: { '@type': 'EntryPoint', urlTemplate: `${origin}/arama?q={search_term_string}` },
                'query-input': 'required name=search_term_string'
            }
        }
    ];
}
