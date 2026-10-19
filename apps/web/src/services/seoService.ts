import { headers } from 'next/headers';
import { API_ENDPOINTS } from '@/src/config/api';
import { getSiteBySlug } from '@/src/config/siteConfig';

export async function getSeo() {
    try {
        const site = headers().get('x-site') || 'alastik';
        const res = await fetch(API_ENDPOINTS.seo.get(), {
            cache: 'no-store',
            headers: { 'X-Site': site }
        });
        if (!res.ok) {
            throw new Error('SEO yuklenemedi');
        }
        const data = await res.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('[seoService] getSeo error:', error);
        return null;
    }
}
export async function getOtherSeo(key: string, noindex: boolean = false) {
    const seo = await getSeo();
    const site = headers().get('x-site') || 'alastik';
    const cfg = getSiteBySlug(site);
    const siteName = cfg?.name || 'ALastik';

    const item = seo?.other?.[key];

    const replace = (s: string) =>
        s ? s.split('{site-adi}').join(siteName) : '';

    const meta: any = {};
    if (item) {
        meta.title = replace(item.title) || undefined;
        meta.description = replace(item.description) || undefined;
    }
    if (noindex) {
        meta.robots = { index: false, follow: false };
    }
    return meta;
}