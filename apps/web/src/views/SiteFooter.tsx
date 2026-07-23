// Site Footer secici (server component)
// x-site header'ina gore dogru temanin footer'ini render eder.
import { headers } from 'next/headers';
import AlastikFooter from '@src/views/alastik/Footer';
import LastikJantAvmFooter from '@src/views/lastikjantavm/Footer';

export default function SiteFooter() {
  const site = headers().get('x-site') || 'alastik';

  if (site === 'lastikjantavm') {
    return <LastikJantAvmFooter />;
  }

  return <AlastikFooter />;
}
