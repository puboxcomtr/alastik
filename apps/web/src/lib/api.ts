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

    getImageUrl(path?: string): string {
        if (!path) return '';
        if (path.startsWith('http')) return path;
        if (path.startsWith('/')) return `${BASE_URL}${path}`;
        return `${BASE_URL}/${path}`;
    }
}

export const api = new ApiClient(API_URL);
export type { ApiResponse };