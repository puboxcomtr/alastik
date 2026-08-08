const mongoose = require('mongoose');
const URI = 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin';
const svc = require('./src/services/plugins/xml/XmlWebProductSyncService');
(async () => {
  await mongoose.connect(URI);
  const inst = svc.instance || svc.default || (typeof svc === 'function' ? new svc() : svc);
  const hedefler = await mongoose.connection.db.collection('xmlproducts').distinct('mappedData.hedefStokKodu', { status: 'dia_matched', 'mappedData.hedefStokKodu': { $ne: null, $gt: '' } });
  console.log('Toplam hedef:', hedefler.length);
  const r = await inst.reconsolidate(hedefler);
  console.log('RECON SONUC:', JSON.stringify(r));
  process.exit(0);
})().catch(e => { console.error('HATA:', e.message); process.exit(1); });
