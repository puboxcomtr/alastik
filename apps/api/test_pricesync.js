process.chdir('/var/www/alastik/apps/api');
const mongoose = require('mongoose');
const DiaStockService = require('./src/services/plugins/dia/DiaStockService');
const DiaStock = require('./src/models/plugins/DiaStock');
const WebProduct = require('./src/models/web/catalog/WebProduct');

async function test() {
  await mongoose.connect('mongodb://alastik:[BURAYA_PASSWORD]@217.195.202.170:27017/alastik_db?authSource=admin');
  console.log('Mongo OK');

  const service = new DiaStockService();
  await service.loadConfig();

  const result = await service.fetchStockFromDia({
    limit: 1,
    offset: 0,
    filters: [{ field: 'stokkartkodu', operator: '=', value: '125800-25' }]
  });

  const product = result[0];
  console.log('DIA fiyat4:', product.fiyat4);
  console.log('DIA __dinamik__16:', product.__dinamik__16);

  const finalFiyat4 = parseFloat(product.__dinamik__16) || parseFloat(product.fiyat4);
  console.log('Yazilacak finalFiyat4:', finalFiyat4);

  const r1 = await DiaStock.updateOne(
    { _key: product._key },
    { $set: { fiyat4: finalFiyat4, 'm_birimler.0.fiyat4': finalFiyat4 } }
  );
  console.log('DiaStock update:', r1);

  const r2 = await WebProduct.updateOne(
    { _key: product._key },
    { $set: { 'diaData.m_birimler.0.fiyat4': finalFiyat4 } }
  );
  console.log('WebProduct update:', r2);

  const verify = await DiaStock.findOne({ _key: product._key }, { fiyat4: 1, 'm_birimler.fiyat4': 1 });
  console.log('DB SONRASI:', JSON.stringify(verify));

  process.exit(0);
}

test().catch(e => { console.error(e); process.exit(1); });

