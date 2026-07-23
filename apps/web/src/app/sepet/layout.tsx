import type { Metadata } from 'next';
import { getOtherSeo } from '@/src/services/seoService';
export async function generateMetadata(): Promise<Metadata> {
    return await getOtherSeo('cart', true);
}
export default function CartLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}