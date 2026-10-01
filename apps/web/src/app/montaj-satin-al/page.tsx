// Montaj Satın Al — /montaj-satin-al (yalnızca alastik.com)
// Lastiğini başka yerden almış müşteri için montaj / balans / rot / depolama satın alma (3 adım).
import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { API_ENDPOINTS, fetchAPI } from '@/src/config/api';
import { siteTitle } from '@/src/lib/siteMeta';
import { canonicalMeta } from '@/src/lib/canonical';
import MontageBuy from '@/src/components/alastik/montage/MontageBuy';

export const revalidate = 300;

const isAlastik = () => (headers().get('x-site') || 'alastik') === 'alastik';

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
    if (!isAlastik()) return {};
    return {
        title: siteTitle('Montaj Satın Al — Lastik Montajı, Balans ve Rot'),
        description: 'Lastiğini başka yerden aldıysan da montaj, balans, rot ve lastik depolama hizmetini online satın al: jant çapını seç, 81 ildeki anlaşmalı montaj noktalarından birini seç, hizmetlerini sepetine ekle.',
        // Adım parametreli adresler (?jant=, ?nokta=) noindex; sayfanın kendisi dizinde
        ...(await canonicalMeta('/montaj-satin-al', await searchParams))
    };
}

export default async function MontageBuyPage() {
    if (!isAlastik()) notFound();
    const result = await fetchAPI(API_ENDPOINTS.montage.list());
    const points = result?.success ? (result.data || []) : [];
    return (
        <Suspense fallback={null}>
            <MontageBuy points={points} />
        </Suspense>
    );
}
