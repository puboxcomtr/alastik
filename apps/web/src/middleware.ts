import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveSiteFromHost } from './config/siteConfig';

type RedirectMap = Record<string, { t: string; c: number }>;
const redirectCache: Record<string, { map: RedirectMap; at: number }> = {};
const REDIRECT_TTL = 60 * 1000;

async function getRedirectMap(site: string): Promise<RedirectMap> {
    const now = Date.now();
    const cached = redirectCache[site];
    if (cached && now - cached.at < REDIRECT_TTL) return cached.map;

    try {
        const base = process.env.NEXT_PUBLIC_API_URL || '';
        const res = await fetch(`${base}/redirects/map`, {
            headers: { 'X-Site': site },
            signal: AbortSignal.timeout(3000)
        });
        const json = await res.json();
        const map: RedirectMap = json?.success ? json.data : (cached?.map || {});
        redirectCache[site] = { map, at: now };
        return map;
    } catch {
        redirectCache[site] = { map: cached?.map || {}, at: now };
        return cached?.map || {};
    }
}

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('authToken')?.value;
    const url = request.nextUrl.clone();

    const host = request.headers.get('host');
    const site = resolveSiteFromHost(host);

    if (url.pathname !== '/') {
        const normalized = url.pathname.replace(/\/+$/, '').toLowerCase() || '/';
        const map = await getRedirectMap(site);
        const hit = map[normalized];
        if (hit) {
            const destination = /^https?:\/\//i.test(hit.t)
                ? hit.t
                : new URL(hit.t, request.url).toString();
            return NextResponse.redirect(destination, hit.c === 302 ? 302 : 301);
        }
    }

    if (url.pathname === '/giris-yap' && token) {
        url.pathname = '/hesabim';
        return NextResponse.redirect(url);
    }
    if (url.pathname === '/kayit-ol' && token) {
        url.pathname = '/hesabim';
        return NextResponse.redirect(url);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-site', site);

    if (site === 'b2b' && !url.pathname.startsWith('/b2b-app')) {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = `/b2b-app${url.pathname === '/' ? '' : url.pathname}`;
        const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
            request: { headers: requestHeaders },
        });
        rewriteResponse.cookies.set('site', site, { path: '/', sameSite: 'lax' });
        if (!request.cookies.get('sid')?.value) {
            rewriteResponse.cookies.set('sid', crypto.randomUUID(), { path: '/', sameSite: 'lax' });
        }
        return rewriteResponse;
    }

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });
    response.cookies.set('site', site, { path: '/', sameSite: 'lax' });

    if (!request.cookies.get('sid')?.value) {
        response.cookies.set('sid', crypto.randomUUID(), { path: '/', sameSite: 'lax' });
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
