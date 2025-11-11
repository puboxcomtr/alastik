const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3082/api';
const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3082';

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
        try {
            const res = await fetch(`${this.baseUrl}${endpoint}`, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            return await res.json();
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Bir hata oluştu'
            };
        }
    }

    async post<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
        try {
            const res = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            return await res.json();
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Bir hata oluştu'
            };
        }
    }

    async put<T = any>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
        try {
            const res = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            });
            return await res.json();
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Bir hata oluştu'
            };
        }
    }
    async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
        try {
            const res = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            return await res.json();
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Bir hata oluştu'
            };
        }
    }
    /* Sabit Fonksiyonlar */
    getImageUrl(path?: string): string {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        if (path.startsWith('/')) return `${BASE_URL}${path}`;
        return `${BASE_URL}/${path}`;
    }
    async getSiteName(): Promise<string> {
        try {
            const data = await this.get<any>('/admin/settings/general');
            return data.success && data.data?.companyInfo?.name ? data.data.companyInfo.name : 'A Lastik';
        } catch {
            return 'A Lastik';
        }
    }
    /* Search Box */
    async searchAutocomplete(query: string, limit = 10) {
        return this.post<any>('/search/autocomplete', { query, limit });
    }
    async trackSearch(term: string) {
        return this.post('/search/track', { term });
    }
    /* Auth Login and Register */
    async register(data: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        password: string;
        passwordConfirm: string;
        marketingConsent: boolean;
        termsAccepted: boolean;
    }) {
        return this.post<any>('/auth/register', data);
    }
    async login(email: string, password: string) {
        return this.post<any>('/auth/login', { email, password });
    }
    /* Translate */
    async getTranslations(category?: string) {
        const endpoint = category ? `/translations/category/${category}` : '/translations';
        return this.get<Record<string, string>>(endpoint);
    }
}

export const api = new ApiClient(API_URL);
export type { ApiResponse };