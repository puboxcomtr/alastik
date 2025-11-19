// apps/web/src/types/settings.ts

export interface Setting {
    _id: string;
    key: string;
    value: string | number | boolean;
    type: 'string' | 'number' | 'boolean';
    group: string;
    description?: string;
}

export interface ShowcaseSettings {
    productsPerPage: number;
    showcaseProductSize: string;
}