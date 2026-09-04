'use client';

// Alastik montaj noktası seçimi — ortak tipler ve yardımcılar (referans: ikinciellastik /sepete-eklendi)
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useCart } from '@/src/context/CartContext';
import { SITES } from '@/src/config/siteConfig';

// Marka rengi site temasından okunur (config/siteConfig.ts) — koda gömülmez
const SITE = SITES.alastik;

/** Hex rengi verilen oranda koyulaştırır (hover tonu için) */
const darken = (hex: string, ratio: number): string => {
    const value = hex.replace('#', '');
    if (value.length !== 6) return hex;
    const channel = (start: number) =>
        Math.max(0, Math.round(parseInt(value.slice(start, start + 2), 16) * (1 - ratio)))
            .toString(16).padStart(2, '0');
    return `#${channel(0)}${channel(2)}${channel(4)}`;
};

export const BRAND_RED = SITE.theme.primary;
export const BRAND_RED_DARK = darken(BRAND_RED, 0.16);
/** Metinlerde geçen site adı (ör. "... güvencesi altındadır") */
export const SITE_DOMAIN = SITE.domains[0];
export const TRUST_GREEN = '#16a34a';
export const TEXT_DARK = '#1a1a1a';

export type MontageReview = {
    memberName: string;
    comment: string;
    processRating: number;
    locationRating: number;
    createdAt: string;
};

// price: noktaya özel fiyat (0 = ücretsiz) veya katalog fiyatı; null ise fiyat bilinmiyor
export type MontageService = {
    productKey: string;
    sku: string;
    name: string;
    price: number | null;
    /** Kategori ayarı: 'haric' ise fiyat KDV hariç gösterilir ("X TL + KDV") */
    priceDisplay?: 'dahil' | 'haric';
    vatRate?: number;
    isMontage?: boolean;
    rimRange?: { min: number; max: number } | null;
};

// Satın alma öncesi noktalar anonimdir; "Bilgileri Gözüksün" açık noktalarda ad/adres/telefon gelir
export type MontagePoint = {
    _id: string;
    name: string;
    isPublicInfo?: boolean;
    address?: string;
    phone?: string;
    city: string;
    district: string;
    workingHours?: string;
    workingSchedule?: Record<string, { open: string; close: string }>;
    services: MontageService[];
    amenities: string[];
    startingPrice: number | null;
    montageStartingPrice: number | null;
    montageStartingPriceDisplay?: 'dahil' | 'haric';
    montageStartingVatRate?: number;
    rating: { average: number | null; processAverage: number | null; locationAverage: number | null; count: number };
    reviews: MontageReview[];
};

