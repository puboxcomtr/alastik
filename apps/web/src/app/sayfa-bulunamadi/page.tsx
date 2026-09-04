import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getSiteBySlug, DEFAULT_SITE } from '@/src/config/siteConfig';
import NotFoundContent from '@/src/components/layout/NotFound/Content';

export const metadata: Metadata = {
    title: 'Sayfa Bulunamadı',
    robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default async function PageNotFound() {
    const siteSlug = (await headers()).get('x-site') || DEFAULT_SITE;
    const site = getSiteBySlug(siteSlug) || getSiteBySlug(DEFAULT_SITE)!;

    return <NotFoundContent site={site.slug} primaryColor={site.theme.primary} />;
}
