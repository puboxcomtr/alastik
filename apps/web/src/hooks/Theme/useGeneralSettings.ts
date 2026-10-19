import { API_ENDPOINTS } from '@/src/config/api';

export interface SiteSetting {
    _id: string;
    group: string;
    key: string;
    value: string;
    type: string;
    description?: string;
}

export async function getSetting(key: string): Promise<string | null> {
    try {
        const response = await fetch(API_ENDPOINTS.generalSettings.byKey(key), {
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

export async function isSiteActive(): Promise<boolean> {
    try {
        const response = await fetch(API_ENDPOINTS.generalSettings.siteStatus(), {
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

export async function getSettingsByGroup(group: string): Promise<SiteSetting[]> {
    try {
        const response = await fetch(API_ENDPOINTS.generalSettings.byGroup(group), {
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