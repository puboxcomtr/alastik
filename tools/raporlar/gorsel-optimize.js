/**
 * /urun görsel toplu optimizasyonu (9 Eyl 2026 — disk krizi çözümü).
 * Büyükten küçüğe: >400KB png/jpg dosyaları yerinde optimize eder
 * (uzun kenar 1600px, png palette q80 / jpeg mozjpeg q82).
 * Yalnız %10+ küçülen dosya değiştirilir. Kesilirse yeniden çalıştırılabilir
 * (optimize edilmiş dosyalar eşiğin altına indiği için tekrar işlenmez).
 * Kullanım: node gorsel-optimize.js  (log: gorsel-optimize.log)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('/var/www/alastik/apps/api/node_modules/sharp');

const ROOT = '/var/www/alastik/apps/api/public/urun';
const LOG = path.join(__dirname, 'gorsel-optimize.log');
const MIN_BYTES = 400 * 1024;
const MAX_EDGE = 1600;
const CONCURRENCY = 3;

const log = (m) => fs.appendFileSync(LOG, `${new Date().toISOString()} ${m}\n`);

async function optimizeOne(file) {
    const before = fs.statSync(file).size;
    if (before < MIN_BYTES) return { skipped: true, saved: 0 };

    const ext = path.extname(file).toLowerCase();
    const tmp = `${file}.opt.tmp`;
    let pipeline = sharp(file, { failOn: 'none' })
        .rotate()
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true });

    if (ext === '.png') {
        pipeline = pipeline.png({ palette: true, quality: 80, effort: 7 });
    } else {
        pipeline = pipeline.jpeg({ quality: 82, mozjpeg: true });
    }

    await pipeline.toFile(tmp);
    const after = fs.statSync(tmp).size;

    if (after < before * 0.9) {
        fs.renameSync(tmp, file);
        return { skipped: false, saved: before - after };
    }
    fs.unlinkSync(tmp);
    return { skipped: true, saved: 0 };
}

(async () => {
    log('=== BASLADI ===');
    // Buyukten kucuge liste (disk en hizli rahatlasin)
    const listRaw = execSync(
        `find ${ROOT} -type f \\( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' \\) -size +400k -printf '%s %p\\n' | sort -rn`,
        { maxBuffer: 256 * 1024 * 1024 }
    ).toString().trim();
    const files = listRaw ? listRaw.split('\n').map(l => l.slice(l.indexOf(' ') + 1)) : [];
    log(`aday dosya: ${files.length}`);

    let done = 0, changed = 0, savedTotal = 0, errors = 0;
    let index = 0;

    async function worker() {
        while (index < files.length) {
            const file = files[index++];
            try {
                const r = await optimizeOne(file);
                if (!r.skipped) { changed++; savedTotal += r.saved; }
            } catch (e) {
                errors++;
                try { fs.existsSync(`${file}.opt.tmp`) && fs.unlinkSync(`${file}.opt.tmp`); } catch {}
            }
            done++;
            if (done % 500 === 0) {
                log(`ilerleme: ${done}/${files.length} | degisen: ${changed} | kazanc: ${(savedTotal / 1024 / 1024 / 1024).toFixed(2)} GB | hata: ${errors}`);
            }
        }
    }

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    log(`=== BITTI === islenen: ${done} | degisen: ${changed} | kazanc: ${(savedTotal / 1024 / 1024 / 1024).toFixed(2)} GB | hata: ${errors}`);
})().catch(e => log(`KRITIK HATA: ${e.message}`));
