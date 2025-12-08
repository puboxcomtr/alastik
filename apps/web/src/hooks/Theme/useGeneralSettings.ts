const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';

export interface SiteSetting {
    _id: string;
    group: string;
    key: string;
    value: string;
    type: string;
    description?: string;
}

/**
 * Tek bir ayar getir
 */
export async function getSetting(key: string): Promise<string | null> {
    try {
        const response = await fetch(`${API_URL}/general-settings/key/${key}`, {
            cache: 'no-store'
        });

        if (!response.ok) return null;

        const data = await response.json();
        return data.success && data.data ? data.data.value : null;
    } catch (error) {
        console.error(`Setting fetch error (${key}):`, error);
        return null;
    }
}

/**
 * Site durumunu kontrol et
 * @returns true = site aktif, false = yapım aşamasında
 */
export async function isSiteActive(): Promise<boolean> {
    try {
        const response = await fetch(`${API_URL}/general-settings/site-status`, {
            cache: 'no-store'
        });

        if (!response.ok) return true;

        const data = await response.json();
        return data.isActive === true;
    } catch (error) {
        console.error('Site status check error:', error);
        return true;
    }
}

/**
 * Grup bazlı ayarları getir
 */
export async function getSettingsByGroup(group: string): Promise<SiteSetting[]> {
    try {
        const response = await fetch(`${API_URL}/general-settings/group/${group}`, {
            cache: 'no-store'
        });

        if (!response.ok) return [];

        const data = await response.json();
        return data.success && data.data ? data.data : [];
    } catch (error) {
        console.error(`Settings group fetch error (${group}):`, error);
        return [];
    }
}