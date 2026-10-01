// Site Footer secici (server component)
// x-site header'ina gore dogru temanin footer'ini render eder.
import { headers } from 'next/headers';
import AlastikFooter from '@src/views/alastik/Footer';
import LastikJantAvmFooter from '@src/views/lastikjantavm/Footer';
import SeoLinks from '@src/components/lastikjantavm/seo/SeoLinks';
export default function SiteFooter() {
  const site = headers().get('x-site') || 'alastik';

  // B2B'de footer yok (8 Eyl kararı) — login ekranı tam ekran çalışır
  if (site === 'b2b') {
    return null;
  }

  if (site === 'lastikjantavm') {
    // Footer üstü: kapalı (<details>) şube/hizmet ve araç bağlantıları — görünümü kalabalıklaştırmaz
    return (
      <>
        <SeoLinks />
        <LastikJantAvmFooter />
      </>
    );
  }

  return <AlastikFooter />;
}
