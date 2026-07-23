import { Metadata } from 'next';
import { Suspense } from 'react';
import ResetPasswordView from '@/src/views/account/ResetPasswordView';

import { getOtherSeo } from '@/src/services/seoService';


export async function generateMetadata(): Promise<Metadata> {
    return await getOtherSeo('forgotPassword', true);
}
export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="container py-5 text-center">Yükleniyor...</div>}>
            <ResetPasswordView />
        </Suspense>
    );
}