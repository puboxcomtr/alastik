import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sepet - ALastik.com',
    robots: {
        index: false,
        follow: false
    }
};

export default function CartLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}