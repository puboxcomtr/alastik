import { Metadata } from 'next';
import RegisterView from '@/src/views/account/RegisterView';

import { getOtherSeo } from '@/src/services/seoService';

export async function generateMetadata(): Promise<Metadata> {
    return await getOtherSeo('register', true);
}
export default function RegisterPage() {
    return <RegisterView />;
}