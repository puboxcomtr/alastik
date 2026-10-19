const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

class SimpleImageProcessor {
    constructor(uploadPath) {
        this.uploadPath = uploadPath;
    }

    generateCleanFilename(originalFilename, uploadPath, folder) {
        const cleanName = originalFilename
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[ğüşıöç]/g, match => {
                const map = { 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c' };
                return map[match];
            })
            .replace(/[^a-z0-9.-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        const ext = path.extname(cleanName);
        const nameWithoutExt = path.basename(cleanName, ext) || 'gorsel';

        let finalName = `${nameWithoutExt}${ext}`;
        let counter = 1;

        while (this.fileExists(path.join(uploadPath, folder, finalName))) {
            finalName = `${nameWithoutExt}-${counter}${ext}`;
            counter++;
        }

        return finalName;
    }

    fileExists(filePath) {
        try {
            return require('fs').existsSync(filePath);
        } catch {
            return false;
        }
    }

    async createWebPVersion(originalPath, filename, folder) {
        try {
            const ext = path.extname(filename);
            const baseName = path.basename(filename, ext);
            const webpFilename = `${baseName}.webp`;
            const webpPath = path.join(path.dirname(originalPath), webpFilename);

            await sharp(originalPath)
                .webp({
                    quality: 90,
                    effort: 6,
                    smartSubsample: true
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

    async getFileSize(filePath) {
        try {
            const stats = await fs.stat(filePath);
            return stats.size;
        } catch {
            return 0;
        }
    }

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
                    return;
            }

            await pipeline.toFile(tempPath);

            await fs.rename(tempPath, originalPath);

            return true;
        } catch (error) {
            console.error('Original optimization error:', error);
            return false;
        }
    }

    async processImage(originalPath, filename, folder) {
        try {
            const results = {
                originalOptimized: false,
                webpCreated: false,
                originalSize: 0,
                webpSize: 0,
                compressionRatio: 0
            };

            results.originalOptimized = await this.optimizeOriginal(originalPath);
            results.originalSize = await this.getFileSize(originalPath);

            const webpResult = await this.createWebPVersion(originalPath, filename, folder);
            results.webpCreated = webpResult.success;
            results.webpSize = webpResult.webpSize;
            results.webpFilename = webpResult.webpFilename;

            if (results.webpSize > 0) {
                results.compressionRatio = Math.round(((results.originalSize - results.webpSize) / results.originalSize) * 100);
            }

            return results;

        } catch (error) {
            console.error('Image processing error:', error);
            return { error: error.message };
        }
    }

    processInBackground(originalPath, filename, folder) {
        setTimeout(async () => {
            await this.processImage(originalPath, filename, folder);
        }, 100);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    static generateImageUrls(filename, folder, generateFileUrl) {
        const ext = path.extname(filename);
        const baseName = path.basename(filename, ext);
        const dir = path.dirname(filename);
        const webpRel = dir === '.' ? `${baseName}.webp` : path.join(dir, `${baseName}.webp`);

        return {
            original: generateFileUrl(filename, folder),
            webp: generateFileUrl(webpRel, folder)
        };
    }
}

module.exports = SimpleImageProcessor;