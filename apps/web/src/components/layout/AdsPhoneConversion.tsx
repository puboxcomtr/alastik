'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { getAdsPhoneConversions } from '@/src/config/tracking';
import { getClientSite } from '@/src/lib/tracking';

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
