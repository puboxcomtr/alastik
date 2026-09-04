require('dotenv').config({ path: '/var/www/alastik/apps/api/.env.production' });
const mongoose = require('/var/www/alastik/apps/api/node_modules/mongoose');
const fs = require('fs'), path = require('path');
const PUBLIC = '/var/www/alastik/apps/api/public';
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const wp = mongoose.connection.db.collection('webproducts');
  const q = { $or: [
    { 'diaData.m_kategoriler.kategori_aciklama_1': /ikinci\s*el/i },
    { 'diaData.m_kategoriler.kategori_aciklama_2': /ikinci\s*el/i },
    { 'diaData.m_kategoriler.kategori_aciklama_3': /ikinci\s*el/i },
    { 'diaData.stokkartkodu': /^2\.?EL/i },
    { 'diaData.aciklama': /\b2\.?\s*el\b/i }
  ] };
  const cur = wp.find(q).project({ 'diaData.stokkartkodu': 1, 'diaData.m_resimler.aws_url': 1, 'customData.customImages.url': 1, 'customData.featuredImage': 1, sites: 1 });
  const files = new Map(); let products = 0, missing = 0, external = 0;
  const add = (u, code) => {
    if (!u || typeof u !== 'string') return;
    if (!u.startsWith('/urun/')) { external++; return; }
    const rel = u.slice('/urun/'.length).split('?')[0];
    if (!/\.(jpe?g|png|webp)$/i.test(rel)) return;
    if (!fs.existsSync(path.join(PUBLIC, 'urun', rel))) { missing++; return; }
    if (!files.has(rel)) files.set(rel, code);
  };
  for await (const p of cur) {
    products++;
    (p.diaData?.m_resimler || []).forEach(r => add(r.aws_url, p.diaData.stokkartkodu));
    (p.customData?.customImages || []).forEach(r => add(r.url, p.diaData.stokkartkodu));
    add(p.customData?.featuredImage, p.diaData.stokkartkodu);
  }
  const list = [...files.entries()].map(([file, code]) => ({ file, code }));
  const alreadyDone = list.filter(x => fs.existsSync(path.join(PUBLIC, '_orijinal/urun', x.file))).length;
  let bytes = 0; list.forEach(x => { bytes += fs.statSync(path.join(PUBLIC, 'urun', x.file)).size; });
  fs.writeFileSync('2el-images.json', JSON.stringify(list, null, 0));
  console.log({ products, images: list.length, alreadyDone, missingOnDisk: missing, externalUrls: external, totalMB: Math.round(bytes / 1048576) });
  console.log('ornek:', list.slice(0, 3).map(x => x.file).join(' | '));
  await mongoose.disconnect();
})();
