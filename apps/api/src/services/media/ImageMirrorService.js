
const fs = require('fs');
const { moveLabelImagesLast } = require('../../utils/productImages');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const PUBLIC_DIR = path.join(__dirname, '../../../public');
const MIRROR_DIR_NAME = 'urun';
const MIRROR_ROOT = path.join(PUBLIC_DIR, MIRROR_DIR_NAME);

const DOWNLOAD_TIMEOUT_MS = 20000;
const MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_CONCURRENCY = 8;

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif'];
const CONTENT_TYPE_EXTENSIONS = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/bmp': '.bmp',
    'image/avif': '.avif'
};

function isExternal(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function extensionFromUrl(url) {
    try {
        const pathname = new URL(url).pathname;
        const ext = path.extname(pathname).toLowerCase();
        return ALLOWED_EXTENSIONS.includes(ext) ? ext : null;
    } catch {
        return null;
    }
}

const TR_CHAR_MAP = {
    'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ǧ': 'g', 'Ǧ': 'g',
    'ı': 'i', 'I': 'i', 'İ': 'i', 'ö': 'o', 'Ö': 'o',
    'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u',
    'â': 'a', 'Â': 'a', 'î': 'i', 'Î': 'i', 'û': 'u', 'Û': 'u'
};

function slugify(text) {
    if (!text) return '';
    return String(text)
        .replace(/[çÇğĞǧǦıIİöÖşŞüÜâÂîÎûÛ]/g, ch => TR_CHAR_MAP[ch])
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 90);
}

function nextAvailableName(slug, ext, reserved = new Set()) {
    const isFree = (name) => !reserved.has(name) &&
        !ALLOWED_EXTENSIONS.some(e => fs.existsSync(path.join(MIRROR_ROOT, `${name}${e}`)));

    if (isFree(slug)) return `${slug}${ext}`;

    for (let i = 1; i < 5000; i++) {
        const candidate = `${slug}-${i}`;
        if (isFree(candidate)) return `${candidate}${ext}`;
    }

    return `${slug}-${Date.now()}${ext}`;
}

function targetFor(fileName) {
    return {
        fileName,
        diskPath: path.join(MIRROR_ROOT, fileName),
        webPath: `/${MIRROR_DIR_NAME}/${fileName}`
    };
}

function findExisting(url) {
    const hash = crypto.createHash('sha1').update(String(url)).digest('hex');
    const shard = hash.slice(0, 2);

    for (const ext of ALLOWED_EXTENSIONS) {
        const rel = path.join(shard, `${hash}${ext}`);
        if (fs.existsSync(path.join(MIRROR_ROOT, rel))) return `/${MIRROR_DIR_NAME}/${shard}/${hash}${ext}`;
    }
    return null;
}

let renameMap = null;
let renameMapAt = 0;
async function ensureRenameMap() {
    if (renameMap && Date.now() - renameMapAt < 10 * 60 * 1000) return renameMap;
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection?.readyState === 1) {
            const rows = await mongoose.connection.db.collection('imagerenames')
                .find({}, { projection: { hash: 1, file: 1 } }).toArray();
            renameMap = new Map(rows.map(r => [r.hash, r.file]));
            renameMapAt = Date.now();
        }
    } catch {  }
    return renameMap || new Map();
}

const FRESHNESS_TTL_MS = 6 * 60 * 60 * 1000;

async function getMirrorRecord(hash) {
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection?.readyState !== 1) return null;
        return await mongoose.connection.db.collection('imagerenames').findOne({ hash });
    } catch { return null; }
}

async function upsertMirrorRecord(hash, fields) {
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection?.readyState !== 1) return;
        await mongoose.connection.db.collection('imagerenames')
            .updateOne({ hash }, { $set: { hash, ...fields } }, { upsert: true });
        if (fields.file && renameMap) renameMap.set(hash, fields.file);
    } catch {  }
}

