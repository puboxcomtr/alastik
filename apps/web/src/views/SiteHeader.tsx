// Site Header secici (server component)
// x-site header'ina gore dogru temanin header'ini render eder.
import { headers } from 'next/headers';
import AlastikHeader from '@src/views/alastik/Header';
import LastikJantAvmHeader from '@src/views/lastikjantavm/Header';
export default function SiteHeader() {
  const site = headers().get('x-site') || 'alastik';

  // B2B'de header yok (8 Eyl kararı) — login ekranı tam ekran çalışır
  if (site === 'b2b') {
    return null;
  }

  if (site === 'lastikjantavm') {
    return <LastikJantAvmHeader />;
  }

  return <AlastikHeader />;
}
