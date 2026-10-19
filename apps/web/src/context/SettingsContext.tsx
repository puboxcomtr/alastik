'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { ThemeSettings } from '@/src/types/theme';
import { getImageUrl } from '@/src/services/themeService';

interface SettingsContextType {
    theme: ThemeSettings;
    getImageUrl: (path?: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
    children: ReactNode;
    initialTheme: ThemeSettings;
}

export function SettingsProvider({ children, initialTheme }: SettingsProviderProps) {
    return (
        <SettingsContext.Provider value={{ theme: initialTheme, getImageUrl }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
}