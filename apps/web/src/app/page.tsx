// Anasayfa - site secici (server component)
// x-site header'ina gore dogru temanin anasayfasini render eder.
// ALastik ve LastikJantAVM tamamen ayri component agaclari kullanir.
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { getSeo } from '@src/services/seoService';
import AlastikHomePage from '@src/views/alastik/HomePage';
import LastikJantAvmHomePage from '@src/views/lastikjantavm/HomePage';
import { canonicalMeta, getSiteOrigin } from '@/src/lib/canonical';
import { JsonLd, siteJsonLd } from '@/src/lib/structuredData';

export async function generateMetadata(): Promise<Metadata> {
  // B2B (demo alan adı) arama motorlarına kapalıdır
  if (headers().get('x-site') === 'b2b') {
    return { robots: { index: false, follow: false } };
  }
  const seo = await getSeo();
  const homepage = seo?.homepage;
  const seoMeta = await canonicalMeta('/');
  if (!homepage?.title) {
    return seoMeta;
  }
  return {
    title: homepage.title,
    description: homepage.description || undefined,
    keywords: homepage.keywords || undefined,
    ...seoMeta,
  };
}

export default async function Home() {
  const site = headers().get('x-site') || 'alastik';
  const siteLd = siteJsonLd(site, await getSiteOrigin());
  return (
    <>
      {siteLd.length > 0 && <JsonLd data={siteLd} />}
      {site === 'lastikjantavm' ? <LastikJantAvmHomePage /> : <AlastikHomePage />}
    </>
  );
}