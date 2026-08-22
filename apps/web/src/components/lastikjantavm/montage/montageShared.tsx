'use client';

// Montaj noktası ortak tipler ve yardımcılar (LJA vitrini)
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useCart } from '@/src/context/CartContext';
export type MontageReview = {
    memberName: string;
    comment: string;
    processRating: number;
    locationRating: number;
    createdAt: string;
};

// Satın alma öncesi noktalar anonimdir: API ad/adres/telefon/görsel göndermez, konum ~1 km yuvarlanır
export type MontageService = { productKey: string; sku: string; name: string; price: number };

export type MontagePoint = {
    _id: string;
    name: string; // her zaman "Anlaşmalı Nokta"
    city: string;
    district: string;
    workingHours?: string;
    workingSchedule?: Record<string, { open: string; close: string }>;
    services: MontageService[];
    amenities: string[];
    location?: { lat: number | null; lng: number | null };
    startingPrice: number | null;
    rating: { average: number | null; processAverage: number | null; locationAverage: number | null; count: number };
    reviews: MontageReview[];
};

export const DAYS: { key: string; label: string }[] = [
    { key: 'monday', label: 'Pazartesi' },
    { key: 'tuesday', label: 'Salı' },
    { key: 'wednesday', label: 'Çarşamba' },
    { key: 'thursday', label: 'Perşembe' },
    { key: 'friday', label: 'Cuma' },
    { key: 'saturday', label: 'Cumartesi' },
    { key: 'sunday', label: 'Pazar' },
];

export const AMENITY_LABELS: Record<string, { label: string; icon: string }> = {
    wc: { label: 'WC', icon: 'ri-user-3-line' },
    waiting_room: { label: 'Bekleme Salonu', icon: 'ri-armchair-line' },
    wifi: { label: 'Wi-Fi', icon: 'ri-wifi-line' },
    air_conditioning: { label: 'Klima', icon: 'ri-windy-line' },
    refreshments: { label: 'İkram', icon: 'ri-cup-line' },
    oil_change: { label: 'Yağ Değişimi', icon: 'ri-drop-line' },
    headlight_check: { label: 'Far Kontrolü', icon: 'ri-lightbulb-line' },
};

/** Bugünkü çalışma saati ve şu an açık/kapalı bilgisi */
export function todayStatus(point: MontagePoint): { label: string; isOpen: boolean } {
    const keys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const now = new Date();
    const today = point.workingSchedule?.[keys[now.getDay()]];
    if (!today || !today.open || !today.close) return { label: 'Bugün kapalı', isOpen: false };
    const minutes = now.getHours() * 60 + now.getMinutes();
    const toMin = (t: string) => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);
    const isOpen = minutes >= toMin(today.open) && minutes < toMin(today.close);
    return { label: `Bugün ${today.open} - ${today.close}`, isOpen };
}

export function Stars({ value, size = 16 }: { value: number | null; size?: number }) {
    if (value === null) return null;
    return (
        <span className="d-inline-flex align-items-center gap-0" aria-label={`${value} / 5`}>
            {[1, 2, 3, 4, 5].map(i => (
                <i
                    key={i}
                    className={i <= Math.round(value) ? 'ri-star-fill' : 'ri-star-line'}
                    style={{ color: i <= Math.round(value) ? '#e4cc15' : '#c9c9c9', fontSize: size }}
                />
            ))}
        </span>
    );
}


/** Hizmet satırı: adet + fiyat + Seç. Seçilen hizmet tekrar eklenemez ("Seçildi");
 * adet değişikliği sepetteki miktarı günceller. Harita yan kartı ve detay sayfası ortak kullanır. */
export function ServiceRow({ service, compact = false, montagePointId }: { service: MontageService; compact?: boolean; montagePointId?: string }) {
    const { items, addToCart, updateQuantity, removeItem } = useCart();
    const cartItem = items.find(i => String(i.productKey) === String(service.productKey));
    const selected = Boolean(cartItem);
    const [quantity, setQuantity] = useState(1);
    const [busy, setBusy] = useState(false);
    const shownQuantity = cartItem ? cartItem.quantity : quantity;

    const handleSelect = async () => {
        if (!service.productKey) return;
        try {
            setBusy(true);
            if (selected) {
                // Seçiliyken tekrar tıklama: hizmeti sepetten çıkarır
                await removeItem(String(service.productKey), 'Hizmet sepetten çıkarıldı');
            } else {
                await addToCart(service.productKey, quantity, 'Hizmet sepete eklendi', montagePointId);
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
            return;
        }
        try {
            setBusy(true);
            await updateQuantity(String(service.productKey), value);
            toast.success('Hizmet adedi güncellendi');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="d-flex align-items-center gap-2 py-3 border-bottom">
            {/* 3 bölge: sol hizmet adı, ortada adet, sağda fiyat + Seç */}
            <div className="flex-grow-1 fw-bold" style={{ fontSize: compact ? 13 : 15, minWidth: 0 }}>
                {service.name}
            </div>
            <select
                className="form-select form-select-sm flex-shrink-0"
                style={{ width: compact ? 112 : 120 }}
                value={shownQuantity}
                onChange={e => handleQuantity(parseInt(e.target.value))}
                disabled={busy}
                aria-label="Adet"
            >
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} Adet</option>)}
            </select>
            <div className="fw-bold flex-shrink-0" style={{ width: compact ? 84 : 100, textAlign: 'right', fontSize: compact ? 14 : 17, color: 'inherit' }}>
                {service.price > 0 ? `${(service.price * shownQuantity).toLocaleString('tr-TR')} TL` : 'Sorunuz'}
            </div>
            <button
                type="button"
                className="btn btn-sm fw-bold px-3 flex-shrink-0"
                style={selected
                    ? { background: '#2e7d32', color: '#fff', minWidth: 72 }
                    : { background: '#e4cc15', color: '#000', minWidth: 72 }}
                onClick={handleSelect}
                disabled={busy || !service.productKey || service.price <= 0}
                title={selected ? 'Seçimi kaldır' : undefined}
            >
                {selected ? <><i className="ri-check-line me-1" />Seçildi<i className="ri-close-line ms-1" /></> : busy ? '...' : 'Seç'}
            </button>
        </div>
    );
}
