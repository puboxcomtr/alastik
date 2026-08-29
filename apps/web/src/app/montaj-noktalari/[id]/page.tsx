import React from 'react';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { API_ENDPOINTS, fetchAPI } from '@/src/config/api';
import { siteTitle } from '@/src/lib/siteMeta';
import MontageDetail from '@/src/components/lastikjantavm/montage/MontageDetail';
import MontageStickyBar from '@/src/components/lastikjantavm/montage/MontageStickyBar';

export const revalidate = 300;

async function getPoint(id: string) {
    const result = await fetchAPI(API_ENDPOINTS.montage.detail(id));
    return result?.success ? result.data : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const point = await getPoint(id);
    if (!point) return { title: siteTitle('Montaj Noktası') };
    const bolge = `${point.city}${point.district ? ` / ${point.district}` : ''}`;
    // Bilgileri açık noktalarda başlıkta bayi adı kullanılır
    const label = point.isPublicInfo && point.name ? `${point.name} - ${bolge}` : `Anlaşmalı Montaj Noktası - ${bolge}`;
    return {
        title: siteTitle(label),
        description: `${bolge} bölgesindeki ${point.isPublicInfo && point.name ? point.name : 'anlaşmalı'} montaj noktası: hizmetler, fiyatlar, çalışma saatleri ve yorumlar.`,
    };
}

export default async function MontagePointDetailPage({ params }: { params: Promise<{ id: string }> }) {
    if ((headers().get('x-site') || 'alastik') !== 'lastikjantavm') notFound();

    const { id } = await params;
    const point = await getPoint(id);
    if (!point) notFound();

    return (
        <>
            <MontageDetail point={point} />
            <MontageStickyBar />
        </>
    );
}
