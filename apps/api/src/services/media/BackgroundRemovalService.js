const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { spawn } = require('child_process');
const paths = require('../../config/path');

const REPO_ROOT = path.resolve(paths.root, '../..');
const PYTHON_BIN = process.env.REMBG_PYTHON || path.join(REPO_ROOT, 'tools', 'rembg-venv', 'bin', 'python');
const SCRIPT_PATH = path.join(paths.root, 'scripts', 'remove_bg.py');
const BACKUP_DIR_NAME = '_orijinal';
const WATERMARK_DIR_NAME = 'filigran';
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILES = parseInt(process.env.REMBG_MAX_FILES_PER_REQUEST, 10) || 20;
const MODEL_LOAD_TIMEOUT_MS = 60 * 1000;
const PER_FILE_TIMEOUT_MS = parseInt(process.env.REMBG_FILE_TIMEOUT_MS, 10) || 30 * 1000;

class BackgroundRemovalError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

function resolveFile(folder, relPath) {
    if (!paths.mediaFolders[folder]) throw new BackgroundRemovalError(`Geçersiz klasör: ${folder}`);
    const uploadPath = paths.getUploadPath(folder);
    const normalized = path.normalize(String(relPath || '')).replace(/^(\.\.(\/|\\|$))+/, '');
    const absPath = path.resolve(uploadPath, normalized);
    if (!absPath.startsWith(path.resolve(uploadPath) + path.sep)) {
        throw new BackgroundRemovalError(`Geçersiz dosya yolu: ${relPath}`);
    }
    const ext = path.extname(absPath).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        throw new BackgroundRemovalError(`Desteklenmeyen dosya türü: ${relPath}`);
    }
    return { folder, relPath: normalized, absPath, ext, uploadPath };
}

function backupPathFor(file) {
    return path.join(paths.public, BACKUP_DIR_NAME, file.folder, file.relPath);
}

async function ensureBackup(file) {
    const dest = backupPathFor(file);
    if (fs.existsSync(dest)) return false;
    await fsp.mkdir(path.dirname(dest), { recursive: true });
    await fsp.copyFile(file.absPath, dest);
    return true;
}

async function purgeDerivatives(file) {
    const webpSibling = file.absPath.replace(/\.[^.]+$/, '.webp');
    if (webpSibling !== file.absPath && fs.existsSync(webpSibling)) {
        await fsp.unlink(webpSibling).catch(() => { });
    }

    const watermarkRoot = path.join(paths.public, WATERMARK_DIR_NAME);
    if (!fs.existsSync(watermarkRoot)) return;
    const sites = await fsp.readdir(watermarkRoot).catch(() => []);
    for (const site of sites) {
        const cached = path.join(watermarkRoot, site, paths.mediaFolders[file.folder], file.relPath);
        if (fs.existsSync(cached)) await fsp.unlink(cached).catch(() => { });
    }
}

