/**
 * Mollaoğlu B2B API Test Script v4
 * Dosya: apps/api/src/scripts/xml/mollaoglu.js
 * 
 * Çalıştırma: node apps/api/src/scripts/xml/mollaoglu.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// API Konfigürasyonu
const config = {
    baseUrl: 'https://b2bstore.com.tr:14611/api/productservice/get',
    token: '73b43ec3-5574-4245-a5e0-fbdb187c778a',
    headers: {
        'API-KEY': '91DC9BDB52D04DC20036DBD8313ED187',
        'APP-KEY': 'eb8ea6de-6ae8-4529-8d9a-97533ebbce5c',
        'SECRET-KEY': '91DC9BDB52D04DC20036DBD8313EF258',
        'Content-Type': 'application/json'
    }
};

const outputDir = path.join(__dirname, 'mollaoglu_output');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest() {
    return new Promise((resolve, reject) => {
        const url = new URL(`${config.baseUrl}?token=${config.token}`);

        const options = {
            hostname: url.hostname,
            port: url.port || 443,
            path: url.pathname + url.search,
            method: 'GET',
            headers: config.headers,
            rejectUnauthorized: false
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data, parseError: true });
                }
            });
        });

        req.on('error', reject);
        req.setTimeout(120000, () => {
            req.destroy();
            reject(new Error('Timeout'));
        });
        req.end();
    });
}

async function testMollaogluApi() {
    console.log('='.repeat(60));
    console.log('Mollaoğlu B2B API Test v4');
    console.log('='.repeat(60));

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`\n[Deneme ${attempt}/${maxRetries}]`);

        try {
            const startTime = Date.now();
            const result = await makeRequest();
            const duration = Date.now() - startTime;

            console.log(`Status: ${result.status} | Süre: ${duration}ms`);

            if (result.status === 200 && result.data) {
                const response = result.data;

                // Tam yanıtı kaydet
                const fullPath = path.join(outputDir, 'full_response.json');
                fs.writeFileSync(fullPath, JSON.stringify(response, null, 2), 'utf8');
                console.log(`\n[KAYDEDILDI] ${fullPath}`);

                // API yanıt bilgileri
                console.log('\n[API RESPONSE]');
                console.log(`  StatusCode: ${response.StatusCode}`);
                console.log(`  WebUrl: ${response.WebUrl}`);
                console.log(`  Error: ${response.Error ? JSON.stringify(response.Error) : 'Yok'}`);

                // Data analizi
                if (response.Data !== null) {
                    console.log('\n[DATA ANALİZİ]');
                    console.log(`  Tip: ${typeof response.Data}`);

                    if (typeof response.Data === 'object') {
                        const keys = Object.keys(response.Data);
                        console.log(`  Anahtar Sayısı: ${keys.length}`);
                        console.log(`  Anahtarlar: ${keys.join(', ')}`);

                        // Her anahtarı kontrol et
                        keys.forEach(key => {
                            const val = response.Data[key];

                            if (Array.isArray(val)) {
                                console.log(`\n  [${key}] Array - ${val.length} öğe`);

                                if (val.length > 0) {
                                    // Kaydet
                                    const arrPath = path.join(outputDir, `${key.toLowerCase()}.json`);
                                    fs.writeFileSync(arrPath, JSON.stringify(val, null, 2), 'utf8');
                                    console.log(`    Kaydedildi: ${arrPath}`);

                                    // İlk öğe analizi
                                    if (typeof val[0] === 'object' && val[0] !== null) {
                                        const fields = Object.keys(val[0]);
                                        console.log(`    İlk öğe alanları (${fields.length}):`);
                                        fields.slice(0, 20).forEach(f => {
                                            const v = val[0][f];
                                            const t = v === null ? 'null' : Array.isArray(v) ? `Array[${v.length}]` : typeof v;
                                            const preview = typeof v === 'string' ? v.substring(0, 30) : '';
                                            console.log(`      - ${f} (${t})${preview ? ': ' + preview : ''}`);
                                        });
                                        if (fields.length > 20) {
                                            console.log(`      ... ve ${fields.length - 20} alan daha`);
                                        }

                                        // İlk ürünü ayrı kaydet
                                        const samplePath = path.join(outputDir, `${key.toLowerCase()}_sample.json`);
                                        fs.writeFileSync(samplePath, JSON.stringify(val[0], null, 2), 'utf8');
                                        console.log(`    Örnek kaydedildi: ${samplePath}`);
                                    }
                                }
                            } else if (val !== null) {
                                console.log(`\n  [${key}] ${typeof val}`);
                            }
                        });
                    }

                    console.log('\n' + '='.repeat(60));
                    console.log('BAŞARILI - Dosyalar:');
                    fs.readdirSync(outputDir).forEach(f => console.log(`  - ${f}`));
                    console.log('='.repeat(60));
                    return true;
                } else {
                    console.log('\n[UYARI] Data null döndü');
                }
            } else if (result.status === 500) {
                console.log('[HATA] Sunucu hatası (500)');
                if (result.data && result.data.Error) {
                    console.log(`  Title: ${result.data.Error.Title}`);
                    console.log(`  Detail: ${result.data.Error.Detail}`);
                }
                lastError = 'Server Error 500';
            } else {
                console.log(`[HATA] Beklenmeyen status: ${result.status}`);
                lastError = `Status ${result.status}`;
            }

        } catch (err) {
            console.log(`[HATA] ${err.message}`);
            lastError = err.message;
        }

        if (attempt < maxRetries) {
            const waitTime = attempt * 10;
            console.log(`\n${waitTime} saniye bekleniyor...`);
            await sleep(waitTime * 1000);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`BAŞARISIZ - ${maxRetries} deneme sonrası`);
    console.log(`Son hata: ${lastError}`);
    console.log('='.repeat(60));
    return false;
}

testMollaogluApi()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });