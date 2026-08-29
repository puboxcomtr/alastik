const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();
const paths = require('../../../config/path');
const MEDIA_FOLDERS = paths.mediaFolders;
const getUploadPath = paths.getUploadPath;
const generateFileUrl = paths.generateFileUrl;

// Sharp.js import
const SimpleImageProcessor = require('../../../utils/SimpleImageProcessor');
const imageProcessor = new SimpleImageProcessor(paths.public);

// Yapay zekâ ile arka plan temizleme (ürün görselleri, toplu)
const backgroundRemoval = require('../../../services/media/BackgroundRemovalService');

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
            // Yeni temiz filename sistemi
            const folder = req.query.folder || req.body?.folder || 'general';
            const uploadPath = getUploadPath();
            const cleanFilename = imageProcessor.generateCleanFilename(file.originalname, uploadPath, folder);
            cb(null, cleanFilename);
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
    clearFolderCache(req.query.folder || req.body?.folder || 'general');
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
                // WebP URL'leri de ekle
                urls: SimpleImageProcessor.generateImageUrls(file.filename, folder, generateFileUrl),
                size: file.size,
                mimetype: file.mimetype,
                folder: folder,
                uploadDate: new Date().toISOString(),
                path: file.path
            };

            uploadedFiles.push(fileInfo);

            // Background'da WebP oluştur (kullanıcı beklemez)
            imageProcessor.processInBackground(file.path, file.filename, folder);
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

// Galeride gösterilecek görsel türleri
const GALLERY_IMAGE_EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png', '.gif', '.avif', '.svg'];

// Klasör taraması 6 binden fazla dosya içerebildiği için kısa süreli önbelleğe alınır
const FOLDER_CACHE_TTL_MS = 5 * 60 * 1000;
/* ---------- Ürün Görselleri kategori filtresi ----------
 * Görseller ürün kayıtlarından (diaData.m_resimler + customImages) kategoriye eşlenir.
 * Setler 10 dk önbelleklenir; 'eslesmeyen' = hiçbir ürünün referans etmediği dosyalar. */
const WebProductForMedia = require('../../../models/web/catalog/WebProduct');

const IKINCI_EL_OR = [
    { 'diaData.m_kategoriler.kategori_aciklama_1': /ikinci\s*el/i },
    { 'diaData.m_kategoriler.kategori_aciklama_2': /ikinci\s*el/i },
    { 'diaData.stokkartkodu': /^2\.?EL/i }
];
const PRODUCT_CATEGORY_FILTERS = {
    'sifir-lastik': { 'diaData.ozelkod7kodu': 'LASTİK', $nor: IKINCI_EL_OR },
    'ikinci-el-lastik': { $or: IKINCI_EL_OR, 'diaData.ozelkod7kodu': { $nin: ['JANT', '2.El Jant'] } },
    'jant': { 'diaData.ozelkod7kodu': 'JANT', $nor: IKINCI_EL_OR },
    'ikinci-el-jant': { 'diaData.ozelkod7kodu': '2.El Jant' },
    'zincir': { 'diaData.ozelkod7kodu': 'ZİNCİR' },
    'aksesuar': { 'diaData.m_kategoriler.kategori_aciklama_1': 'Aksesuar' },
    'hizmet': { 'diaData.m_kategoriler.kategori_aciklama_1': 'Hizmetlerimiz' }
};

const categoryFileCache = new Map();
const CATEGORY_CACHE_TTL_MS = 10 * 60 * 1000;

function collectProductFiles(p, set) {
    for (const r of p.diaData?.m_resimler || []) {
        const u = String(r?.aws_url || '');
        if (u.startsWith('/urun/')) set.add(u.slice('/urun/'.length));
    }
    for (const img of p.customData?.customImages || []) {
        const u = String(img?.url || '');
        if (u.startsWith('/urun/')) set.add(u.slice('/urun/'.length));
    }
    const f = String(p.customData?.featuredImage || '');
    if (f.startsWith('/urun/')) set.add(f.slice('/urun/'.length));
}

