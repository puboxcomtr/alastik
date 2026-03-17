"use client";
import { createContext, useContext, useState } from "react";

type ViewMode = 'grid' | 'list';

interface ViewModeContextType {
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType>({
    viewMode: 'grid',
    setViewMode: () => { }
});

export function ViewModeProvider({ children }: { children: React.ReactNode }) {
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    return (
        <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
            {children}
        </ViewModeContext.Provider>
    );
}

export function useViewMode() {
    return useContext(ViewModeContext);
}