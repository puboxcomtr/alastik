'use client';
import * as React from 'react';
import { ThemeProvider, CssBaseline, createTheme } from '@mui/material';
import baseTheme from '@src/theme';
import { getSiteBySlug, DEFAULT_SITE, type SiteSlug } from '@src/config/siteConfig';

// Cookie'den site slug'ını okur (middleware tarafından set edilir).
function readSiteFromCookie(): SiteSlug {
    if (typeof document === 'undefined') return DEFAULT_SITE;
    const match = document.cookie.match(/(?:^|;\s*)site=([^;]+)/);
    const value = match ? decodeURIComponent(match[1]) : '';
    return (getSiteBySlug(value) ? (value as SiteSlug) : DEFAULT_SITE);
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
    // Aktif siteyi cookie'den çöz ve temayı o sitenin renkleriyle türet.
    const siteTheme = React.useMemo(() => {
        const site = getSiteBySlug(readSiteFromCookie());
        if (!site) return baseTheme;

        // baseTheme korunur; yalnızca primary/secondary site rengiyle ezilir.
        return createTheme(baseTheme, {
            palette: {
                primary: { main: site.theme.primary },
                secondary: { main: site.theme.secondary },
            },
        });
    }, []);

    return (
        <ThemeProvider theme={siteTheme}>
            <CssBaseline />
            {children}
        </ThemeProvider>
    );
}
