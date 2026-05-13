import { Metadata } from 'next';
import { Suspense } from 'react';
import ResetPasswordView from '@/src/views/account/ResetPasswordView';

export const metadata: Metadata = {
    title: 'Şifre Sıfırla | ALastik.com',
    description: 'Şifrenizi güvenli şekilde sıfırlayın.',
    robots: {
        index: false,
        follow: false
    }
};

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="container py-5 text-center">Yükleniyor...</div>}>
            <ResetPasswordView />
        </Suspense>
    );
}