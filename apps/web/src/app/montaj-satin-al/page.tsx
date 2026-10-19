import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { API_ENDPOINTS, fetchAPI } from '@/src/config/api';
import { siteTitle } from '@/src/lib/siteMeta';
import { canonicalMeta } from '@/src/lib/canonical';
import { getSiteBySlug, type SiteSlug } from '@/src/config/siteConfig';
import MontageBuy from '@/src/components/alastik/montage/MontageBuy';
import { MontageTheme } from '@/src/components/alastik/montage/shared';

export const revalidate = 300;

const currentSite = (): SiteSlug => (headers().get('x-site') || 'alastik') as SiteSlug;
const montageEnabled = (site: SiteSlug) => Boolean(getSiteBySlug(site)?.theme.montage);

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
    if (!montageEnabled(currentSite())) return {};
    return {
        title: siteTitle('Montaj Satın Al — Lastik Montajı, Balans ve Rot'),
        description: 'Lastiğini başka yerden aldıysan da montaj, balans, rot ve lastik depolama hizmetini online satın al: jant çapını seç, 81 ildeki anlaşmalı montaj noktalarından birini seç, hizmetlerini sepetine ekle.',
        ...(await canonicalMeta('/montaj-satin-al', await searchParams))
    };
}

export default async function MontageBuyPage() {
    const site = currentSite();
    if (!montageEnabled(site)) notFound();
    const result = await fetchAPI(API_ENDPOINTS.montage.list());
    const points = result?.success ? (result.data || []) : [];
    return (
        <Suspense fallback={null}>
            <MontageTheme site={site}>
                <MontageBuy points={points} />
            </MontageTheme>
        </Suspense>
    );
}
