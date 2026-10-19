'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@lib/api';

interface Brand {
    name: string;
    slug: string;
    logo?: string;
    diaBrand?: string;
}

interface BrandsContextType {
    brands: Map<string, Brand>;
    getBrand: (brandName: string) => Brand | null;
    loading: boolean;
}

const BrandsContext = createContext<BrandsContextType>({
    brands: new Map(),
    getBrand: () => null,
    loading: true
});

export function BrandsProvider({ children }: { children: ReactNode }) {
    const [brands, setBrands] = useState<Map<string, Brand>>(new Map());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBrands = async () => {
            try {
                const response = await api.get('/brands?limit=500');

                const brandsList = response?.data || response?.brands || [];
                const brandsMap = new Map<string, Brand>();

                brandsList.forEach((brand: Brand) => {
                    if (brand.name) {
                        brandsMap.set(brand.name.toUpperCase(), brand);
                        brandsMap.set(brand.name.toLowerCase(), brand);
                    }
                    if (brand.slug) {
                        brandsMap.set(brand.slug.toLowerCase(), brand);
                    }
                    if (brand.diaBrand) {
                        brandsMap.set(brand.diaBrand.toUpperCase(), brand);
                        brandsMap.set(brand.diaBrand.toLowerCase(), brand);
                    }
                    if (brand.diaBrand) {
                        brandsMap.set(brand.diaBrand.toUpperCase(), brand);
                        brandsMap.set(brand.diaBrand.toLowerCase(), brand);
                    }
                })

                setBrands(brandsMap);
            } catch (error) {
                console.error('Markalar yüklenemedi:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBrands();
    }, []);

    const getBrand = (brandName: string): Brand | null => {
        if (!brandName) return null;

        const upperName = brandName.toUpperCase();
        const lowerName = brandName.toLowerCase();

        return brands.get(upperName) || brands.get(lowerName) || null;
    };

    return (
        <BrandsContext.Provider value={{ brands, getBrand, loading }}>
            {children}
        </BrandsContext.Provider>
    );
}

export const useBrands = () => useContext(BrandsContext);