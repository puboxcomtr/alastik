/* Kategori Dataları */
"use client";

/* Next JS */
import { useState, useEffect, useCallback } from "react";

/* Cart */
import cartService from "@/src/lib/cartService";
import { cartUtils } from "@/src/components/cart/ShoppingCart";

/* Auth */
import authService from "@/src/lib/auth";

export function useCategoryData() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [vehicleInfo, setVehicleInfo] = useState<any>(null);
    const [products, setProducts] = useState<any[]>([]);
    const [filters, setFilters] = useState<any>({});

    // Araç bilgisi yükleme
    const loadVehicleInfo = useCallback(async (id: string) => {
        try {
            setLoading(true);
            const res = await backendApi.get(`/vehicle/${id}`);
            setVehicleInfo(res.data);
            setLoading(false);
        } catch (err: any) {
            setError("Araç bilgisi alınamadı");
            setLoading(false);
        }
    }, []);

    //  Lastikleri yükleme
    const loadKategoriLastikleri = useCallback(async (kategoriId: string) => {
        try {
            setLoading(true);
            const res = await backendApi.get(`/category/${kategoriId}/tires`);
            setProducts(res.data);
            setLoading(false);
        } catch (err: any) {
            setError("Ürünler alınamadı");
            setLoading(false);
        }
    }, []);

    // ekleme
    const handleAddToCart = useCallback(async (product: any) => {
        try {
            await cartService.add(product);
            cartUtils.refreshCartCount();
        } catch (err) {
            console.error("Sepete eklenemedi", err);
        }
    }, []);

    return {
        loading,
        error,
        vehicleInfo,
        products,
        filters,
        setFilters,
        loadVehicleInfo,
        loadKategoriLastikleri,
        handleAddToCart,
    };
}
