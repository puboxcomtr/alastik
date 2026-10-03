import { getProductType } from '@/src/hooks/Products/productHelpers';
import type { Product } from '@/src/types/products';

// Lastik sepete eklenince montaj teklifi popup'ını açan özel olay (MontageOffer modalı dinler)
export const MONTAGE_OFFER_EVENT = 'openMontageOffer';

// Teklif müşteriye yalnız BİR kez sorulur; verilen yanıt tarayıcıda saklanır.
// Anahtar sürümü artırılırsa tüm ziyaretçilere yeniden sorulur.
export const MONTAGE_OFFER_STORAGE_KEY = 'lja_montage_offer_answered_v1';

export const hasAnsweredMontageOffer = (): boolean => {
    try {
        return Boolean(localStorage.getItem(MONTAGE_OFFER_STORAGE_KEY));
    } catch {
        return true; // localStorage yoksa (gizli mod vb.) tekrar tekrar sormamak için sorulmaz
    }
};

export const markMontageOfferAnswered = (): void => {
    try {
        localStorage.setItem(MONTAGE_OFFER_STORAGE_KEY, new Date().toISOString());
    } catch { /* saklanamazsa sessizce geç */ }
};

/**
 * LJA: lastik sepete eklendiyse montaj noktası seçimi ekranına geçilir (alastik ile aynı akış).
 * Olayı dinleyen MontageOffer bileşeni /montaj-noktasi-sec sayfasına yönlendirir; artık popup sorulmaz.
 */
export const offerMontageAfterAdd = (product: Product): void => {
    if (getProductType(product) !== 'LASTIK') return;
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(MONTAGE_OFFER_EVENT));
};
