import React from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import DealerForm from '@/src/components/lastikjantavm/dealerForm/DealerForm';

const isLja = () => (headers().get('x-site') || 'alastik') === 'lastikjantavm';

export async function generateMetadata(): Promise<Metadata> {
    if (!isLja()) return {};
    return {
        title: 'Montaj Noktası Bilgi ve Fiyat Formu | LastikJantAVM',
        description: 'Montaj noktası bilgi ve fiyat formu.',
        robots: { index: false, follow: false }
    };
}

export default async function DealerFormPage() {
    if (!isLja()) notFound();
    return <DealerForm />;
}
