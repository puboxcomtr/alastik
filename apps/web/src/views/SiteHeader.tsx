// Site Header secici (server component)
// x-site header'ina gore dogru temanin header'ini render eder.
import { headers } from 'next/headers';
import AlastikHeader from '@src/views/alastik/Header';
import LastikJantAvmHeader from '@src/views/lastikjantavm/Header';

export default function SiteHeader() {
  const site = headers().get('x-site') || 'alastik';

  if (site === 'lastikjantavm') {
    return <LastikJantAvmHeader />;
  }

  return <AlastikHeader />;
}
