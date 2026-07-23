// apps/web/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveSiteFromHost } from './config/siteConfig';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('authToken')?.value;
    const url = request.nextUrl.clone();

    // Host'tan aktif siteyi çöz (alastik / lastikjantavm)
    const host = request.headers.get('host');
    const site = resolveSiteFromHost(host);

    // Auth redirect mantığı (mevcut davranış korunur)
    if (url.pathname === '/giris-yap' && token) {
        url.pathname = '/hesabim';
        return NextResponse.redirect(url);
    }
    if (url.pathname === '/kayit-ol' && token) {
        url.pathname = '/hesabim';
        return NextResponse.redirect(url);
    }

    // Site bilgisini response'a ekle:
    //  - request header (x-site): server component'ler headers() ile okur
    //  - cookie (site): client tarafı tema için okur
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-site', site);

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });
    response.cookies.set('site', site, { path: '/', sameSite: 'lax' });

    return response;
}

export const config = {
    // Tüm sayfalarda çalışır; statik dosyalar ve API rotaları hariç tutulur.
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
