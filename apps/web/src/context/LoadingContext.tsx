'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LoadingContextType {
    registerLoader: (key: string) => void;
    unregisterLoader: (key: string) => void;
    isLoading: boolean;
    activeLoaders: string[];
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
    const [activeLoaders, setActiveLoaders] = useState<string[]>([]);

    const registerLoader = useCallback((key: string) => {
        setActiveLoaders((prev) => {
            if (prev.includes(key)) return prev;
            return [...prev, key];
        });
    }, []);

    const unregisterLoader = useCallback((key: string) => {
        setActiveLoaders((prev) => prev.filter((k) => k !== key));
    }, []);

    return (
        <LoadingContext.Provider
            value={{
                registerLoader,
                unregisterLoader,
                isLoading: activeLoaders.length > 0,
                activeLoaders
            }}
        >
            {children}
        </LoadingContext.Provider>
    );
}

export function useLoading() {
    const ctx = useContext(LoadingContext);
    if (!ctx) {
        throw new Error('useLoading hook LoadingProvider içinde kullanılmalı');
    }
    return ctx;
}