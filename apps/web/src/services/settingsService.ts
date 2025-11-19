// apps/web/src/services/settingsService.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';

export interface ShowcaseSettings {
    productsPerPage: number;
    showcaseProductSize: string;
}

export async function getShowcaseSettings(): Promise<ShowcaseSettings> {
    const response = await fetch(`${API_BASE_URL}/settings/group/showcase`, {
        cache: 'no-store'
    });

    const data = await response.json();

    return {
        productsPerPage: data.data.productsPerPage,
        showcaseProductSize: data.data.showcaseProductSize
    };
}