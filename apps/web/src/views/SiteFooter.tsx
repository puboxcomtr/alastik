import { headers } from 'next/headers';
import AlastikFooter from '@src/views/alastik/Footer';
import LastikJantAvmFooter from '@src/views/lastikjantavm/Footer';
import SeoLinks from '@src/components/lastikjantavm/seo/SeoLinks';
export default function SiteFooter() {
  const site = headers().get('x-site') || 'alastik';

  if (site === 'b2b') {
    return null;
  }

  if (site === 'lastikjantavm') {
    return (
      <>
        <SeoLinks />
        <LastikJantAvmFooter />
      </>
    );
  }

  return <AlastikFooter />;
}
