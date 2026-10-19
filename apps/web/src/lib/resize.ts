
export interface ResizeOptions {
    width?: number;
    height?: number;
    backgroundColor?: string;
    quality?: number;
}

export interface ResizeError extends Error {
    code?: string;
}

export const resizeImage = (
    imageUrl: string,
    width: number = 350,
    height: number = 350,
    backgroundColor: string = '#ffffff',
    quality: number = 0.8
): Promise<string> => {
    return new Promise((resolve, reject) => {
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

        const img: HTMLImageElement = new Image();

        img.crossOrigin = 'anonymous';

        img.onload = (): void => {
            try {
                const canvas: HTMLCanvasElement = document.createElement('canvas');
                const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d');

                if (!ctx) {
                    reject(new Error('Canvas context oluşturulamadı'));
                    return;
                }

                canvas.width = width;
                canvas.height = height;

                const scale: number = Math.min(width / img.width, height / img.height);
                const scaledWidth: number = img.width * scale;
                const scaledHeight: number = img.height * scale;

                const x: number = (width - scaledWidth) / 2;
                const y: number = (height - scaledHeight) / 2;

                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, width, height);

                ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

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

        img.src = imageUrl;
    });
};

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