import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Ödeme Başarısız - ALastik.com',
    robots: {
        index: false,
        follow: false
    }
};

export default function PaymentFailedLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}