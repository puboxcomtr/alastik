import { headers } from 'next/headers';
import AlastikHeader from '@src/views/alastik/Header';
import LastikJantAvmHeader from '@src/views/lastikjantavm/Header';
export default function SiteHeader() {
  const site = headers().get('x-site') || 'alastik';

  if (site === 'b2b') {
    return null;
  }

  if (site === 'lastikjantavm') {
    return <LastikJantAvmHeader />;
  }

  return <AlastikHeader />;
}
