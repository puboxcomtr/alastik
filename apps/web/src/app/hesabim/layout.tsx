import { Metadata } from 'next';
import { siteTitle } from '@/src/lib/siteMeta';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: siteTitle('Hesabım'),
    robots: { index: false, follow: false }
  };
}

export default function HesabimLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
