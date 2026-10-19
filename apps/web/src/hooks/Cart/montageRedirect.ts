import { getProductType } from '@/src/hooks/Products/productHelpers';
import type { Product } from '@/src/types/products';

export const MONTAGE_OFFER_EVENT = 'openMontageOffer';

export const MONTAGE_OFFER_STORAGE_KEY = 'lja_montage_offer_answered_v1';

export const hasAnsweredMontageOffer = (): boolean => {
    try {
        return Boolean(localStorage.getItem(MONTAGE_OFFER_STORAGE_KEY));
    } catch {
        return true;
    }
};

export const markMontageOfferAnswered = (): void => {
    try {
        localStorage.setItem(MONTAGE_OFFER_STORAGE_KEY, new Date().toISOString());
    } catch {  }
};

export const offerMontageAfterAdd = (product: Product): void => {
    if (getProductType(product) !== 'LASTIK') return;
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(MONTAGE_OFFER_EVENT));
};
