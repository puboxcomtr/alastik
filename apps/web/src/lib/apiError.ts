// Sayfa verisi çeken servisler için hata ayrımı.
// "Bulunamadı" (404) → servis null döner, sayfa 404 olur.
// API hatası / zaman aşımı / bağlantı hatası → hata fırlatılır, sayfa 500 + app/error.tsx olur.
// Neden: eskiden her hata null → 404 dönüyordu; API kısa süre yanıt vermediğinde Google
// var olan ürünleri "yok" (404) görüp dizinden düşürüyordu. 5xx'i ise geçici sayıp tekrar dener.

import { unstable_rethrow } from 'next/navigation';

export class ApiUnavailableError extends Error {
    constructor(what: string, detail: string) {
        super(`[${what}] API kullanılamıyor: ${detail}`);
        this.name = 'ApiUnavailableError';
    }
}

// Sayfa verisi istekleri için üst süre (ms)
export const PAGE_FETCH_TIMEOUT = 20000;

// 5xx / 429 yanıtlarında hata fırlatır; 404 ve diğer 4xx'te false döner (çağıran null döndürür)
export function throwIfUnavailable(res: Response, what: string): void {
    if (res.status >= 500 || res.status === 429) {
        throw new ApiUnavailableError(what, `HTTP ${res.status}`);
    }
}

// catch bloğunda: ağ hatası / zaman aşımı / zaten sınıflanmış hata yeniden fırlatılır.
// Next'in kendi iç hataları (notFound, redirect, dinamik kullanım) olduğu gibi geçirilir.
export function rethrowUnavailable(error: unknown, what: string): never {
    unstable_rethrow(error);
    if (error instanceof ApiUnavailableError) throw error;
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    throw new ApiUnavailableError(what, detail);
}
