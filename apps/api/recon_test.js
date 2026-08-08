const mongoose = require('mongoose');
const URI = 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin';
const svc = require('./src/services/plugins/xml/XmlWebProductSyncService');
(async () => {
  await mongoose.connect(URI);
  const inst = svc.instance || svc.default || (typeof svc === 'function' ? new svc() : svc);
  const xp = await mongoose.connection.db.collection('xmlproducts').findOne({ diaKey: '36994805' });
  const hedef = xp && xp.mappedData && xp.mappedData.hedefStokKodu;
  console.log('hedefStokKodu:', hedef);
  if (!hedef) { console.log('hedef yok'); process.exit(0); }
  const r = await inst.reconsolidate([hedef]);
  console.log('RECON SONUC:', JSON.stringify(r));
  process.exit(0);
})().catch(e => { console.error('HATA:', e.message); process.exit(1); });
