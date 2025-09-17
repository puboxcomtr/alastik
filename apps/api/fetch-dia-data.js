const mongoose = require('mongoose');
const DiaStockService = require('./src/services/DiaStockService');

async function fetchDiaData() {
  try {
    console.log('🚀 DIA API veri çekme işlemi başlatılıyor...');
    
    // MongoDB bağlantısı
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin');
    console.log('✅ MongoDB bağlantısı kuruldu');
    
    // DIA Service oluştur
    const diaService = new DiaStockService();
    
    console.log('🔐 DIA API login işlemi...');
    const sessionId = await diaService.loginAsync();
    
    if (!sessionId) {
      console.log('❌ DIA login başarısız');
      return;
    }
    
    console.log('✅ DIA login başarılı');
    
    console.log('📡 DIA API\'den stok verileri çekiliyor (ilk 20 kayıt)...');
    
    // Küçük bir batch ile başlayalım
    const stockData = await diaService.fetchStockFromDia({
      limit: 20,
      offset: 0
    });
    
    console.log(`📦 ${stockData.length} adet veri çekildi`);
    
    if (stockData.length > 0) {
      console.log('💾 Veritabanına kaydediliyor...');
      const result = await diaService.syncStockToDatabase(stockData);
      
      console.log('🎉 Veritabanı sync tamamlandı:');
      console.log(`   ✅ İşlenen: ${result.processed}`);
      console.log(`   ➕ Eklenen: ${result.inserted}`);
      console.log(`   🔄 Güncellenen: ${result.updated}`);
      console.log(`   ❌ Hata: ${result.errors.length}`);
      
      if (result.errors.length > 0) {
        console.log('\n⚠️ Hatalar:');
        result.errors.slice(0, 3).forEach(error => {
          console.log(`   - ${error.item}: ${error.error}`);
        });
      }
      
      // İlk 5 kaydı göster
      console.log('\n📋 Çekilen veriler (ilk 5):');
      stockData.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. ${item.stokkartkodu} - ${(item.aciklama || '').substring(0, 40)}...`);
        console.log(`   Marka: ${item.marka || 'N/A'} | Stok: ${item.fiili_stok || 0} | Fiyat: ${item.fiyat1 || 0} TL`);
      });
      
      // Şimdi stok sistemine aktar
      console.log('\n🔄 Stok sistemine aktarım başlatılıyor...');
      
      const { exec } = require('child_process');
      exec('node convert-dia-to-inventory.js', (error, stdout, stderr) => {
        if (error) {
          console.error('❌ Stok aktarım hatası:', error.message);
        } else {
          console.log('✅ Stok aktarımı tamamlandı');
          console.log(stdout);
        }
      });
      
    } else {
      console.log('⚠️ Hiç veri çekilemedi');
    }
    
  } catch (error) {
    console.error('❌ Hata:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Bağlantıyı kapat
    setTimeout(() => {
      mongoose.disconnect();
      console.log('🔌 MongoDB bağlantısı kapatıldı');
    }, 2000);
  }
}

console.log('🎯 DIA API Veri Çekme Aracı');
console.log('================================');
fetchDiaData(); 