async function getCategoryFileSet(key) {
    const cached = categoryFileCache.get(key);
    if (cached && Date.now() - cached.at < CATEGORY_CACHE_TTL_MS) return cached.set;
    const query = key === 'tum-urunler' ? {} : PRODUCT_CATEGORY_FILTERS[key];
    if (!query) return null;
    const set = new Set();
    const cursor = WebProductForMedia.find(query, {
        'diaData.m_resimler.aws_url': 1,
        'customData.customImages.url': 1,
        'customData.featuredImage': 1
    }).lean().cursor();
    for await (const p of cursor) collectProductFiles(p, set);
    categoryFileCache.set(key, { at: Date.now(), set });
    return set;
}

/* ---------- Dekupe (arka plan temizleme) durumu ----------
 * _orijinal yedeği olan VE içeriği yedekten farklı olan dosya "işlenmiş" kabul edilir.
 * Küme 10 dk önbelleklenir; toplu geri yükleme / temizleme sonrası düşürülür. */
const BACKUP_ROOT = path.join(paths.public, '_orijinal');
let dekupeCache = null;

async function getProcessedSet(folder) {
    if (dekupeCache && dekupeCache.folder === folder && Date.now() - dekupeCache.at < 10 * 60 * 1000) {
        return dekupeCache.set;
    }
    const set = new Set();
    const backupDir = path.join(BACKUP_ROOT, folder);
    const uploadDir = getUploadPath(folder);
    const walk = async (dir, rel = '') => {
        let entries = [];
        try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
        for (const e of entries) {
            const r = rel ? path.join(rel, e.name) : e.name;
            if (e.isDirectory()) { await walk(path.join(dir, e.name), r); continue; }
            try {
                const bakPath = path.join(dir, e.name);
                const curPath = path.join(uploadDir, r);
                const [bs, cs] = await Promise.all([fs.stat(bakPath), fs.stat(curPath)]);
                if (bs.size !== cs.size) { set.add(r); continue; }
                const [bb, cb] = await Promise.all([fs.readFile(bakPath), fs.readFile(curPath)]);
                if (!bb.equals(cb)) set.add(r);
            } catch { /* mevcut dosya yoksa islenmis sayilmaz */ }
        }
    };
    await walk(backupDir);
    dekupeCache = { folder, at: Date.now(), set };
    return set;
}

function clearDekupeCache() { dekupeCache = null; }

const folderCache = new Map();

/**
 * Klasörü (alt klasörleriyle birlikte) tarar; her dosya için göreli yol, boyut ve tarih döndürür.
 * Aynalanan ürün görselleri urun/<önek>/<dosya> düzeninde durduğu için 2 seviye taranır.
 */
async function scanFolder(uploadPath, depth = 2) {
    const entries = await fs.readdir(uploadPath, { withFileTypes: true });
    const results = [];

    for (const entry of entries) {
        const full = path.join(uploadPath, entry.name);

        if (entry.isDirectory()) {
            if (depth <= 0) continue;
            const nested = await scanFolder(full, depth - 1);
            nested.forEach(item => results.push({ ...item, relPath: path.join(entry.name, item.relPath) }));
            continue;
        }

        if (!GALLERY_IMAGE_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) continue;

        try {
            const stats = await fs.stat(full);
            results.push({ relPath: entry.name, size: stats.size, mtime: stats.mtime });
        } catch {
            // okunamayan dosya atlanır
        }
    }

    return results;
}

async function getFolderFiles(folder, uploadPath) {
    const cached = folderCache.get(folder);
    if (cached && Date.now() - cached.at < FOLDER_CACHE_TTL_MS) return cached.files;

    const files = await scanFolder(uploadPath);
    folderCache.set(folder, { at: Date.now(), files });
    return files;
}

/** Yükleme/silme sonrası listenin tazelenmesi için önbelleği düşürür */
function clearFolderCache(folder) {
    if (folder) folderCache.delete(folder); else folderCache.clear();
}

