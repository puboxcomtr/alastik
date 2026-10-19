import { headers } from 'next/headers';
import { SITES, DEFAULT_SITE, isValidSite, type SiteConfig } from '@/src/config/siteConfig';

export function getActiveSiteConfig(): SiteConfig {
    const slug = headers().get('x-site') || DEFAULT_SITE;
    return isValidSite(slug) ? SITES[slug] : SITES[DEFAULT_SITE];
}

export function siteTitle(pageTitle: string, separator: string = '|'): string {
    return `${pageTitle} ${separator} ${getActiveSiteConfig().brandTitle}`;
}
