// apps/web/src/services/categoryService.ts
import { API_ENDPOINTS } from '@/src/config/api';
import { Category, ParentCategory } from '@src/types/category';

/**
 * Slug ile kategori getir
 */
export async function getCategory(slug: string): Promise<Category | null> {
    const actualSlug = slug === 'tum-lastikler' ? 'lastik' : slug;

    try {
        const response = await fetch(API_ENDPOINTS.categories.bySlug(actualSlug), {
            cache: 'no-store'
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('[categoryService] getCategory error:', error);
        return null;
    }
}

/**
 * Slug + Ebat ile kategori getir
 */
export async function getCategoryWithSize(slug: string, ebatSlug: string): Promise<Category | null> {
    const actualSlug = slug === 'tum-lastikler' ? 'lastik' : slug;

    try {
        const response = await fetch(API_ENDPOINTS.categories.bySlugWithSize(actualSlug, ebatSlug), {
            cache: 'no-store'
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('[categoryService] getCategoryWithSize error:', error);
        return null;
    }
}

/**
 * ID ile parent kategori getir
 */
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

/**
 * Isme gore kategori slug'i getir (Breadcrumb icin)
 */
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