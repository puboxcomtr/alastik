/**
 * Görsel boyutlandırma utility fonksiyonu
 * Herhangi bir görseli belirtilen boyutlara dönüştürür
 */

// Type definitions
export interface ResizeOptions {
    width?: number;
    height?: number;
    backgroundColor?: string;
    quality?: number;
}

export interface ResizeError extends Error {
    code?: string;
}

/**
 * Görseli belirtilen boyutlara resize eder
 * @param imageUrl - Resize edilecek görsel URL'i
 * @param width - Hedef genişlik (default: 350)
 * @param height - Hedef yükseklik (default: 350) 
 * @param backgroundColor - Arka plan rengi (default: '#ffffff')
 * @param quality - JPEG kalitesi 0.1-1.0 arası (default: 0.8)
 * @returns Promise<string> - Resize edilmiş görsel data URL'i
 */
export const resizeImage = (
    imageUrl: string,
    width: number = 350,
    height: number = 350,
    backgroundColor: string = '#ffffff',
    quality: number = 0.8
): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Input validation
        if (!imageUrl || typeof imageUrl !== 'string') {
            reject(new Error('Geçersiz görsel URL\'i'));
            return;
        }

        if (width <= 0 || height <= 0) {
            reject(new Error('Geçersiz boyut değerleri'));
            return;
        }

        if (quality < 0.1 || quality > 1.0) {
            reject(new Error('Kalite değeri 0.1-1.0 arasında olmalı'));
            return;
        }

        // Yeni image elementi oluştur
        const img: HTMLImageElement = new Image();

        // CORS sorunlarını önlemek için
        img.crossOrigin = 'anonymous';

        img.onload = (): void => {
            try {
                // Canvas oluştur
                const canvas: HTMLCanvasElement = document.createElement('canvas');
                const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Canvas context oluşturulamadı'));
                    return;
                }

                // Canvas boyutlarını ayarla
                canvas.width = width;
                canvas.height = height;

                // Görsel oranını koruyarak resize hesapla
                const scale: number = Math.min(width / img.width, height / img.height);
                const scaledWidth: number = img.width * scale;
                const scaledHeight: number = img.height * scale;

                // Ortalama için pozisyon hesapla
                const x: number = (width - scaledWidth) / 2;
                const y: number = (height - scaledHeight) / 2;

                // Arka plan boyası
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, width, height);

                // Görseli çiz
                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

                // Data URL olarak dönüştür
                const resizedDataUrl: string = canvas.toDataURL('image/jpeg', quality);
                resolve(resizedDataUrl);

            } catch (error) {
                const resizeError: ResizeError = new Error(`Görsel resize edilemedi: ${(error as Error).message}`);
                resizeError.code = 'RESIZE_ERROR';
                reject(resizeError);
            }
        };

        img.onerror = (): void => {
            const loadError: ResizeError = new Error('Görsel yüklenemedi');
            loadError.code = 'LOAD_ERROR';
            reject(loadError);
        };

        // Görsel yüklemeyi başlat
        img.src = imageUrl;
    });
};

/**
 * Çoklu görsel resize etme fonksiyonu
 * @param imageUrls - Resize edilecek görsel URL'leri
 * @param width - Hedef genişlik
 * @param height - Hedef yükseklik
 * @returns Promise<string[]> - Resize edilmiş görsellerin data URL'leri
 */
export const resizeMultipleImages = async (
    imageUrls: string[],
    width: number = 350,
    height: number = 350
): Promise<string[]> => {
    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
        throw new Error('Geçersiz görsel URL listesi');
    }

    try {
        const promises: Promise<string>[] = imageUrls.map(url => resizeImage(url, width, height));
        return await Promise.all(promises);
    } catch (error) {
        throw new Error(`Çoklu görsel resize edilemedi: ${(error as Error).message}`);
    }
};

/**
 * File objesini resize etme fonksiyonu (file input için)
 * @param file - Resize edilecek file objesi
 * @param width - Hedef genişlik
 * @param height - Hedef yükseklik
 * @returns Promise<string> - Resize edilmiş görsel data URL'i
 */
export const resizeImageFile = (
    file: File,
    width: number = 350,
    height: number = 350
): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!file || !(file instanceof File)) {
            reject(new Error('Geçersiz file objesi'));
            return;
        }

        if (!file.type.startsWith('image/')) {
            reject(new Error('Geçersiz dosya tipi. Sadece görsel dosyaları desteklenir.'));
            return;
        }

        const reader: FileReader = new FileReader();

        reader.onload = (e: ProgressEvent<FileReader>): void => {
            const result = e.target?.result;
            if (typeof result === 'string') {
                resizeImage(result, width, height)
                    .then(resolve)
                    .catch(reject);
            } else {
                reject(new Error('Dosya okunamadı'));
            }
        };

        reader.onerror = (): void => {
            reject(new Error('Dosya okuma hatası'));
        };

        reader.readAsDataURL(file);
    });
};

/**
 * Options objesi ile resize fonksiyonu
 * @param imageUrl - Görsel URL'i
 * @param options - Resize seçenekleri
 * @returns Promise<string> - Resize edilmiş görsel data URL'i
 */
export const resizeImageWithOptions = (
    imageUrl: string,
    options: ResizeOptions = {}
): Promise<string> => {
    const {
        width = 350,
        height = 350,
        backgroundColor = '#ffffff',
        quality = 0.8
    } = options;

    return resizeImage(imageUrl, width, height, backgroundColor, quality);
};