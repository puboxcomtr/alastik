'use client';
// Sayfa oluşturulurken beklenmeyen hata (ör. API geçici olarak yanıt vermedi).
// HTTP 500 döner: Google bunu geçici sayar ve sayfayı dizinden düşürmeden tekrar dener
// (eskiden bu durumda 404 dönüyor, ürünler "yok" sanılıyordu).
import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        console.error('[app/error]', error);
    }, [error]);

    return (
        <div className="container py-5 text-center" style={{ minHeight: '50vh' }}>
            <h1 className="h3 mb-3">Sayfa şu anda yüklenemedi</h1>
            <p className="text-muted mb-4">
                Geçici bir sorun oluştu. Lütfen birkaç saniye sonra tekrar deneyin.
            </p>
            <div className="d-flex gap-2 justify-content-center flex-wrap">
                <button type="button" className="btn btn-dark" onClick={() => reset()}>
                    Tekrar Dene
                </button>
                <Link href="/" className="btn btn-outline-dark">
                    Ana Sayfaya Dön
                </Link>
            </div>
        </div>
    );
}
