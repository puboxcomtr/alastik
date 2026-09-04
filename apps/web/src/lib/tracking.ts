'use client';

// dataLayer olay yardımcıları — GTM'deki dönüşüm tetikleyicileri bu olayları dinler.
// Olaylar: purchase, sign_up, add_to_cart, begin_checkout

import { ADS_CONVERSION_LABELS, type AdsConversionEvent } from '@/src/config/tracking';

type DataLayerEvent = Record<string, unknown> & { event: string };

declare global {
    interface Window {
        dataLayer?: unknown[];
        gtag?: (...args: unknown[]) => void;
    }
}

export function getClientSite(): string {
    if (typeof document === 'undefined') return 'alastik';
    const match = document.cookie.match(/(?:^|;\s*)site=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : 'alastik';
}

export function pushDataLayer(data: DataLayerEvent): void {
    if (typeof window === 'undefined') return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
}

// Google Ads dönüşümü — aktif sitenin etiket haritasından (config/tracking.ts) send_to bulur.
// Sitede o olay için etiket tanımlı değilse sessizce atlanır.
export function fireAdsConversion(
    event: AdsConversionEvent,
    params: { value?: number; currency?: string; transaction_id?: string } = {}
): void {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    const site = getClientSite();
    const sendTo = ADS_CONVERSION_LABELS[site]?.[event];
    if (!sendTo) return;
    window.gtag('event', 'conversion', { send_to: sendTo, currency: 'TRY', ...params });
}
