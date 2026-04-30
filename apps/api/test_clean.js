process.chdir('/var/www/alastik/apps/api');
const DiaStockService = require('./src/services/plugins/dia/DiaStockService');

async function test() {
  const service = new DiaStockService();
  await service.loadConfig();

  const result = await service.fetchStockFromDia({
    limit: 1,
    offset: 0,
    filters: [{ field: 'stokkartkodu', operator: '=', value: '125800-25' }]
  });

  if (!result || result.length === 0) {
    console.log('Urun gelmedi!');
    process.exit(1);
  }

  const item = result[0];
  console.log('--- HAM DIA ---');
  console.log('stokkartkodu:', item.stokkartkodu);
  console.log('fiyat4:', item.fiyat4, 'tip:', typeof item.fiyat4);
  console.log('__dinamik__16:', item.__dinamik__16, 'tip:', typeof item.__dinamik__16);
  console.log('m_birimler[0].fiyat4:', item.m_birimler && item.m_birimler[0] ? item.m_birimler[0].fiyat4 : 'YOK');

  console.log('\n--- cleanDiaData SONRASI ---');
  const cleaned = service.cleanDiaData(item);
  console.log('cleaned.fiyat4:', cleaned.fiyat4);
  console.log('cleaned.m_birimler[0].fiyat4:', cleaned.m_birimler && cleaned.m_birimler[0] ? cleaned.m_birimler[0].fiyat4 : 'YOK');

  process.exit(0);
}

test().catch(function(e) {
  console.error('HATA:', e.message);
  console.error(e.stack);
  process.exit(1);
});
