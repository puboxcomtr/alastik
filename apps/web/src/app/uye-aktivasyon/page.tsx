import { Metadata } from 'next';
import { Suspense } from 'react';
import ActivationView from '@/src/views/account/ActivationView';

export const metadata: Metadata = {
    title: 'Hesap Aktivasyonu | ALastik.com',
    description: 'Hesabınızı aktif ediniz.',
    robots: {
        index: false,
        follow: false
    }
};

export default function ActivationPage() {
    return (
        <Suspense fallback={<div className="container py-5 text-center">Yükleniyor...</div>}>
            <ActivationView />
        </Suspense>
    );
}