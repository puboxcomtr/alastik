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
const { moveLabelImagesLast } = require('../../utils/productImages');
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
/* Yeniden adlandırma eşlemesi (imagerenames koleksiyonu): eski hash adlı dosyalar ürün adına
 * çevrildiğinde kaynak URL'in sha1'i → yeni dosya adı burada tutulur. mirrorOne indirme öncesi
 * buna bakar; yoksa gece senkronu yeniden indirip hem eskiyi diriltir hem kopya üretirdi. */
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
    } catch { /* DB yoksa mevcut haritayla devam */ }
    return renameMap || new Map();
}

// ── Tazelik (freshness) altyapısı ─────────────────────────────────────────────
// Ayna kaynak URL'e göre önbelleklendiği için, kaynakta AYNI URL ile içerik değişince
// eski kopya kalıyordu. imagerenames kaydına kaynağın etag/lastModified'ı saklanır;
// refresh modunda (gece full sync) HTTP conditional istekle değişim algılanır:
// 304 → değişmemiş (bedava), 200 → değişmiş, yeni içerik YENİ isimle indirilir (cache kırılır).
const FRESHNESS_TTL_MS = 6 * 60 * 60 * 1000; // aynı görsel en fazla 6 saatte bir kontrol edilir

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
        // Bellek haritasını da güncelle ki aynı çalışmada tutarlı olsun
        if (fields.file && renameMap) renameMap.set(hash, fields.file);
    } catch { /* sessiz geç */ }
}

/**
 * Kaynak görselin değişip değişmediğini kontrol eder.
 * - Kayıtta etag/lastModified yoksa: yalnız HEAD ile temel bilgiyi kurar (indirmez), değişmemiş sayar.
 * - Varsa: conditional GET (If-None-Match/If-Modified-Since). 304 → değişmemiş; 200 → değişmiş (buffer döner).
 */
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
        // Kontrol başarısızsa mevcut kopya korunur (kırık görsel riskini almayız)
        return { changed: false, error: true };
    }
}

/** İndirilen buffer'ı optimize edip diske yazar; web yolunu döner. */
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
        } catch { /* optimizasyon hatası aynalamayı engellemesin */ }
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

    // İNDİRMEDEN ÖNCE: bu URL daha önce aynalandıysa mevcut dosyayı kullan — üzerine yazma,
    // kopya üretme (22 Ağu ezme vakası + ürün adına yeniden adlandırma eşlemesi).
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
        // refresh modunda ve son kontrol bayatsa: kaynakta içerik değişmiş mi bak
        if (opts.refresh) {
            const rec = await getMirrorRecord(hash);
            const bayat = !rec?.checkedAt || (Date.now() - new Date(rec.checkedAt).getTime() > FRESHNESS_TTL_MS);
            if (bayat) {
                const fresh = await checkSourceFreshness(url, rec);
                if (fresh.changed && fresh.buffer) {
                    // DEKUPE KORUMASI: yedeği (_orijinal/urun) olan = arka planı temizlenmiş
                    // dosya, DIA kaynağı değişse bile ÜZERİNE YAZILMAZ (yoksa dekupe kaybolur;
                    // 29 Ağu 2026 2.EL kaybı bu yüzdendi). Kayıt zamanı/etag güncellenir, dosya korunur.
                    const yedekYolu = path.join(path.dirname(MIRROR_ROOT), '_orijinal', MIRROR_DIR_NAME, path.basename(mevcutDosya));
                    if (fs.existsSync(yedekYolu)) {
                        await upsertMirrorRecord(hash, { file: mevcutDosya, checkedAt: new Date(), etag: fresh.etag, lastModified: fresh.lastModified });
                        return targetFor(mevcutDosya).webPath;
                    }
                    const ext = CONTENT_TYPE_EXTENSIONS[fresh.contentType] || extensionFromUrl(url) || path.extname(mevcutDosya);
                    const yeni = await bufferToMirror(fresh.buffer, url, ext, fileNameBase, reserved);
                    if (yeni) {
                        // Eski dosyayı sil (yeni isimle indirildi → URL değişti, cache kırılır)
                        fsp.unlink(path.join(MIRROR_ROOT, mevcutDosya)).catch(() => {});
                        await upsertMirrorRecord(hash, { file: yeni.fileName, etag: fresh.etag, lastModified: fresh.lastModified, checkedAt: new Date() });
                        return yeni.webPath;
                    }
                } else {
                    // Değişmemiş: sadece kontrol zamanını (ve varsa yeni etag temelini) güncelle
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
        if (!ext) return null; // görsel değil ya da tanınmayan tür

        // Optimize edip diske yazar (uzun kenar 1600px, png palette / jpeg mozjpeg)
        const yeni = await bufferToMirror(Buffer.from(response.data), url, ext, fileNameBase, reserved);
        if (!yeni) return null;

        // refresh modunda gelecekteki tazelik kontrolü için etag/lastModified temeli saklanır
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
/* Bastırma listesi (imagesuppress): temsili/istenmeyen görseller ürün listesine bir daha girmez.
 * DIA o ürüne YENİ (farklı URL'li) bir görsel eklerse o normal akışla gelir. */
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
    } catch { /* DB yoksa mevcutla devam */ }
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

        // Bastırılmış görsel: listeye alınmaz. İki kaynak: (1) DIA'nın temsili görsel klasörü
        // (URL'de 'temsili' geçer) — kalıcı kural; (2) imagesuppress listesi (elle bastırılanlar).
        if (isExternal(img.aws_url)) {
            if (/temsili/i.test(String(img.aws_url))) { dusurulen++; continue; }
            const h = crypto.createHash('sha1').update(String(img.aws_url)).digest('hex');
            if (suppress.hashes.has(h)) { dusurulen++; continue; }
        } else if (suppress.files.has(path.basename(String(img.aws_url)))) { dusurulen++; continue; }

        // Zaten yerel: dosya duruyorsa dokunma
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

    // AB etiketi görselleri ürün görsellerinin arkasına alınır
    return moveLabelImagesLast(result);
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
