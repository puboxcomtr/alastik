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

    /* Helper - Token Al */
    private getToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('authToken');
    }

    /* Helper - Auth Headers */
    private getAuthHeaders(): HeadersInit {
        const token = this.getToken();
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    }

    /* Wheel Size API */
    wheelSize = {
        getMakes: () => this.get<any>('/wheelsize/makes'),
        getModels: (make: string) => this.get<any>(`/wheelsize/makes/${make}/models`),
        getYears: (make: string, model: string) => this.get<any>(`/wheelsize/makes/${make}/models/${model}/years`),
        getGenerations: (make: string, model: string, year: number) => this.get<any>(`/wheelsize/makes/${make}/models/${model}/years/${year}/generations`),
        getModifications: (make: string, model: string, year: number, generation?: string) => {
            const url = generation
                ? `/wheelsize/makes/${make}/models/${model}/years/${year}/modifications?generation=${generation}`
                : `/wheelsize/makes/${make}/models/${model}/years/${year}/modifications`;
            return this.get<any>(url);
        }
    };

    /* Vehicle API */
    vehicle = {
        getAll: async () => {
            const res = await fetch(`${this.baseUrl}/user/vehicles`, {
                headers: this.getAuthHeaders()
            });
            return await res.json();
        },

        getById: async (id: string) => {
            const res = await fetch(`${this.baseUrl}/user/vehicles/${id}`, {
                headers: this.getAuthHeaders()
            });
            return await res.json();
        },

        create: async (data: any) => {
            const res = await fetch(`${this.baseUrl}/user/vehicles`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return await res.json();
        },

        update: async (id: string, data: any) => {
            const res = await fetch(`${this.baseUrl}/user/vehicles/${id}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(data)
            });
            return await res.json();
        },

        delete: async (id: string) => {
            const res = await fetch(`${this.baseUrl}/user/vehicles/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            return await res.json();
        },

        setPrimary: async (id: string) => {
            const res = await fetch(`${this.baseUrl}/user/vehicles/${id}/set-primary`, {
                method: 'PATCH',
                headers: this.getAuthHeaders()
            });
            return await res.json();
        }
    };

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