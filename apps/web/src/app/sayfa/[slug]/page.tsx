import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { API_ENDPOINTS, fetchAPI } from '@/src/config/api';
import PageDetail from '@/src/components/page/PageDetail';

async function getPageBySlug(slug: string) {
    const result = await fetchAPI(API_ENDPOINTS.pages.detail(slug));
    return result.success ? result.data : null;
}

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
    const { slug } = await params;
    const page = await getPageBySlug(slug);

    if (!page) {
        return { title: 'Sayfa Bulunamadı' };
    }

    return {
        title: page.seo?.metaTitle || page.title,
        description: page.seo?.metaDescription || page.excerpt || '',
        keywords: page.seo?.metaKeywords?.join(', ') || '',
    };
}

export default async function StaticPage(
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const page = await getPageBySlug(slug);

    if (!page) {
        notFound();
    }

    return <PageDetail page={page} />;
}