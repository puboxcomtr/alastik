'use client';

// LJA: lastik sepete eklendikten sonra montaj noktası seçimi ekranına geçiş (alastik ile aynı akış).
// 'openMontageOffer' özel olayı ile tetiklenir (hooks/Cart/montageRedirect.ts). Eski ortadaki
// "montaj ister misiniz?" penceresi kaldırıldı; müşteri doğrudan /montaj-noktasi-sec sayfasına gider.
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
