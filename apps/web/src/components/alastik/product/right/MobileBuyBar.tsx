"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';

import { Product } from '@/src/types/products';
import { useCart } from '@/src/context/CartContext';
import { ROUTES } from '@/src/config/routes';
import { API_ENDPOINTS } from '@/src/config/api';
import { isLogged } from '@/src/hooks/Theme/useAuth';
import { getProductPrice, getDisplayPrice, getProductUrl, getProductImage, getProductType, isPriceHidden, PRICE_HIDDEN_LABEL } from '@/src/hooks/Products/productHelpers';
import { checkPurchaseLimit, productToLimitCheckItem } from '@/src/hooks/Products/purchaseLimitHelpers';

export interface SimilarSizeQuery {
    genislik: string;
    yanak: string;
    cap: string;
}

interface MobileBuyBarProps {
    product: Product;
    similar?: SimilarSizeQuery | null;
}

const formatTL = (value: number) =>
    value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MobileBuyBar({ product, similar }: MobileBuyBarProps) {
    const router = useRouter();
    const { addToCart } = useCart();
    const [busy, setBusy] = useState<'add' | 'buy' | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [suggestions, setSuggestions] = useState<Product[] | null>(null);

    useEffect(() => {
        if (!sheetOpen) return;
        const id = requestAnimationFrame(() => setSheetVisible(true));
        return () => cancelAnimationFrame(id);
    }, [sheetOpen]);

    const hasStock = product.diaData?.gercek_stok > 0;
    if (!hasStock) return null;

    const price = getProductPrice(product);
    const priceHidden = isPriceHidden(product);
    const gosterim = getDisplayPrice(product, price);
    const cartHref = getProductType(product) === 'LASTIK' ? ROUTES.MONTAGE_SELECT : ROUTES.CART;

    const loadSuggestions = async () => {
        if (suggestions !== null || !similar) return;
        try {
            const params = new URLSearchParams({
                genislik: similar.genislik,
                yukseklik: similar.yanak,
                cap: similar.cap,
                limit: '8'
            });
            const res = await fetch(`${API_ENDPOINTS.products.filter()}?${params.toString()}`, { cache: 'no-store' });
            const result = await res.json();
            const items: Product[] = result?.success ? (result.data?.products || []) : [];
            setSuggestions(items.filter(p => p._key !== product._key).slice(0, 6));
        } catch (err) {
            console.error('Benzer ürünler yüklenemedi:', err);
            setSuggestions([]);
        }
    };

    const addOne = async (silent: boolean): Promise<boolean> => {
        const check = await checkPurchaseLimit([productToLimitCheckItem(product, 1)]);
        if (!check.valid && check.violations.length > 0) {
            check.violations.forEach(v => toast.error(v.message));
            return false;
        }
        return addToCart(product._key, 1, silent ? '' : undefined);
    };

    const handleAddToCart = async () => {
        if (busy || priceHidden) return;
        setBusy('add');
        loadSuggestions();
        try {
            const added = await addOne(true);
            if (added) {
                setSheetOpen(true);
            }
        } catch (err) {
            console.error('Sepete ekleme hatası:', err);
            toast.error('Sepete eklenemedi');
        } finally {
            setBusy(null);
        }
    };

    const closeSheet = () => {
        setSheetVisible(false);
        setTimeout(() => setSheetOpen(false), 260);
    };

    const handleBuyNow = async () => {
        if (busy || priceHidden) return;
        setBusy('buy');
        try {
            const added = await addOne(true);
            if (added) {
                if (getProductType(product) === 'LASTIK') router.push(ROUTES.MONTAGE_SELECT);
                else router.push(isLogged() ? ROUTES.CHECKOUT : `${ROUTES.LOGIN}?from=checkout`);
            }
        } catch (err) {
            console.error('Şimdi al hatası:', err);
            toast.error('Sepete eklenemedi');
        } finally {
            setBusy(null);
        }
    };

    return (
        <>
            <div className="d-md-none" style={{ height: 104 }} aria-hidden="true" />
            <div
                className="d-md-none bg-white"
                style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 1030,
                    boxShadow: '0 -2px 8px rgba(0, 0, 0, .06)',
                    padding: '16px',
                    paddingBottom: 'calc(16px + env(safe-area-inset-bottom))'
                }}
            >
                <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold text-black" style={{ fontSize: '1.05rem', whiteSpace: 'nowrap' }}>
                        {priceHidden ? PRICE_HIDDEN_LABEL : `${formatTL(gosterim.value)} TL${gosterim.suffix}`}
                    </span>
                    <button
                        type="button"
                        className="btn btn-outline-primary"
                        style={{ flex: '1 1 0', minWidth: 0, paddingTop: 12, paddingBottom: 12 }}
                        onClick={handleBuyNow}
                        disabled={busy !== null || priceHidden}
                    >
                        {busy === 'buy' ? '...' : 'Şimdi Al'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        style={{ flex: '1.4 1 0', minWidth: 0, paddingTop: 12, paddingBottom: 12 }}
                        onClick={handleAddToCart}
                        disabled={busy !== null || priceHidden}
                    >
                        {busy === 'add' ? 'Ekleniyor...' : 'Sepete Ekle'}
                    </button>
                </div>
            </div>

            {sheetOpen && (
                <div className="d-md-none">
                    <div
                        onClick={closeSheet}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0,0,0,.45)',
                            zIndex: 1040,
                            opacity: sheetVisible ? 1 : 0,
                            transition: 'opacity .26s ease'
                        }}
                        aria-hidden="true"
                    />
                    <div
                        className="bg-white rounded-top"
                        style={{
                            position: 'fixed',
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 1050,
                            maxHeight: '80vh',
                            overflowY: 'auto',
                            padding: '16px',
                            paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
                            transform: sheetVisible ? 'translateY(0)' : 'translateY(100%)',
                            transition: 'transform .26s cubic-bezier(.32, .72, 0, 1)',
                            willChange: 'transform'
                        }}
                    >
                        <div className="d-flex align-items-center justify-content-between rounded p-3 bg-success-subtle mb-3">
                            <span className="fw-semibold text-success">
                                <i className="ri-checkbox-circle-fill me-1"></i> Ürün sepete eklendi!
                            </span>
                            <Link href={cartHref} className="fw-semibold text-success text-decoration-none">
                                Sepete Git ›
                            </Link>
                        </div>

                        {similar && suggestions && suggestions.length > 0 && (
                            <div className="mb-3">
                                <h6 className="fw-bold mb-1">Bunlar da İlgini Çekebilir</h6>
                                <p className="text-muted fs-sm mb-2">Aynı ebattan diğer lastikler:</p>
                                <div className="d-flex gap-2 overflow-auto pb-1">
                                    {suggestions.map(item => (
                                        <Link
                                            key={item._key}
                                            href={getProductUrl(item)}
                                            className="card text-decoration-none flex-shrink-0"
                                            style={{ width: 150 }}
                                        >
                                            <img
                                                src={getProductImage(item)}
                                                alt={item.diaData?.aciklama || 'Ürün'}
                                                className="card-img-top bg-white"
                                                style={{ height: 110, objectFit: 'contain' }}
                                                loading="lazy"
                                            />
                                            <div className="card-body p-2">
                                                <p className="fs-sm text-black mb-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {item.diaData?.aciklama || 'Ürün'}
                                                </p>
                                                <span className="fw-bold text-black">{(() => { const g = getDisplayPrice(item, getProductPrice(item)); return `${formatTL(g.value)} TL${g.suffix}`; })()}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-primary flex-fill"
                                onClick={closeSheet}
                            >
                                Alışverişe Devam
                            </button>
                            <Link href={cartHref} className="btn btn-primary flex-fill">
                                Sepete Git
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