async function checkSourceFreshness(url, rec) {
    const baseHeaders = { 'User-Agent': 'AlastikImageMirror/1.0' };
    try {
        if (!rec?.etag && !rec?.lastModified) {
            const head = await axios.head(url, { timeout: DOWNLOAD_TIMEOUT_MS, validateStatus: s => s === 200, headers: baseHeaders });
            return { changed: false, etag: head.headers['etag'] || null, lastModified: head.headers['last-modified'] || null };
        }
        const headers = { ...baseHeaders };
        if (rec.etag) headers['If-None-Match'] = rec.etag;
        if (rec.lastModified) headers['If-Modified-Since'] = rec.lastModified;
        const resp = await axios.get(url, {
            responseType: 'arraybuffer', timeout: DOWNLOAD_TIMEOUT_MS,
            maxContentLength: MAX_BYTES, maxBodyLength: MAX_BYTES,
            validateStatus: s => s === 200 || s === 304, headers
        });
        if (resp.status === 304) return { changed: false };
        return {
            changed: true,
            buffer: Buffer.from(resp.data),
            contentType: String(resp.headers['content-type'] || '').split(';')[0].trim().toLowerCase(),
            etag: resp.headers['etag'] || null,
            lastModified: resp.headers['last-modified'] || null
        };
    } catch {
        return { changed: false, error: true };
    }
}

async function bufferToMirror(buffer, url, ext, fileNameBase, reserved) {
    if (!buffer.length || buffer.length > MAX_BYTES) return null;
    if (buffer.length > 400 * 1024 && ['.png', '.jpg', '.jpeg'].includes(ext)) {
        try {
            const sharp = require('sharp');
            let islem = sharp(buffer, { failOn: 'none' })
                .rotate()
                .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true });
            islem = ext === '.png' ? islem.png({ palette: true, quality: 80, effort: 7 }) : islem.jpeg({ quality: 82, mozjpeg: true });
            const optimized = await islem.toBuffer();
            if (optimized.length < buffer.length) buffer = optimized;
        } catch {  }
    }
    const slug = fileNameBase ? slugify(fileNameBase) : null;
    const fileName = slug
        ? nextAvailableName(slug, ext, reserved)
        : `${crypto.createHash('sha1').update(url).digest('hex')}${ext}`;
    reserved.add(path.basename(fileName, path.extname(fileName)));
    const target = targetFor(fileName);
    await fsp.mkdir(MIRROR_ROOT, { recursive: true });
    const tmpPath = `${target.diskPath}.${process.pid}.tmp`;
    await fsp.writeFile(tmpPath, buffer);
    await fsp.rename(tmpPath, target.diskPath);
    return { webPath: target.webPath, fileName };
}

async function mirrorOne(url, fileNameBase = null, reserved = new Set(), opts = {}) {
    if (!isExternal(url)) return null;

    const hash = crypto.createHash('sha1').update(String(url)).digest('hex');
    const map = await ensureRenameMap();
    const mapped = map.get(hash);
    let mevcutDosya = null;
    if (mapped && fs.existsSync(path.join(MIRROR_ROOT, mapped))) {
        mevcutDosya = mapped;
    } else {
        for (const ext of ALLOWED_EXTENSIONS) {
            if (fs.existsSync(path.join(MIRROR_ROOT, `${hash}${ext}`))) { mevcutDosya = `${hash}${ext}`; break; }
        }
    }

    if (mevcutDosya) {
        if (opts.refresh) {
            const rec = await getMirrorRecord(hash);
            const bayat = !rec?.checkedAt || (Date.now() - new Date(rec.checkedAt).getTime() > FRESHNESS_TTL_MS);
            if (bayat) {
                const fresh = await checkSourceFreshness(url, rec);
                if (fresh.changed && fresh.buffer) {
                    const yedekYolu = path.join(path.dirname(MIRROR_ROOT), '_orijinal', MIRROR_DIR_NAME, path.basename(mevcutDosya));
                    if (fs.existsSync(yedekYolu)) {
                        await upsertMirrorRecord(hash, { file: mevcutDosya, checkedAt: new Date(), etag: fresh.etag, lastModified: fresh.lastModified });
                        return targetFor(mevcutDosya).webPath;
                    }
                    const ext = CONTENT_TYPE_EXTENSIONS[fresh.contentType] || extensionFromUrl(url) || path.extname(mevcutDosya);
                    const yeni = await bufferToMirror(fresh.buffer, url, ext, fileNameBase, reserved);
                    if (yeni) {
                        fsp.unlink(path.join(MIRROR_ROOT, mevcutDosya)).catch(() => {});
                        await upsertMirrorRecord(hash, { file: yeni.fileName, etag: fresh.etag, lastModified: fresh.lastModified, checkedAt: new Date() });
                        return yeni.webPath;
                    }
                } else {
                    await upsertMirrorRecord(hash, { file: mevcutDosya, checkedAt: new Date(), ...(fresh.etag ? { etag: fresh.etag } : {}), ...(fresh.lastModified ? { lastModified: fresh.lastModified } : {}) });
                }
            }
        }
        return `/${MIRROR_DIR_NAME}/${mevcutDosya}`;
    }

    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: DOWNLOAD_TIMEOUT_MS,
            maxContentLength: MAX_BYTES,
            maxBodyLength: MAX_BYTES,
            validateStatus: status => status === 200,
            headers: { 'User-Agent': 'AlastikImageMirror/1.0' }
        });

        const contentType = String(response.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
        const ext = CONTENT_TYPE_EXTENSIONS[contentType] || extensionFromUrl(url);
        if (!ext) return null;

        const yeni = await bufferToMirror(Buffer.from(response.data), url, ext, fileNameBase, reserved);
        if (!yeni) return null;

        if (opts.refresh) {
            await upsertMirrorRecord(hash, {
                file: yeni.fileName,
                etag: response.headers['etag'] || null,
                lastModified: response.headers['last-modified'] || null,
                checkedAt: new Date()
            });
        }

        return yeni.webPath;
    } catch {
        return null;
    }
}

