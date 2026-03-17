'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '@/src/config/api';
import { useAuth } from '@/src/hooks/Theme/useAuth';

interface FavouritesContextType {
    favourites: Record<string, boolean>;
    totalCount: number;
    loading: boolean;
    toggleFavourite: (productKey: string) => Promise<void>;
    checkFavourites: (keys: string[]) => Promise<void>;
    isFavourite: (productKey: string) => boolean;
}

const FavouritesContext = createContext<FavouritesContextType | undefined>(undefined);

export function FavouritesProvider({ children }: { children: React.ReactNode }) {
    const [favourites, setFavourites] = useState<Record<string, boolean>>({});
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const { isLoggedIn, getToken } = useAuth();

    const getAuthHeaders = useCallback(() => {
        const token = getToken();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }, [getToken]);

    const toggleFavourite = useCallback(async (productKey: string) => {
        if (!isLoggedIn) {
            toast.warning('Üye Girişi Yapmanız Gerekir.');
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(API_ENDPOINTS.favourites.toggle(), {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ productKey })
            });

            const result = await response.json();

            if (result.success) {
                setFavourites(prev => {
                    const updated = { ...prev };
                    if (result.data.isFavourite) {
                        updated[productKey] = true;
                    } else {
                        delete updated[productKey];
                    }
                    return updated;
                });
                setTotalCount(result.data.totalCount);
                toast.success(result.message);
            } else {
                toast.error(result.message || 'Bir hata oluştu.');
            }
        } catch (error) {
            console.error('Favori toggle hatası:', error);
            toast.error('Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    }, [isLoggedIn, getAuthHeaders]);

    const checkFavourites = useCallback(async (keys: string[]) => {
        if (!isLoggedIn || !keys.length) return;

        try {
            const response = await fetch(API_ENDPOINTS.favourites.check(keys.join(',')), {
                headers: getAuthHeaders()
            });

            const result = await response.json();

            if (result.success) {
                setFavourites(prev => ({ ...prev, ...result.data }));
            }
        } catch (error) {
            console.error('Favori kontrol hatası:', error);
        }
    }, [isLoggedIn, getAuthHeaders]);

    const isFavourite = useCallback((productKey: string) => {
        return !!favourites[productKey];
    }, [favourites]);

    return (
        <FavouritesContext.Provider value={{
            favourites,
            totalCount,
            loading,
            toggleFavourite,
            checkFavourites,
            isFavourite
        }}>
            {children}
        </FavouritesContext.Provider>
    );
}

export function useFavourites() {
    const context = useContext(FavouritesContext);
    if (!context) {
        throw new Error('useFavourites must be used within FavouritesProvider');
    }
    return context;
}