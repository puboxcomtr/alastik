import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { API_ENDPOINTS, fetchAPI } from '@/src/config/api';
import BlogCategoryGrid from '@/src/components/blog/BlogCategoryGrid';

async function getCategory(slug: string) {
    const result = await fetchAPI(API_ENDPOINTS.blogs.byCategory(slug));
    return result.success ? result.data : null;
}

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
    const { slug } = await params;
    const data = await getCategory(slug);
    if (!data) {
        return { title: 'Kategori Bulunamadı' };
    }
    const seo = data.category?.seo || {};
    return {
        title: seo.title || data.category?.name || 'Blog Kategorisi',
        description: seo.description || data.category?.description || '',
    };
}

export default async function BlogCategoryPage(
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const data = await getCategory(slug);

    if (!data || !data.category) {
        notFound();
    }

    return <BlogCategoryGrid category={data.category} blogs={data.blogs || []} />;
}
