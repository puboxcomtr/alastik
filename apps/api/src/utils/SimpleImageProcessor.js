const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Basit Image Processor - Sadece WebP dönüşüm ve filename temizleme
 */
class SimpleImageProcessor {
    constructor(uploadPath) {
        this.uploadPath = uploadPath;
    }

    /**
     * Temiz filename oluştur
     */
    generateCleanFilename(originalFilename, uploadPath, folder) {
        // Dosya adını temizle
        const cleanName = originalFilename
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Aksan kaldır
            .replace(/[ğüşıöç]/g, match => {
                const map = { 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c' };
                return map[match];
            })
            .replace(/[^a-z0-9.-]/g, '-') // Özel karakterleri - yap
            .replace(/-+/g, '-') // Çoklu - ları tek yap
            .replace(/^-|-$/g, ''); // Baş/son - kaldır

        const ext = path.extname(cleanName);
        const nameWithoutExt = path.basename(cleanName, ext) || 'gorsel';

        // Aynı isimde dosya var mı kontrol et
        let finalName = `${nameWithoutExt}${ext}`;
        let counter = 1;

        while (this.fileExists(path.join(uploadPath, folder, finalName))) {
            finalName = `${nameWithoutExt}-${counter}${ext}`;
            counter++;
        }

        return finalName;
    }

    /**
     * Dosya var mı kontrol et (senkron)
     */
    fileExists(filePath) {
        try {
            return require('fs').existsSync(filePath);
        } catch {
            return false;
        }
    }

    /**
     * WebP versiyonu oluştur
     */
    async createWebPVersion(originalPath, filename, folder) {
        try {
            const ext = path.extname(filename);
            const baseName = path.basename(filename, ext);
            const webpFilename = `${baseName}.webp`;
            // WebP orijinalin yanına yazılır (site alt klasörlü yüklemelerde de doğru yerde kalır)
            const webpPath = path.join(path.dirname(originalPath), webpFilename);

            // WebP'ye dönüştür - yüksek kalite (90%)
            await sharp(originalPath)
                .webp({
                    quality: 90,
                    effort: 6,
                    smartSubsample: true // Daha iyi renk korunumu
                })
                .toFile(webpPath);

            return {
                success: true,
                webpFilename,
                webpPath,
                originalSize: await this.getFileSize(originalPath),
                webpSize: await this.getFileSize(webpPath)
            };

        } catch (error) {
            console.error('WebP creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Dosya boyutunu al
     */
    async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch {
            return 0;
        }
    }

    /**
     * Orijinal görsel kalitesini optimize et (boyut değişmez)
     */
    async optimizeOriginal(originalPath) {
        try {
            const ext = path.extname(originalPath).toLowerCase();
            const tempPath = originalPath + '_temp';

            let pipeline = sharp(originalPath);

            switch (ext) {
                case '.jpg':
                case '.jpeg':
                    pipeline = pipeline.jpeg({
                        quality: 92,
                        mozjpeg: true
                    });
                    break;
                case '.png':
                    pipeline = pipeline.png({
                        compressionLevel: 6,
                        quality: 92
                    });
                    break;
                default:
                    return; // WebP ve diğerleri için optimize etme
            }

            await pipeline.toFile(tempPath);

            // Orijinal ile değiştir
            await fs.rename(tempPath, originalPath);

            return true;
        } catch (error) {
            console.error('Original optimization error:', error);
            return false;
        }
    }

    /**
     * Ana işlem - Upload sonrası çalışır
     */
    async processImage(originalPath, filename, folder) {
        try {
            const results = {
                originalOptimized: false,
                webpCreated: false,
                originalSize: 0,
                webpSize: 0,
                compressionRatio: 0
            };

            // 1. Orijinal dosyayı optimize et
            results.originalOptimized = await this.optimizeOriginal(originalPath);
            results.originalSize = await this.getFileSize(originalPath);

            // 2. WebP versiyonu oluştur
            const webpResult = await this.createWebPVersion(originalPath, filename, folder);
            results.webpCreated = webpResult.success;
            results.webpSize = webpResult.webpSize;
            results.webpFilename = webpResult.webpFilename;

            // 3. Compression ratio hesapla
            if (results.webpSize > 0) {
                results.compressionRatio = Math.round(((results.originalSize - results.webpSize) / results.originalSize) * 100);
            }

            return results;

        } catch (error) {
            console.error('Image processing error:', error);
            return { error: error.message };
        }
    }

    /**
     * Background'da işle (kullanıcı beklemez)
     */
    processInBackground(originalPath, filename, folder) {
        setTimeout(async () => {
            await this.processImage(originalPath, filename, folder);
        }, 100);
    }

    /**
     * Bytes'ı okunabilir formata çevir
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Responsive image URL'leri oluştur
     */
    static generateImageUrls(filename, folder, generateFileUrl) {
        const ext = path.extname(filename);
        const baseName = path.basename(filename, ext);
        // Alt klasör (ör. site öneki) korunur
        const dir = path.dirname(filename);
        const webpRel = dir === '.' ? `${baseName}.webp` : path.join(dir, `${baseName}.webp`);

        return {
            original: generateFileUrl(filename, folder),
            webp: generateFileUrl(webpRel, folder)
        };
    }
}

module.exports = SimpleImageProcessor;