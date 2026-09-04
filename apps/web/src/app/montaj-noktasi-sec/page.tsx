import React from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { API_ENDPOINTS, fetchAPI } from '@/src/config/api';
import { siteTitle } from '@/src/lib/siteMeta';
import AddedToCart from '@/src/components/alastik/montage/AddedToCart';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: siteTitle('Montaj Noktaları'),
        description: 'Anlaşmalı montaj noktalarımızı inceleyin; montaj ve diğer hizmetleri sepetinize ekleyin.',
        robots: { index: false, follow: false },
    };
}

// Montaj noktası listesi ve seçimi — yalnız alastik'te yayında.
// Sepette ürün varken seçim akışı, sepet boşken gezilebilir liste olarak çalışır.
export default async function MontageSelectPage() {
    if ((headers().get('x-site') || 'alastik') !== 'alastik') notFound();

    const result = await fetchAPI(API_ENDPOINTS.montage.list());
    const points = result?.success ? (result.data || []) : [];

    return <AddedToCart points={points} />;
}
