// 2.El urun gorsellerinde toplu arka plan temizleme (BackgroundRemovalService ile, yedekli, kaldigi yerden devam eder)
require('dotenv').config({ path: '/var/www/alastik/apps/api/.env.production' });
const fs = require('fs'), path = require('path');
const svc = require('/var/www/alastik/apps/api/src/services/media/BackgroundRemovalService');
const DIR = __dirname;
const PUBLIC = '/var/www/alastik/apps/api/public';
const BATCH = 4;
const list = JSON.parse(fs.readFileSync(path.join(DIR, '2el-ilk-images.json'), 'utf8'));
const progressFile = path.join(DIR, '2el-ilk-progress.json');
const logFile = path.join(DIR, '2el-ilk-run.log');
const failFile = path.join(DIR, '2el-ilk-failed.jsonl');
const log = (m) => fs.appendFileSync(logFile, `${new Date().toISOString()} ${m}\n`);
const { execFileSync } = require('child_process');
const isProcessed = (file) => {
  const bak = path.join(PUBLIC, '_orijinal/urun', file), cur = path.join(PUBLIC, 'urun', file);
  if (!fs.existsSync(bak) || !fs.existsSync(cur)) return false;
  try { execFileSync('cmp', ['-s', bak, cur]); return false; } catch { return true; } // cmp 0 = ayni = islenmemis
};
// Güvenlik kilidine takılanlar (ön plan ayrılamayan) tekrar tekrar denenmesin
const locked = (() => { try { return new Set(fs.readFileSync(path.join(DIR, '2el-kilitli.txt'), 'utf8').split('\n').filter(Boolean)); } catch { return new Set(); } })();
// Yalnızca hiç denenmemiş görseller (yedeği olmayan); kullanıcı tarafından orijinale döndürülenler (yedeği var) atlanır
const hasBackup = (file) => fs.existsSync(path.join(PUBLIC, '_orijinal/urun', file));
const pending = list.filter(x => !locked.has(x.file) && !hasBackup(x.file));
const state = { total: list.length, locked: locked.size, skipped: list.length - pending.length, done: 0, ok: 0, failed: 0, startedAt: new Date().toISOString(), finishedAt: null, lastFile: null, pid: process.pid };
const save = () => fs.writeFileSync(progressFile, JSON.stringify(state));
save(); log(`BASLADI toplam=${state.total} bekleyen=${pending.length} atlanan(yedegi var)=${state.skipped}`);
(async () => {
  for (let i = 0; i < pending.length; i += BATCH) {
    const batch = pending.slice(i, i + BATCH);
    try {
      const r = await svc.removeBackgrounds('urun', batch.map(x => x.file));
      for (const res of r.results) {
        state.done++; state.lastFile = res.file;
        if (res.ok) state.ok++; else {
          state.failed++; fs.appendFileSync(failFile, JSON.stringify({ file: res.file, error: res.error }) + '\n');
          // Güvenlik kilidi (ön plan/arka plan ayrılamadı): bir daha denenmesin
          if (/kapsam %/.test(res.error || '')) fs.appendFileSync(path.join(DIR, '2el-kilitli.txt'), res.file + '\n');
        }
      }
      log(`batch ${i / BATCH + 1}: ok=${r.processed} fail=${r.failed} | toplam ${state.done}/${pending.length}`);
    } catch (e) {
      state.done += batch.length; state.failed += batch.length;
      batch.forEach(x => fs.appendFileSync(failFile, JSON.stringify({ file: x.file, error: e.message }) + '\n'));
      log(`batch ${i / BATCH + 1} HATA: ${e.message}`);
    }
    save();
  }
  state.finishedAt = new Date().toISOString(); save(); log(`BITTI ok=${state.ok} fail=${state.failed}`);
})();
