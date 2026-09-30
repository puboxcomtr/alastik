import React from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { API_ENDPOINTS, fetchAPI } from '@/src/config/api';
import BlogDetail from '@/src/components/blog/BlogDetail';
import { canonicalMeta } from '@/src/lib/canonical';

async function getBlogBySlug(slug: string) {
    const result = await fetchAPI(API_ENDPOINTS.blogs.detail(slug));
    return result.success ? result.data : null;
}

export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
    const { slug } = await params;
    const blog = await getBlogBySlug(slug);

    if (!blog) {
        return { title: 'Blog Bulunamadı' };
    }

    return {
        title: blog.seo?.metaTitle || blog.title,
        description: blog.seo?.metaDescription || blog.excerpt || '',
        keywords: blog.seo?.metaKeywords?.join(', ') || '',
        ...(await canonicalMeta(`/blog/${slug}`)),
    };
}

export default async function BlogDetailPage(
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const blog = await getBlogBySlug(slug);

    if (!blog) {
        notFound();
    }

    return <BlogDetail blog={blog} />;
}