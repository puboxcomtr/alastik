import { headers } from 'next/headers';

import { API_ENDPOINTS, getServerSiteHeaders } from '@/src/config/api';
import { Category, ParentCategory } from '@src/types/category';
import { throwIfUnavailable, rethrowUnavailable, PAGE_FETCH_TIMEOUT } from '@/src/lib/apiError';

export async function getCategory(slug: string): Promise<Category | null> {
    if (slug === 'tum-lastikler') {
        return {
            slug: 'tum-lastikler',
            name: 'Tüm Lastikler',
            seoTitle: 'Tüm Lastikler',
            description: 'Tüm lastik kategorilerinde aramanızı yapabilirsiniz.',
            seoKeywords: ['lastik', 'tüm lastikler', 'lastik arama'],
            parent: null,
            activeProductCount: 0,
            sliderId: null
        } as unknown as Category;
    }

    try {
        const site = headers().get('x-site') || 'alastik';
        const response = await fetch(API_ENDPOINTS.categories.bySlug(slug), {
            cache: 'no-store',
            headers: { 'X-Site': site },
            signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT)
        });

        throwIfUnavailable(response, 'getCategory');
        if (!response.ok) return null;

        const data = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('[categoryService] getCategory error:', error);
        rethrowUnavailable(error, 'getCategory');
    }
}

export async function getCategoryWithSize(slug: string, ebatSlug: string): Promise<Category | null> {
    if (slug === 'tum-lastikler') {
        return await getCategory(slug);
    }

    try {
        const response = await fetch(API_ENDPOINTS.categories.bySlugWithSize(slug, ebatSlug), {
            cache: 'no-store',
            signal: AbortSignal.timeout(PAGE_FETCH_TIMEOUT)
        });

        throwIfUnavailable(response, 'getCategoryWithSize');
        if (!response.ok) return null;

        const data = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('[categoryService] getCategoryWithSize error:', error);
        rethrowUnavailable(error, 'getCategoryWithSize');
    }
}

export async function getParentCategory(parentId: string): Promise<ParentCategory | null> {
    try {
        const response = await fetch(API_ENDPOINTS.categories.detail(parentId), {
            cache: 'no-store'
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('[categoryService] getParentCategory error:', error);
        return null;
    }
}

export async function getCategorySlugByName(name: string | null | undefined): Promise<string | undefined> {
    if (!name) return undefined;

    try {
        const response = await fetch(
            `${API_ENDPOINTS.categories.searchByName()}?name=${encodeURIComponent(name)}`,
            { cache: 'no-store' }
        );

        if (!response.ok) return undefined;

        const data = await response.json();
        return data.success && data.data ? data.data.slug : undefined;
    } catch (error) {
        console.error('[categoryService] getCategorySlugByName error:', error);
        return undefined;
    }
}
export async function getCategoryMenus(menuIds?: string[] | null) {
    if (!menuIds || menuIds.length === 0) return [];

    const results = await Promise.all(menuIds.map(id => getCategoryMenu(id)));
    return results.filter(Boolean);
}

export async function getCategoryMenu(menuId?: string | null) {
    if (!menuId) return null;

    try {
        const res = await fetch(API_ENDPOINTS.menus.group(menuId), {
            cache: 'no-store',
            headers: await getServerSiteHeaders()
        });

        if (!res.ok) return null;

        const result = await res.json();
        return result.success ? result.data : null;
    } catch (error) {
        console.error('[categoryService] getCategoryMenu error:', error);
        return null;
    }
}