export const formatPrice = (n: number | null | undefined) =>
    n == null ? '' : `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;

export const AMENITY_LABELS: Record<string, { label: string; icon: string }> = {
    wc: { label: 'WC', icon: 'ri-user-3-line' },
    waiting_room: { label: 'Bekleme Salonu', icon: 'ri-armchair-line' },
    wifi: { label: 'WiFi', icon: 'ri-wifi-line' },
    air_conditioning: { label: 'Klima', icon: 'ri-windy-line' },
    refreshments: { label: 'İkram', icon: 'ri-cup-line' },
    oil_change: { label: 'Yağ Değişimi', icon: 'ri-drop-line' },
    headlight_check: { label: 'Far Kontrolü', icon: 'ri-lightbulb-line' },
};

/** Gün bazlı saatlerden "Haftaiçi / Cumartesi / Pazar" özeti */
export function hoursSummary(point: MontagePoint): { week: string; sat: string; sun: string } {
    const fmt = (h?: { open: string; close: string }) => (h && h.open && h.close ? `${h.open} - ${h.close}` : 'Kapalı');
    const s = point.workingSchedule || {};
    return { week: fmt(s.monday), sat: fmt(s.saturday), sun: fmt(s.sunday) };
}

/** Yıldızlar — ikinciellastik ile aynı SVG (amber dolu / gri boş) */
export function Stars({ value, size = 14 }: { value: number | null; size?: number }) {
    const n = value === null ? 0 : Math.round(value);
    return (
        <span className="d-inline-flex align-items-center" style={{ gap: 2 }} aria-label={`${value ?? 0} / 5`}>
            {[0, 1, 2, 3, 4].map(i => (
                <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i < n ? '#f59e0b' : '#e2e8f0'} stroke="none">
                    <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
                </svg>
            ))}
        </span>
    );
}

// Select kutuları: tarayıcı oku yerine sabit chevron (appearance-none)
export const SELECT_CHEVRON: React.CSSProperties = {
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    appearance: 'none',
    WebkitAppearance: 'none',
};

/** Hizmet satırı: ad | adet | fiyat | Seç / Kaldır.
 * Sepet kuralları: montaj adedi uygun çaptaki lastik adedini aşamaz (inç üründen otomatik okunur, daha azı alınabilir);
 * diğer hizmetler ancak sepette montaj varken seçilebilir. */
export function ServiceRow({ service, montagePointId, onBeforeSelect }: { service: MontageService; montagePointId: string; onBeforeSelect?: () => Promise<void> }) {
    const { items, addToCart, updateQuantity, removeItem } = useCart();
    // Seçim noktaya özeldir: aynı hizmet başka noktadan seçildiyse burada "Seçildi" sayılmaz
    const cartItem = items.find(i => String(i.productKey) === String(service.productKey) && String(i.montagePointId || '') === String(montagePointId));
    const selected = Boolean(cartItem);
    const [quantity, setQuantity] = useState(1);
    const [busy, setBusy] = useState(false);

    // Sepet kuralları: montaj adedi uygun çaptaki lastik adedini aşamaz; diğer hizmetler montaj gerektirir
    const tires = items.filter(i => i.itemType === 'tire');
    const montageInCart = items.some(i => i.itemType === 'montage');
    const matchingTireCount = service.isMontage && service.rimRange
        ? tires.filter(t => t.rimSize !== null && t.rimSize !== undefined && t.rimSize >= service.rimRange!.min && t.rimSize <= service.rimRange!.max)
            .reduce((sum, t) => sum + t.quantity, 0)
        : 0;
    // Tavan: lastikli sepette montaj adedi en fazla uygun çaptaki lastik adedi olabilir
    const montageCap = Boolean(service.isMontage) && tires.length > 0 && matchingTireCount > 0 ? matchingTireCount : null;
    // Müşteri adet seçmediyse varsayılan lastik adedidir
    const [quantityTouched, setQuantityTouched] = useState(false);
    let ruleHint = '';
    if (service.isMontage && tires.length === 0) {
        // Montaj yalnızca sıfır lastikle: jant, ikinci el vb. ürünlere montaj eklenemez
        ruleHint = 'Montaj yalnızca sıfır lastik ürünleriyle satın alınabilir';
    } else if (service.isMontage && matchingTireCount === 0) {
        ruleHint = 'Sepetinizdeki lastiklerin jant çapına uygun değil';
    } else if (!service.isMontage && !montageInCart) {
        ruleHint = 'Önce lastik montajı hizmeti seçin';
    }
    const blocked = Boolean(ruleHint) && !selected;
    const shownQuantity = cartItem
        ? cartItem.quantity
        : montageCap !== null
            ? (quantityTouched ? Math.min(quantity, montageCap) : montageCap)
            : quantity;

    const handleSelect = async () => {
        if (!service.productKey) return;
        try {
            setBusy(true);
            if (selected) {
                await removeItem(String(service.productKey), service.isMontage ? 'Montaj hizmeti sepetinizden çıkarıldı' : 'Hizmet sepetinizden çıkarıldı');
            } else {
                // Başka noktadan seçilmiş hizmetler varsa önce onlar kaldırılır (hizmetler tek noktadan)
                if (onBeforeSelect) await onBeforeSelect();
                await addToCart(service.productKey, shownQuantity, service.isMontage ? 'Montaj hizmeti sepetinize eklendi' : 'Hizmet sepetinize eklendi', montagePointId);
            }
        } catch {
            toast.error(selected ? 'Hizmet sepetten çıkarılamadı' : 'Hizmet sepete eklenemedi');
        } finally {
            setBusy(false);
        }
    };

    const handleQuantity = async (value: number) => {
        if (!selected) {
            setQuantity(value);
            setQuantityTouched(true);
            return;
        }
        try {
            setBusy(true);
            await updateQuantity(String(service.productKey), value);
        } finally {
            setBusy(false);
        }
    };

    const priceLabel = service.price === null
        ? 'Sorunuz'
        : service.price === 0
            ? 'Ücretsiz'
            : formatPrice(service.price * shownQuantity);

    return (
        <div className="sk-srow">
            <div className="sk-srow-name">
                {service.name}
                {ruleHint && !selected && (
                    <div className="fw-normal" style={{ fontSize: 11, color: BRAND_RED }}>{ruleHint}</div>
                )}
                {montageCap !== null && (
                    <div className="fw-normal text-muted" style={{ fontSize: 11 }}>En fazla lastik adediniz kadar ({montageCap}) seçilebilir</div>
                )}
            </div>
            <select
                className="sk-select sk-select-sm"
                style={SELECT_CHEVRON}
                value={shownQuantity}
                onChange={e => handleQuantity(parseInt(e.target.value))}
                disabled={busy}
                aria-label="Adet"
            >
                {(montageCap !== null
                    ? Array.from({ length: montageCap }, (_, i) => i + 1)
                    : [...new Set([1, 2, 3, 4, 5, 6, 7, 8, shownQuantity])].sort((a, b) => a - b)
                ).map(n => <option key={n} value={n}>{n} Adet</option>)}
            </select>
            <span className="sk-srow-price">{priceLabel}</span>
            {selected ? (
                <button type="button" className="sk-btn sk-btn-dark" onClick={handleSelect} disabled={busy}>
                    Kaldır
                </button>
            ) : (
                <button
                    type="button"
                    className="sk-btn sk-btn-red"
                    onClick={handleSelect}
                    disabled={busy || !service.productKey || service.price === null || blocked}
                >
                    {busy ? '...' : 'Seç'}
                </button>
            )}
        </div>
    );
}