function runWorker(jobs) {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(PYTHON_BIN)) {
            return reject(new BackgroundRemovalError(`Arka plan temizleme ortamı bulunamadı (${PYTHON_BIN})`, 500));
        }

        const results = new Map();
        let buffer = '';
        let ready = false;
        let settled = false;

        const child = spawn(PYTHON_BIN, [SCRIPT_PATH], { stdio: ['pipe', 'pipe', 'pipe'] });
        let stderr = '';

        const finish = (err) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            if (err) return reject(err);
            resolve(results);
        };

        let timer = setTimeout(() => {
            child.kill('SIGKILL');
            finish(new BackgroundRemovalError('Yapay zekâ modeli zamanında yüklenemedi', 504));
        }, MODEL_LOAD_TIMEOUT_MS);

        child.stdout.on('data', chunk => {
            buffer += chunk.toString();
            let idx;
            while ((idx = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, idx).trim();
                buffer = buffer.slice(idx + 1);
                if (!line) continue;
                let msg;
                try { msg = JSON.parse(line); } catch { continue; }
                if (msg.ready && !ready) {
                    ready = true;
                    clearTimeout(timer);
                    timer = setTimeout(() => {
                        child.kill('SIGKILL');
                        finish(new BackgroundRemovalError('Arka plan temizleme zaman aşımına uğradı', 504));
                    }, PER_FILE_TIMEOUT_MS * jobs.length);
                    continue;
                }
                if (msg.input) results.set(msg.input, { ok: Boolean(msg.ok), error: msg.error || null });
            }
        });
        child.stderr.on('data', chunk => { stderr += chunk.toString(); });
        child.on('error', err => finish(new BackgroundRemovalError(`İşleyici başlatılamadı: ${err.message}`, 500)));
        child.on('close', (code, signal) => {
            if (!ready && code !== 0) {
                return finish(new BackgroundRemovalError(`İşleyici hata verdi: ${stderr.trim().split('\n').pop() || code}`, 500));
            }
            if (results.size < jobs.length) {
                console.error('[BackgroundRemoval] İşleyici erken kapandı', { code, signal, completed: results.size, expected: jobs.length, stderr: stderr.trim().split('\n').slice(-3).join(' | ') });
            }
            finish(null);
        });

        for (const job of jobs) child.stdin.write(JSON.stringify(job) + '\n');
        child.stdin.end();
    });
}

async function removeBackgrounds(folder, relPaths) {
    if (!Array.isArray(relPaths) || relPaths.length === 0) {
        throw new BackgroundRemovalError('En az bir dosya seçilmelidir');
    }
    if (relPaths.length > MAX_FILES) {
        throw new BackgroundRemovalError(`Tek seferde en fazla ${MAX_FILES} dosya işlenebilir`);
    }

    const files = [];
    const results = [];
    for (const relPath of relPaths) {
        try {
            const file = resolveFile(folder, relPath);
            if (!fs.existsSync(file.absPath)) throw new BackgroundRemovalError(`Dosya bulunamadı: ${relPath}`, 404);
            files.push(file);
        } catch (error) {
            results.push({ file: relPath, ok: false, error: error.message });
        }
    }

    if (files.length > 0) {
        for (const file of files) await ensureBackup(file);

        const jobs = files.map(file => ({
            input: file.absPath,
            output: `${file.absPath}.bgtmp${file.ext}`
        }));
        const outcome = await runWorker(jobs);

        for (const file of files) {
            const tmp = `${file.absPath}.bgtmp${file.ext}`;
            const r = outcome.get(file.absPath) || { ok: false, error: 'İşleyiciden yanıt alınamadı' };
            if (r.ok && fs.existsSync(tmp)) {
                await fsp.rename(tmp, file.absPath);
                await purgeDerivatives(file);
                results.push({ file: file.relPath, ok: true, error: null });
            } else {
                if (fs.existsSync(tmp)) await fsp.unlink(tmp).catch(() => { });
                results.push({ file: file.relPath, ok: false, error: r.error || 'Arka plan temizlenemedi' });
            }
        }
    }

    return {
        processed: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
        results
    };
}

async function restoreOriginal(folder, relPath) {
    const file = resolveFile(folder, relPath);
    const backup = backupPathFor(file);
    if (!fs.existsSync(backup)) {
        throw new BackgroundRemovalError('Bu görsel için yedek bulunamadı', 404);
    }
    await fsp.mkdir(path.dirname(file.absPath), { recursive: true });
    await fsp.copyFile(backup, file.absPath);
    await purgeDerivatives(file);
    return { file: file.relPath };
}

function hasBackup(folder, relPath) {
    try {
        return fs.existsSync(backupPathFor(resolveFile(folder, relPath)));
    } catch {
        return false;
    }
}

module.exports = { removeBackgrounds, restoreOriginal, hasBackup, BackgroundRemovalError, MAX_FILES };
