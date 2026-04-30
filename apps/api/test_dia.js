const axios = require('axios');
async function test() {
  const loginRes = await axios.post('https://artlastik.ws.dia.com.tr/api/v3/sis/json', {
    login: {
      username: 'Ws_alastik_B2C',
      password: 'Ws_alastik_B2C',
      disconnect_same_user: 'True',
      params: { apikey: 'eda23858-0e9b-4a81-b7e2-4c9f03d30078' }
    }
  });
  if (loginRes.data.code !== '200') {
    console.log('Login hata:', loginRes.data);
    return;
  }
  const sessionId = loginRes.data.msg;
  console.log('Session OK');
  const stockRes = await axios.post('https://artlastik.ws.dia.com.tr/api/v3/scf/json', {
    scf_stokkart_detay_listele: {
      session_id: sessionId,
      firma_kodu: 1,
      donem_kodu: 3,
      filters: [{ field: 'stokkartkodu', operator: '=', value: '125800-25' }],
      sorts: [{ field: 'stokkartkodu', sorttype: 'DESC' }],
      params: { _key_sis_depo: 0, _key_sis_depo_filtre: 0, tarih: '2099-12-31' },
      limit: 1,
      offset: 0
    }
  });
  if (stockRes.data.code !== '200') {
    console.log('Stok hata:', stockRes.data);
    return;
  }
  const product = stockRes.data.result[0];
  if (!product) {
    console.log('Ürün bulunamadı');
    return;
  }
  console.log('Stok kodu:', product.stokkartkodu);
  console.log('Aciklama:', product.aciklama);

  console.log('\n=== TÜM __dinamik__ ALANLARI ===');
  Object.keys(product).sort().forEach(k => {
    if (k.includes('dinamik') || k.includes('dk__') || k.includes('dkf__')) {
      console.log(`${k} = ${product[k]}`);
    }
  });

  console.log('\n=== A LASTİK / 2150 / 2 150 ARAMA ===');
  const fullJson = JSON.stringify(product);
  const matches = fullJson.match(/.{0,100}(a lastik|alastik|2150|2 150).{0,100}/gi);
  console.log(matches || 'BULUNAMADI');

  console.log('\n=== TÜM FIYAT ALANLARI ===');
  Object.keys(product).sort().forEach(k => {
    if (k.startsWith('fiyat')) {
      console.log(`${k} = ${product[k]}`);
    }
  });
}
test().catch(e => console.error('HATA:', e.message));
