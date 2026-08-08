const mongoose = require('mongoose');
const URI = 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin';
const svc = require('./src/services/plugins/xml/XmlDiaMatchService');
(async () => {
  await mongoose.connect(URI);
  const inst = svc.instance || svc.default || (typeof svc === 'function' ? new svc() : svc);
  console.log('matchAll basliyor...');
  const r = await inst.matchAll();
  console.log('SONUC:', JSON.stringify(r));
  process.exit(0);
})().catch(e => { console.error('HATA:', e.message); process.exit(1); });
