import React from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { API_ENDPOINTS, fetchAPI } from '@/src/config/api';
import { siteTitle } from '@/src/lib/siteMeta';
import MontageMap from '@/src/components/lastikjantavm/montage/MontageMap';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: siteTitle('Montaj Noktaları'),
        description: 'Size en yakın montaj noktasını bulun; online siparişinizi profesyonel ekiplerimizle taktırın.',
    };
}

export default async function MontagePointsPage() {
    // Sayfa şimdilik yalnız LastikJantAVM'de yayında
    if ((headers().get('x-site') || 'alastik') !== 'lastikjantavm') notFound();

    const result = await fetchAPI(API_ENDPOINTS.montage.list());
    if (!result?.success) notFound();

    return <MontageMap points={result.data || []} />;
}
