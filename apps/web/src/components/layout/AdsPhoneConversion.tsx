'use client';

// Google Ads telefon araması dönüşümü (config/tracking.ts → ADS_PHONE_CONVERSIONS).
// Telefon numarası sayfaya istemcide sonradan yazıldığı için (üst bölüm ayarları API'den gelir)
// etiket yalnız ilk yüklemede değil, her sayfa geçişinde ve numara ekrana geldikten sonra
// yeniden çalıştırılır; Google numarayı ancak o zaman kendi yönlendirme numarasıyla değiştirebilir.
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getAdsPhoneConversions } from '@/src/config/tracking';
import { getClientSite } from '@/src/lib/tracking';

// Numara ekrana gelene kadar denenecek gecikmeler (ms)
const RETRY_DELAYS_MS = [0, 1500, 4000];

export default function AdsPhoneConversion() {
    const pathname = usePathname();

    useEffect(() => {
        const conversions = getAdsPhoneConversions(getClientSite());
        if (!conversions.length) return;

        const timers = RETRY_DELAYS_MS.map(delay => window.setTimeout(() => {
            if (typeof window.gtag !== 'function') return;
            for (const conversion of conversions) {
                window.gtag('config', conversion.sendTo, { phone_conversion_number: conversion.phoneNumber });
            }
        }, delay));

        return () => timers.forEach(t => window.clearTimeout(t));
    }, [pathname]);

    return null;
}
