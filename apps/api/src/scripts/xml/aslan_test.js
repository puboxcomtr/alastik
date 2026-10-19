
const https = require('https');
const fs = require('fs');
const path = require('path');

const config = {
  baseUrl: 'https://stockapi.afkyazilim.com.tr/api/Stock',
  username: 'artvinotomotiv',
  password: '1234'
};

const outputDir = path.join(__dirname, 'aslan_output');

function request(endpoint, params = {}) {
  return new Promise((resolve, reject) => {
    const qs = new URLSearchParams({ Username: config.username, Password: config.password, ...params });
    const url = new URL(`${config.baseUrl}/${endpoint}?${qs}`);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'GET',
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data, parseError: true });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

function analyzeArray(label, arr, dir) {
  console.log(`\n[${label}] ${arr.length} öğe`);
  if (arr.length === 0) return;

  const sample = arr[0];
  if (typeof sample === 'object' && sample !== null) {
    const fields = Object.keys(sample);
    console.log(`  Alanlar (${fields.length}):`);
    fields.forEach(f => {
      const v = sample[f];
      const t = v === null ? 'null' : Array.isArray(v) ? `Array[${v.length}]` : typeof v;
      const preview = typeof v === 'string' ? v.substring(0, 40) : (v !== null ? String(v).substring(0, 40) : '');
      console.log(`    - ${f} (${t})${preview ? ': ' + preview : ''}`);
    });

    fs.writeFileSync(path.join(dir, `${label.toLowerCase()}_sample.json`), JSON.stringify(sample, null, 2));
    fs.writeFileSync(path.join(dir, `${label.toLowerCase()}_all.json`), JSON.stringify(arr.slice(0, 50), null, 2));
    console.log(`  Sample ve ilk 50 kayıt kaydedildi.`);
  }
}

async function run() {
  console.log('='.repeat(60));
  console.log('Aslan Kardeşler Stock API Test');
  console.log('='.repeat(60));

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log('\n[1] Marka listesi çekiliyor...');
  try {
    const brands = await request('GetBrandJson');
    console.log(`  Status: ${brands.status}`);
    if (brands.parseError) {
      console.log('  Parse hatası - ham yanıt:', String(brands.data).substring(0, 300));
    } else {
      fs.writeFileSync(path.join(outputDir, 'brands_raw.json'), JSON.stringify(brands.data, null, 2));
      const arr = Array.isArray(brands.data) ? brands.data : (brands.data?.Data || brands.data?.data || []);
      console.log(`  Marka sayısı: ${arr.length}`);
      if (arr.length > 0) console.log(`  Örnek:`, arr.slice(0, 5));
    }
  } catch (e) {
    console.log('  Hata:', e.message);
  }

  console.log('\n[2] Stok listesi çekiliyor (marka="")...');
  try {
    const stocks = await request('GetStockJson', { marka: '' });
    console.log(`  Status: ${stocks.status}`);
    if (stocks.parseError) {
      console.log('  Parse hatası - ham yanıt:', String(stocks.data).substring(0, 300));
    } else {
      fs.writeFileSync(path.join(outputDir, 'stocks_raw.json'), JSON.stringify(stocks.data, null, 2));
      const arr = Array.isArray(stocks.data) ? stocks.data : (stocks.data?.Data || stocks.data?.data || []);
      if (Array.isArray(arr)) {
        analyzeArray('stocks', arr, outputDir);
      } else {
        console.log('  Yanıt tipi:', typeof stocks.data);
        console.log('  Anahtarlar:', Object.keys(stocks.data || {}));
        console.log('  Ham (ilk 500):', JSON.stringify(stocks.data).substring(0, 500));
      }
    }
  } catch (e) {
    console.log('  Hata:', e.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Tamamlandı. Çıktılar:', outputDir);
  console.log('='.repeat(60));
}

run().catch(console.error);