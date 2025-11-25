const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { MEDIA_CONFIG, getUploadDir, getUrlPrefix, getFullPath, getConfig, getCategoryFromUrl } = require('../config/media');

class MediaService {
    /**
     * Slug oluştur (Türkçe karakterleri dönüştür)
     */
    static slugify(text) {
        const trMap = {
            'ç': 'c', 'Ç': 'c',
            'ğ': 'g', 'Ğ': 'g',
            'ı': 'i', 'I': 'i',
            'İ': 'i',
            'ö': 'o', 'Ö': 'o',
            'ş': 's', 'Ş': 's',
            'ü': 'u', 'Ü': 'u'
        };

        let slug = text.toString().toLowerCase();

        for (const [key, value] of Object.entries(trMap)) {
            slug = slug.replace(new RegExp(key, 'g'), value);
        }

        return slug
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    /**
     * Benzersiz dosya adı oluştur
     */
    static generateFileName(originalName, baseName = null) {
        const ext = path.extname(originalName).toLowerCase();
        const nameWithoutExt = baseName || path.basename(originalName, ext);
        const slug = this.slugify(nameWithoutExt);

        return `${slug}${ext}`;
    }

    /**
     * Dosya adı çakışmasını çöz
     */
    static resolveFileConflict(uploadDir, fileName) {
        const ext = path.extname(fileName);
        const nameWithoutExt = path.basename(fileName, ext);

        let finalName = fileName;
        let counter = 1;

        while (fs.existsSync(path.join(uploadDir, finalName))) {
            finalName = `${nameWithoutExt}-${counter}${ext}`;
            counter++;
        }

        return finalName;
    }

    /**
     * Multer storage oluştur
     */
    static createStorage(category) {
        const uploadDir = getUploadDir(category);

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        return multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, uploadDir);
            },
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = path.extname(file.originalname).toLowerCase();
                cb(null, `${category}-${uniqueSuffix}${ext}`);
            }
        });
    }

    /**
     * Multer file filter oluştur
     */
    static createFileFilter(category) {
        const config = getConfig(category);

        return (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            const isValidExt = config.allowedExtensions.includes(ext);
            const isValidMime = config.allowedTypes.includes(file.mimetype);

            if (isValidExt && isValidMime) {
                cb(null, true);
            } else {
                cb(new Error(`Gecersiz dosya formati. Izin verilen formatlar: ${config.allowedExtensions.join(', ')}`));
            }
        };
    }

    /**
     * Multer upload middleware oluştur (tek veya çoklu)
     * @param {string} category - Media kategorisi (slider, brand, vs.)
     * @param {string} fieldName - Form field adı
     * @param {number} maxCount - Maksimum dosya sayısı (1 = single, >1 = array)
     */
    static createUploader(category, fieldName = 'image', maxCount = 1) {
        const config = getConfig(category);

        const upload = multer({
            storage: this.createStorage(category),
            limits: { fileSize: config.maxSize },
            fileFilter: this.createFileFilter(category)
        });

        // Tek dosya mı çoklu mu?
        if (maxCount === 1) {
            return upload.single(fieldName);
        }
        return upload.array(fieldName, maxCount);
    }

    /**
     * Dosya URL'i oluştur
     */
    static getFileUrl(category, fileName) {
        const urlPrefix = getUrlPrefix(category);
        return `${urlPrefix}/${fileName}`;
    }

    /**
     * Dosya sil
     */
    static deleteFile(urlPath) {
        if (!urlPath) return false;

        try {
            const fullPath = getFullPath(urlPath);

            if (fullPath && fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log(`Dosya silindi: ${fullPath}`);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Dosya silme hatasi:', error);
            return false;
        }
    }

    /**
     * Dosya var mı kontrol et
     */
    static fileExists(urlPath) {
        if (!urlPath) return false;

        const fullPath = getFullPath(urlPath);
        return fullPath ? fs.existsSync(fullPath) : false;
    }

    /**
     * Eski dosyayı sil (güncelleme işlemlerinde kullan)
     */
    static deleteOldFile(oldUrl, newUrl) {
        if (oldUrl === newUrl) return false;
        if (!oldUrl) return false;
        return this.deleteFile(oldUrl);
    }
}

module.exports = MediaService;