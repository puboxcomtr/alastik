'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ROUTES } from '@/src/config/routes';
import { MONTAGE_OFFER_EVENT } from '@/src/hooks/Cart/montageRedirect';

export default function MontageOfferModal() {
    const router = useRouter();

    useEffect(() => {
        const go = () => router.push(ROUTES.MONTAGE_SELECT);
        window.addEventListener(MONTAGE_OFFER_EVENT, go);
        return () => window.removeEventListener(MONTAGE_OFFER_EVENT, go);
    }, [router]);

    return null;
}
