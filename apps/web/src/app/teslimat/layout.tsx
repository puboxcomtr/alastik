import type { Metadata } from 'next';
import { siteTitle } from '@/src/lib/siteMeta';

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: siteTitle('Teslimat Bilgileri', '-'),
        robots: {
            index: false,
            follow: false
        }
    };
}

export default function CheckoutLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
