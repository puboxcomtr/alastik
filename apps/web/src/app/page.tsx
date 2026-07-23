// Anasayfa - site secici (server component)
// x-site header'ina gore dogru temanin anasayfasini render eder.
// ALastik ve LastikJantAVM tamamen ayri component agaclari kullanir.
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { getSeo } from '@src/services/seoService';
import AlastikHomePage from '@src/views/alastik/HomePage';
import LastikJantAvmHomePage from '@src/views/lastikjantavm/HomePage';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeo();
  const homepage = seo?.homepage;
  if (!homepage?.title) {
    return {};
  }
  return {
    title: homepage.title,
    description: homepage.description || undefined,
    keywords: homepage.keywords || undefined,
  };
}

export default function Home() {
  const site = headers().get('x-site') || 'alastik';
  if (site === 'lastikjantavm') {
    return <LastikJantAvmHomePage />;
  }
  return <AlastikHomePage />;
}