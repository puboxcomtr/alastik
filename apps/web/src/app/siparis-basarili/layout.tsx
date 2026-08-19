import type { Metadata } from 'next';
import { siteTitle } from '@/src/lib/siteMeta';

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: siteTitle('Sipariş Başarılı', '-'),
        robots: {
            index: false,
            follow: false
        }
    };
}

export default function OrderSuccessLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
