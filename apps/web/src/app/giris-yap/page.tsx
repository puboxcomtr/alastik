import { Metadata } from 'next';
import LoginView from '@/src/views/account/LoginView';

import { getOtherSeo } from '@/src/services/seoService';

export async function generateMetadata(): Promise<Metadata> {
    return await getOtherSeo('login', true);
}
export default function LoginPage() {
    return <LoginView />;
}