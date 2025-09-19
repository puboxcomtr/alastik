const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();

// Path
const paths = require('../../../config/path');

const MEDIA_FOLDERS = paths.mediaFolders;
const getUploadPath = paths.getUploadPath;
const generateFileUrl = paths.generateFileUrl;

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const folder = req.query.folder || req.body?.folder || 'general';
            if (!MEDIA_FOLDERS[folder]) {
                return cb(new Error(`Geçersiz klasör: ${folder}`));
            }
            const uploadPath = getUploadPath(folder);
            try {
                if (!require('fs').existsSync(uploadPath)) {
                    require('fs').mkdirSync(uploadPath, { recursive: true });
                }
                cb(null, uploadPath);
            } catch (error) {
                cb(error);
            }
        },
        filename: (req, file, cb) => {
            const cleanName = file.originalname
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

            const timestamp = Date.now();
            const ext = path.extname(cleanName);
            const nameWithoutExt = path.basename(cleanName, ext) || 'file';

            const fileName = `${nameWithoutExt}-${timestamp}${ext}`;
            cb(null, fileName);
        }
    }),
    limits: {
        fileSize: paths.config.maxFileSize
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = paths.config.allowedFileTypes;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Sadece resim dosyaları yüklenebilir (JPEG, PNG, GIF, WebP, SVG)'));
        }
    }
});
router.post('/upload', upload.array('files', paths.config.maxFileCount), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Yüklenecek dosya bulunamadı'
            });
        }
        const folder = req.query.folder || req.body?.folder || 'general';
        if (!MEDIA_FOLDERS[folder]) {
            return res.status(400).json({
                success: false,
                message: `Geçersiz klasör: ${folder}`
            });
        }
        const uploadedFiles = [];
        for (const file of req.files) {
            const fileInfo = {
                id: Date.now() + Math.random().toString(36).substring(2, 11),
                filename: file.filename,
                originalname: file.originalname,
                url: generateFileUrl(file.filename, folder),
                size: file.size,
                mimetype: file.mimetype,
                folder: folder,
                uploadDate: new Date().toISOString(),
                path: file.path
            };

            uploadedFiles.push(fileInfo);
        }

        res.json({
            success: true,
            message: `${uploadedFiles.length} dosya başarıyla yüklendi`,
            files: uploadedFiles
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Dosya yüklenirken hata oluştu'
        });
    }
});
router.get('/list', async (req, res) => {
    try {
        const {
            folder = 'general',
            search = '',
            page = 1,
            limit = 20,
            sortBy = 'date',
            sortOrder = 'desc'
        } = req.query;

        if (!MEDIA_FOLDERS[folder]) {
            return res.status(400).json({
                success: false,
                message: `Geçersiz klasör: ${folder}`
            });
        }
        const uploadPath = getUploadPath(folder);
        try {
            const files = await fs.readdir(uploadPath);

            const fileList = await Promise.all(
                files
                    .filter(file => {
                        const isImage = paths.config.allowedFileTypes.test(path.extname(file).toLowerCase());
                        const matchesSearch = file.toLowerCase().includes(search.toLowerCase());
                        return isImage && matchesSearch;
                    })
                    .map(async (file) => {
                        try {
                            const filePath = path.join(uploadPath, file);
                            const stats = await fs.stat(filePath);
                            return {
                                id: file,
                                filename: file,
                                url: generateFileUrl(file, folder),
                                size: stats.size,
                                uploadDate: stats.mtime.toISOString(),
                                folder: folder
                            };
                        } catch (error) {
                            return null;
                        }
                    })
            );
            const validFiles = fileList.filter(file => file !== null);
            validFiles.sort((a, b) => {
                if (sortBy === 'name') {
                    const comparison = a.filename.localeCompare(b.filename);
                    return sortOrder === 'asc' ? comparison : -comparison;
                } else {
                    const comparison = new Date(a.uploadDate) - new Date(b.uploadDate);
                    return sortOrder === 'asc' ? comparison : -comparison;
                }
            });

            const startIndex = (parseInt(page) - 1) * parseInt(limit);
            const endIndex = startIndex + parseInt(limit);
            const paginatedFiles = validFiles.slice(startIndex, endIndex);

            res.json({
                success: true,
                files: paginatedFiles,
                total: validFiles.length,
                page: parseInt(page),
                totalPages: Math.ceil(validFiles.length / parseInt(limit)),
                folder: folder
            });
        } catch (error) {
            if (error.code === 'ENOENT') {
                res.json({
                    success: true,
                    files: [],
                    total: 0,
                    page: 1,
                    totalPages: 0,
                    folder: folder
                });
            } else {
                throw error;
            }
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosyalar listelenirken hata oluştu'
        });
    }
});
module.exports = router;