let suppressSets = null;
let suppressAt = 0;
async function ensureSuppress() {
    if (suppressSets && Date.now() - suppressAt < 10 * 60 * 1000) return suppressSets;
    try {
        const mongoose = require('mongoose');
        if (mongoose.connection?.readyState === 1) {
            const rows = await mongoose.connection.db.collection('imagesuppress')
                .find({}, { projection: { hash: 1, file: 1 } }).toArray();
            suppressSets = {
                hashes: new Set(rows.map(r => r.hash).filter(Boolean)),
                files: new Set(rows.map(r => r.file).filter(Boolean))
            };
            suppressAt = Date.now();
        }
    } catch {  }
    return suppressSets || { hashes: new Set(), files: new Set() };
}

async function mirrorProductImages(images, productName, opts = {}) {
    if (!Array.isArray(images) || images.length === 0) return images || [];

    const reserved = new Set();
    const result = [];
    let dusurulen = 0;
    const suppress = await ensureSuppress();

    for (const img of images) {
        if (!img || !img.aws_url) { result.push(img); continue; }

        if (isExternal(img.aws_url)) {
            if (/temsili/i.test(String(img.aws_url))) { dusurulen++; continue; }
            const h = crypto.createHash('sha1').update(String(img.aws_url)).digest('hex');
            if (suppress.hashes.has(h)) { dusurulen++; continue; }
        } else if (suppress.files.has(path.basename(String(img.aws_url)))) { dusurulen++; continue; }

        if (!isExternal(img.aws_url)) {
            result.push(img);
            continue;
        }

        const local = await mirrorOne(img.aws_url, productName, reserved, opts);

        if (local) {
            result.push({ ...img, aws_url: local, source_url: img.source_url || img.aws_url });
        } else {
            dusurulen++;
        }
    }

    if (dusurulen) {
        console.warn(`[ImageMirror] "${productName}" için indirilemeyen ${dusurulen} görsel listeden çıkarıldı`);
    }

    return moveLabelImagesLast(result);
}

async function mirrorMany(urls, nameBase = null) {
    const unique = [...new Set((urls || []).filter(isExternal))];
    const result = {};
    const reserved = new Set();

    for (const url of unique) {
        const local = await mirrorOne(url, nameBase, reserved);
        if (local) result[url] = local;
    }

    return result;
}

module.exports = {
    isExternal,
    findExisting,
    mirrorOne,
    mirrorMany,
    mirrorProductImages,
    MIRROR_DIR_NAME
};
