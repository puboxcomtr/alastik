// apps/api/src/scripts/wheelsizeExport/testBrandTires.js

const axios = require('axios');

const WHEEL_SIZE_USER_KEY = 'd53fc3695c85571775540c1c9a3ac8c5';
const BASE_URL = 'https://api.wheel-size.com/v2';

async function testBrandTires() {
  console.log('\n' + '='.repeat(70));
  console.log('  BRAND LASTİKLERİ TEST');
  console.log('='.repeat(70) + '\n');

  // Test markaları
  const testBrands = ['michelin', 'pirelli', 'bridgestone', 'dunlop', 'continental'];

  for (const brand of testBrands) {
    console.log(`🔍 "${brand}" markası test ediliyor...\n`);

    // Yöntem 1: Path parametresi (Swagger'daki)
    try {
      console.log(`   Deneme 1: /tires/catalog/${brand}/`);
      const response = await axios.get(`${BASE_URL}/tires/catalog/${brand}/`, {
        params: {
          user_key: WHEEL_SIZE_USER_KEY
        },
        timeout: 10000
      });

      const data = response.data.data || response.data;
      
      if (response.status === 200) {
        console.log(`   ✅ BAŞARILI! ${response.status}`);
        
        if (Array.isArray(data)) {
          console.log(`   📦 ${data.length} lastik modeli bulundu`);
          if (data.length > 0) {
            console.log(`   🔹 Örnek model: ${data[0].name || data[0].slug || JSON.stringify(data[0]).substring(0, 100)}`);
          }
        } else if (data && typeof data === 'object') {
          console.log(`   📋 Yapı: ${Object.keys(data).join(', ')}`);
          if (data.results || data.tires || data.products) {
            const items = data.results || data.tires || data.products;
            console.log(`   📦 ${items.length} lastik modeli bulundu`);
          }
        }
        
        console.log('\n   🎉 ÇALIŞIYOR! Tüm markaları bu endpoint ile çekebiliriz!\n');
        console.log('='.repeat(70) + '\n');
        return true;
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`   ❌ ${error.response.status} - ${error.response.statusText}`);
        if (error.response.status === 403) {
          console.log(`   ⚠️  403 Forbidden - API key yetki sorunu olabilir`);
        }
        if (error.response.data) {
          console.log(`   📄 ${JSON.stringify(error.response.data).substring(0, 100)}`);
        }
      } else {
        console.log(`   ❌ ${error.message}`);
      }
    }

    // Yöntem 2: Query parametresi
    try {
      console.log(`\n   Deneme 2: /tires/catalog/ + brand query`);
      const response = await axios.get(`${BASE_URL}/tires/catalog/`, {
        params: {
          user_key: WHEEL_SIZE_USER_KEY,
          brand: brand
        },
        timeout: 10000
      });

      const data = response.data.data || response.data;
      
      if (response.status === 200 && data && data.length > 0) {
        console.log(`   ✅ BAŞARILI! ${data.length} kayıt`);
        console.log('\n   🎉 ÇALIŞIYOR! Query parametresi ile filtreleyebiliriz!\n');
        console.log('='.repeat(70) + '\n');
        return true;
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`   ❌ ${error.response.status} - ${error.response.statusText}`);
      }
    }

    // Yöntem 3: Header'da key gönder
    try {
      console.log(`\n   Deneme 3: /tires/catalog/${brand}/ + header'da key`);
      const response = await axios.get(`${BASE_URL}/tires/catalog/${brand}/`, {
        headers: {
          'Authorization': `Bearer ${WHEEL_SIZE_USER_KEY}`,
          'X-User-Key': WHEEL_SIZE_USER_KEY
        },
        params: {
          user_key: WHEEL_SIZE_USER_KEY
        },
        timeout: 10000
      });

      const data = response.data.data || response.data;
      
      if (response.status === 200) {
        console.log(`   ✅ BAŞARILI!`);
        console.log('\n   🎉 ÇALIŞIYOR! Header ile key göndermeliyiz!\n');
        console.log('='.repeat(70) + '\n');
        return true;
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`   ❌ ${error.response.status} - ${error.response.statusText}`);
      }
    }

    console.log('\n' + '-'.repeat(70) + '\n');
    
    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('='.repeat(70));
  console.log('  SONUÇ');
  console.log('='.repeat(70) + '\n');
  console.log('❌ Hiçbir yöntem çalışmadı!\n');
  console.log('Muhtemel sebepler:');
  console.log('  1. FREE plan brand detaylarına erişim vermiyor');
  console.log('  2. Sadece /tires/catalog/ (liste) erişilebilir');
  console.log('  3. Ücretli plan upgrade gerekiyor\n');
  console.log('Alternatif:');
  console.log('  • Sadece 181 marka listesini çek (products_count bilgisi ile)');
  console.log('  • Web scraping ile TiresVote.com\'dan modelleri çek');
  console.log('  • API planını upgrade et (750 USD/yıl)\n');

  return false;
}

if (require.main === module) {
  testBrandTires().catch(console.error);
}

module.exports = { testBrandTires };