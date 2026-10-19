import React from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { API_ENDPOINTS, fetchAPI } from '@/src/config/api';
import { siteTitle } from '@/src/lib/siteMeta';
import { getSiteBySlug, type SiteSlug } from '@/src/config/siteConfig';
import AddedToCart from '@/src/components/alastik/montage/AddedToCart';
import { MontageTheme } from '@/src/components/alastik/montage/shared';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: siteTitle('Montaj Noktaları'),
        description: 'Anlaşmalı montaj noktalarımızı inceleyin; montaj ve diğer hizmetleri sepetinize ekleyin.',
        robots: { index: false, follow: false },
    };
}

const currentSite = (): SiteSlug => (headers().get('x-site') || 'alastik') as SiteSlug;
const montageEnabled = (site: SiteSlug) => Boolean(getSiteBySlug(site)?.theme.montage);

export default async function MontageSelectPage() {
    const site = currentSite();
    if (!montageEnabled(site)) notFound();

    const result = await fetchAPI(API_ENDPOINTS.montage.list());
    const points = result?.success ? (result.data || []) : [];

    return (
        <MontageTheme site={site}>
            <AddedToCart points={points} />
        </MontageTheme>
    );
}
