// apps/web/src/services/categoryService.ts

import { Category, ParentCategory } from '@src/types/category';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';

/**
 * Slug ile kategori getir
 */
export async function getCategory(slug: string): Promise<Category | null> {
    const actualSlug = slug === 'tum-lastikler' ? 'lastik' : slug;

    try {
        const response = await fetch(`${API_URL}/categories/slug/${actualSlug}`, {
            cache: 'no-store'
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('Kategori fetch hatası:', error);
        return null;
    }
}
/**
 * Slug + Ebat ile kategori getir
 */
export async function getCategoryWithSize(slug: string, ebatSlug: string): Promise<Category | null> {
    const actualSlug = slug === 'tum-lastikler' ? 'lastik' : slug;

    try {
        const response = await fetch(`${API_URL}/categories/slug/${actualSlug}/size/${ebatSlug}`, {
            cache: 'no-store'
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('Kategori + Ebat fetch hatası:', error);
        return null;
    }
}

/**
 * ID ile parent kategori getir
 */
export async function getParentCategory(parentId: string): Promise<ParentCategory | null> {
    try {
        const response = await fetch(`${API_URL}/categories/${parentId}`, {
            cache: 'no-store'
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.success ? data.data : null;
    } catch (error) {
        console.error('Parent kategori fetch hatası:', error);
        return null;
    }
}