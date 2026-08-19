import type { Metadata } from 'next';
import { siteTitle } from '@/src/lib/siteMeta';

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: siteTitle('Ödeme Başarısız', '-'),
        robots: {
            index: false,
            follow: false
        }
    };
}

export default function PaymentFailedLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
