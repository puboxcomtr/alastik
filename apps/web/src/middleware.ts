
// apps/web/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('authToken')?.value;
    const url = request.nextUrl.clone();

    // Login sayfasına giriş yapılmışsa
    if (url.pathname === '/giris-yap' && token) {
        url.pathname = '/hesabim';
        return NextResponse.redirect(url);
    }

    // Kayıt sayfasına giriş yapılmışsa
    if (url.pathname === '/kayit-ol' && token) {
        url.pathname = '/hesabim';
        return NextResponse.redirect(url);
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/giris-yap', '/kayit-ol', '/hesabim/:path*']
};