router.get('/list', async (req, res) => {
    try {
        const {
            folder = 'general',
            productCategory = '',
            dekupe = '',
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
            let scanned = await getFolderFiles(folder, uploadPath);

            // Ürün Görselleri: dekupe (arka plan temizleme) durumu filtresi + rozet bilgisi
            let processedSet = null;
            if (folder === 'urun' && (dekupe || true)) {
                processedSet = await getProcessedSet(folder);
                if (dekupe === 'islenmis') scanned = scanned.filter(f => processedSet.has(f.relPath));
                else if (dekupe === 'islenmemis') scanned = scanned.filter(f => !processedSet.has(f.relPath));
            }

            // Ürün Görselleri: kategori filtresi (görsel → ürün eşlemesinden)
            if (folder === 'urun' && productCategory) {
                if (productCategory === 'eslesmeyen') {
                    const all = await getCategoryFileSet('tum-urunler');
                    scanned = scanned.filter(f => !all.has(f.relPath));
                } else {
                    const allow = await getCategoryFileSet(productCategory);
                    if (allow) scanned = scanned.filter(f => allow.has(f.relPath));
                }
            }
            const term = String(search).toLowerCase();

            // Aynı görselin farklı türleri tek satır gösterilir; webp tercih edilir
            const byBaseName = new Map();
            for (const item of scanned) {
                if (term && !item.relPath.toLowerCase().includes(term)) continue;

                const key = path.join(path.dirname(item.relPath), path.basename(item.relPath, path.extname(item.relPath)));
                const current = byBaseName.get(key);
                const isWebp = path.extname(item.relPath).toLowerCase() === '.webp';

                if (!current || (isWebp && path.extname(current.relPath).toLowerCase() !== '.webp')) {
                    byBaseName.set(key, item);
                }
            }

            const validFiles = [...byBaseName.values()].map(item => ({
                id: item.relPath,
                filename: path.basename(item.relPath),
                url: generateFileUrl(item.relPath, folder),
                dekupe: processedSet ? processedSet.has(item.relPath) : undefined,
                size: item.size,
                uploadDate: item.mtime.toISOString(),
                folder: folder
            }));

            // Kayıtlı açıklama bilgilerini ekle (alt, başlık vb.)
            try {
                const MediaMeta = require('../../../models/admin/design/MediaMeta');
                const metas = await MediaMeta.find({ folder, filename: { $in: validFiles.map(f => f.id) } }).lean();
                const metaMap = new Map(metas.map(m => [m.filename, m]));
                validFiles.forEach(f => {
                    const m = metaMap.get(f.id);
                    f.alt = m?.alt || '';
                    f.title = m?.title || '';
                    f.caption = m?.caption || '';
                    f.description = m?.description || '';
                });
            } catch (error) {
                console.error('Medya bilgileri okunamadı:', error.message);
            }

            validFiles.sort((a, b) => {
                if (sortBy === 'name') {
                    const comparison = a.filename.localeCompare(b.filename);
                    return sortOrder === 'asc' ? comparison : -comparison;
                }
                const comparison = new Date(a.uploadDate) - new Date(b.uploadDate);
                return sortOrder === 'asc' ? comparison : -comparison;
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

/**
 * Dosya bilgilerini güncelle (alt metin, başlık, açıklama).
 * Dosyanın kendisi değişmez; yalnızca açıklama bilgileri kaydedilir.
 */
router.patch('/meta', async (req, res) => {
    try {
        const { folder, filename, alt, title, caption, description } = req.body;

        if (!folder || !filename) {
            return res.status(400).json({ success: false, message: 'Klasör ve dosya adı zorunludur' });
        }
        if (!MEDIA_FOLDERS[folder]) {
            return res.status(400).json({ success: false, message: `Geçersiz klasör: ${folder}` });
        }

        const MediaMeta = require('../../../models/admin/design/MediaMeta');
        const set = {};
        if (alt !== undefined) set.alt = String(alt).trim();
        if (title !== undefined) set.title = String(title).trim();
        if (caption !== undefined) set.caption = String(caption).trim();
        if (description !== undefined) set.description = String(description).trim();

        const kayit = await MediaMeta.findOneAndUpdate(
            { folder, filename },
            { $set: set },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).lean();

        res.json({ success: true, message: 'Dosya bilgileri güncellendi', data: kayit });
    } catch (error) {
        console.error('Medya bilgisi güncelleme hatası:', error);
        res.status(500).json({ success: false, message: 'Dosya bilgileri güncellenemedi' });
    }
});

/**
 * POST /remove-background — seçili görsellerin arka planını yapay zekâ ile temizler (beyaz),
 * dosyanın üzerine yazar; orijinal _orijinal/ altına yedeklenir. body: { folder, files: [relPath] }
 */
router.post('/remove-background', async (req, res) => {
    try {
        const { folder = 'urun', files } = req.body || {};
        const result = await backgroundRemoval.removeBackgrounds(folder, files);
        clearFolderCache(folder);
        clearDekupeCache();
        res.json({ success: true, message: `${result.processed} görselin arka planı temizlendi`, ...result });
    } catch (error) {
        const status = error.status || 500;
        if (status >= 500) console.error('Arka plan temizleme hatası:', error);
        res.status(status).json({ success: false, message: error.message || 'Arka plan temizlenemedi' });
    }
});

/** POST /restore-original-bulk — seçili görsellerin orijinallerini topluca geri yükler */
router.post('/restore-original-bulk', async (req, res) => {
    try {
        const { folder = 'urun', files } = req.body || {};
        if (!Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ success: false, message: 'En az bir dosya seçilmelidir' });
        }
        const results = [];
        for (const file of files.slice(0, 200)) {
            try {
                await backgroundRemoval.restoreOriginal(folder, file);
                results.push({ file, ok: true });
            } catch (error) {
                results.push({ file, ok: false, error: error.message });
            }
        }
        clearFolderCache(folder);
        clearDekupeCache();
        const ok = results.filter(r => r.ok).length;
        res.json({ success: true, message: `${ok} görsel orijinaline döndürüldü`, restored: ok, failed: results.length - ok, results });
    } catch (error) {
        console.error('Toplu geri yükleme hatası:', error);
        res.status(500).json({ success: false, message: 'Toplu geri yükleme başarısız' });
    }
});

/** POST /restore-original — arka planı temizlenmiş görselin yedekteki orijinalini geri yükler */
router.post('/restore-original', async (req, res) => {
    try {
        const { folder = 'urun', file } = req.body || {};
        const result = await backgroundRemoval.restoreOriginal(folder, file);
        clearFolderCache(folder);
        clearDekupeCache();
        res.json({ success: true, message: 'Orijinal görsel geri yüklendi', ...result });
    } catch (error) {
        const status = error.status || 500;
        if (status >= 500) console.error('Orijinal geri yükleme hatası:', error);
        res.status(status).json({ success: false, message: error.message || 'Orijinal geri yüklenemedi' });
    }
});

router.delete('/:fileId(*)', async (req, res) => {
    try {
        const { fileId } = req.params;

        const filename = fileId;

        const folders = Object.keys(MEDIA_FOLDERS);
        let deleted = false;
        let deletedFolder = '';

        for (const folder of folders) {
            const uploadPath = getUploadPath(folder);
            const filePath = path.join(uploadPath, filename);

            // Güvenlik: hedef dosya klasörün dışına çıkamaz (../ denemeleri)
            if (!path.resolve(filePath).startsWith(path.resolve(uploadPath) + path.sep)) {
                continue;
            }

            try {
                await fs.access(filePath);
                await fs.unlink(filePath);
                deleted = true;
                deletedFolder = folder;
                clearFolderCache(folder);
                break;
            } catch (error) {
                continue;
            }
        }
        if (deleted) {
            res.json({
                success: true,
                message: 'Dosya başarıyla silindi',
                folder: deletedFolder,
                filename: filename
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Dosya bulunamadı'
            });
        }
    } catch (error) {
        console.error('Dosya silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Dosya silinirken hata oluştu'
        });
    }
});

module.exports = router;