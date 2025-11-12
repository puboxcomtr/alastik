// apps/web/src/hooks/Auth/useAuth.ts
import { useState, useEffect } from 'react';
import type { User } from '@/src/types/user';

const deleteCookie = (name: string) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/`;
};

const setCookie = (name: string, value: string, days: number) => {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/`;
};

export const useAuth = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = () => {
        if (typeof window === 'undefined') {
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const userStr = localStorage.getItem('user');

            if (token && userStr) {
                const userData = JSON.parse(userStr);
                setUser(userData);
                setIsLoggedIn(true);
            }
        } catch (error) {
            console.error('Auth check error:', error);
            clearAuth();
        } finally {
            setLoading(false);
        }
    };

    const clearAuth = () => {
        if (typeof window === 'undefined') return;

        // LocalStorage temizle
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        // Cookie'yi sil
        deleteCookie('authToken');

        setUser(null);
        setIsLoggedIn(false);
    };

    const setAuth = (token: string, userData: User) => {
        if (typeof window === 'undefined') return;

        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(userData));

        // Cookie'ye kaydet (30 gün)
        setCookie('authToken', token, 30);

        setUser(userData);
        setIsLoggedIn(true);
    };

    const getToken = (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('authToken');
    };

    return {
        isLoggedIn,
        user,
        loading,
        checkAuth,
        clearAuth,
        setAuth,
        getToken
    };
};

export const isLogged = (): boolean => {
    if (typeof window === 'undefined') return false;

    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');

    return !!(token && user);
};

export const getUser = (): User | null => {
    if (typeof window === 'undefined') return null;

    try {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    } catch {
        return null;
    }
};

export const getToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('authToken');
};