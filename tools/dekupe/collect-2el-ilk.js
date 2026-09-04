// 2.El lastik ürünlerinin yalnızca İLK (vitrinde ana) görsellerini listeler → 2el-ilk-images.json
require('dotenv').config({ path: '/var/www/alastik/apps/api/.env.production' });
const fs = require('fs'), path = require('path');
const mongoose = require('/var/www/alastik/apps/api/node_modules/mongoose');
const PUBLIC = '/var/www/alastik/apps/api/public';
const orderOf = (r) => { const n = parseInt(r.order_id, 10); return Number.isNaN(n) ? 999 : n; };
(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const col = mongoose.connection.collection('webproducts');
  const cur = col.find(
    { 'diaData.m_kategoriler': { $elemMatch: { kategori_aciklama_1: /^İkinci El/ } }, 'diaData.ozelkod7kodu': 'LASTİK' },
    { projection: { 'diaData.m_resimler': 1, 'customData.featuredImage': 1, 'customData.seoUrl': 1 } }
  );
  const seen = new Set(); const list = []; let products = 0, noImage = 0, missing = 0;
  for await (const p of cur) {
    products++;
    let first = p.customData?.featuredImage || null;
    if (!first) {
      const imgs = (p.diaData?.m_resimler || []).filter(r => r.aws_url).map((r, i) => ({ r, i }))
        .sort((a, b) => (orderOf(a.r) - orderOf(b.r)) || (a.i - b.i));
      first = imgs.length ? imgs[0].r.aws_url : null;
    }
    if (!first || !first.startsWith('/urun/')) { noImage++; continue; }
    const file = first.replace(/^\/urun\//, '');
    if (seen.has(file)) continue;
    seen.add(file);
    if (!fs.existsSync(path.join(PUBLIC, 'urun', file))) { missing++; continue; }
    list.push({ file, product: p.customData?.seoUrl || '' });
  }
  fs.writeFileSync(path.join(__dirname, '2el-ilk-images.json'), JSON.stringify(list));
  const locked = new Set(fs.readFileSync(path.join(__dirname, '2el-kilitli.txt'), 'utf8').split('\n').filter(Boolean));
  const unprocessed = list.filter(x => !fs.existsSync(path.join(PUBLIC, '_orijinal/urun', x.file)) && !locked.has(x.file));
  console.log(JSON.stringify({ products, noImage, missing, firstImages: list.length, unprocessed: unprocessed.length, locked: list.filter(x => locked.has(x.file)).length }));
  process.exit(0);
})();
