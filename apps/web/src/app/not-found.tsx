'use client';

// Bilinmeyen tüm adresler tasarlanmış 404 sayfasına yönlendirilir
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/sayfa-bulunamadi');
    }, [router]);
    return null;
}
