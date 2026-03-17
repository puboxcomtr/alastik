import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Garajım | ALastik.com',
  robots: { index: false, follow: false }
};

export default function GarageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
