// robots.txt — site bazlı Sitemap satırı için dinamik üretilir
// (eski public/robots.txt içeriği korunarak taşındı)
import { getSiteBase } from '@/src/lib/sitemap';

export const dynamic = 'force-dynamic';

const RULES = `User-agent: *
Allow: /

Disallow: /arama
Disallow: /garage
Disallow: /giris-yap
Disallow: /kayit-ol
Disallow: /hesabim
Disallow: /sepet
Disallow: /odeme
Disallow: /siparis-basarili
Disallow: /teslimat
`;

export async function GET() {
    const base = getSiteBase();
    return new Response(`${RULES}\nSitemap: ${base}/sitemap.xml\n`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
    });
}
