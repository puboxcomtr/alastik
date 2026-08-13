/**
 * Görsel Aynalama (Mirror) Servisi
 *
 * Tedarikçi/DIA sunucularındaki ürün görsellerini kendi sunucumuza indirir ve
 * vitrinin bu görselleri kendi alan adımızdan servis etmesini sağlar.
 *
 * - Dosya adı kaynak URL'den türetilir (sha1) → aynı görsel iki kez indirilmez.
 * - Dosyalar ilk iki hex karakterine göre alt klasörlere dağıtılır (tek klasörde
 *   on binlerce dosya olmasın diye).
 * - Zaten indirilmiş görselde ağ isteği yapılmaz, yalnızca disk kontrolü yapılır;
 *   bu sayede senkronların tekrar tekrar çalışması ucuzdur.
 */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

// Görseller api/public altında tutulur; her sitenin nginx'i bu klasörü kendi
// alan adından servis eder (adreste ek bir önek görünmez: /urun/<...>)
const PUBLIC_DIR = path.join(__dirname, '../../../public');
const MIRROR_DIR_NAME = 'urun';
const MIRROR_ROOT = path.join(PUBLIC_DIR, MIRROR_DIR_NAME);

const DOWNLOAD_TIMEOUT_MS = 20000;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
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

/** Kaynak URL dış bir adres mi (aynalanması gerekir mi)? */
function isExternal(url) {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
}

/** URL'den uzantı çıkarır; bulunamazsa null döner */
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

/** Ürün adından okunabilir dosya adı üretir (Türkçe karakterler Latin karşılığına çevrilir) */
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

/**
 * Ürün adına göre boştaki ilk dosya adını bulur.
 * İlk görsel: <slug>.<ext>, sonrakiler: <slug>-1.<ext>, <slug>-2.<ext> ...
 * Aynı adı taşıyan farklı ürünlerde numara devam eder; böylece çakışma olmaz.
 * `reserved` aynı çalışma içinde henüz diske yazılmamış adları da kapsar.
 */
function nextAvailableName(slug, ext, reserved = new Set()) {
    const isFree = (name) => !reserved.has(name) &&
        !ALLOWED_EXTENSIONS.some(e => fs.existsSync(path.join(MIRROR_ROOT, `${name}${e}`)));

    if (isFree(slug)) return `${slug}${ext}`;

    for (let i = 1; i < 5000; i++) {
        const candidate = `${slug}-${i}`;
        if (isFree(candidate)) return `${candidate}${ext}`;
    }

    // Aşırı uç durum: zaman damgasıyla benzersizleştir
    return `${slug}-${Date.now()}${ext}`;
}

/** Dosya adından disk ve web yolunu üretir */
function targetFor(fileName) {
    return {
        fileName,
        diskPath: path.join(MIRROR_ROOT, fileName),
        webPath: `/${MIRROR_DIR_NAME}/${fileName}`
    };
}

/** Eski (hash tabanlı) yerleşimde bu URL indirilmiş mi? Geçiş döneminde kullanılır */
function findExisting(url) {
    const hash = crypto.createHash('sha1').update(String(url)).digest('hex');
    const shard = hash.slice(0, 2);

    for (const ext of ALLOWED_EXTENSIONS) {
        const rel = path.join(shard, `${hash}${ext}`);
        if (fs.existsSync(path.join(MIRROR_ROOT, rel))) return `/${MIRROR_DIR_NAME}/${shard}/${hash}${ext}`;
    }
    return null;
}

/**
 * Tek bir görseli indirir. Zaten varsa indirmez.
 * Başarısız olursa null döner — çağıran taraf kaynak URL'yi korur.
 */
async function mirrorOne(url, fileNameBase = null, reserved = new Set()) {
    if (!isExternal(url)) return null;

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
        if (!ext) return null; // görsel değil ya da tanınmayan tür

        const buffer = Buffer.from(response.data);
        if (!buffer.length || buffer.length > MAX_BYTES) return null;

        const slug = fileNameBase ? slugify(fileNameBase) : null;
        const fileName = slug
            ? nextAvailableName(slug, ext, reserved)
            : `${crypto.createHash('sha1').update(url).digest('hex')}${ext}`;
        reserved.add(path.basename(fileName, path.extname(fileName)));

        const target = targetFor(fileName);
        await fsp.mkdir(MIRROR_ROOT, { recursive: true });

        // Yarım dosya servis edilmesin: önce geçici ada yaz, sonra taşı
        const tmpPath = `${target.diskPath}.${process.pid}.tmp`;
        await fsp.writeFile(tmpPath, buffer);
        await fsp.rename(tmpPath, target.diskPath);

        return target.webPath;
    } catch {
        return null;
    }
}

/**
 * Bir ürünün görsellerini indirir ve YEREL YOLLARINI döndürür.
 * Dosya adları ürün adından türetilir: <slug>.jpg, <slug>-1.jpg, <slug>-2.jpg ...
 * Zaten yerel olan (\/urun\/ ile başlayan) görseller yeniden indirilmez.
 *
 * İndirilemeyen dış adresler diziden DÜŞÜRÜLÜR: kaynak sunucu 403/404 verdiğinde
 * eski davranış adresi olduğu gibi saklıyordu ve vitrinde kırık görsel çıkıyordu.
 * Adres sonradan erişilebilir hale gelirse bir sonraki senkronda indirilip geri döner.
 *
 * @param {Array} images  m_resimler benzeri dizi ({ aws_url, source_url })
 * @param {string} productName Ürün adı (dosya adı bundan türetilir)
 * @returns {Promise<Array>} İndirilenlerin aws_url'i yerel yola çevrilmiş dizi
 */
async function mirrorProductImages(images, productName) {
    if (!Array.isArray(images) || images.length === 0) return images || [];

    const reserved = new Set();
    const result = [];
    let dusurulen = 0;

    for (const img of images) {
        if (!img || !img.aws_url) { result.push(img); continue; }

        // Zaten yerel: dosya duruyorsa dokunma
        if (!isExternal(img.aws_url)) {
            result.push(img);
            continue;
        }

        const local = await mirrorOne(img.aws_url, productName, reserved);

        if (local) {
            result.push({ ...img, aws_url: local, source_url: img.source_url || img.aws_url });
        } else {
            dusurulen++;
        }
    }

    if (dusurulen) {
        console.warn(`[ImageMirror] "${productName}" için indirilemeyen ${dusurulen} görsel listeden çıkarıldı`);
    }

    return result;
}

/**
 * Ürün bağlamı olmayan tekil görseller için (panelden elle eklenen adresler).
 * Dönüş: { <kaynakUrl>: <yerelYol> }
 */
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
