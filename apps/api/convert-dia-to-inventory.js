const mongoose = require('mongoose');
const DiaStock = require('./src/models/DiaStock');
const Product = require('./src/models/Product');
const Inventory = require('./src/models/Inventory');

async function convertDiaToInventory() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin');
    console.log('✅ MongoDB bağlantısı kuruldu');
    
    // Önce DIA Stock verilerinin durumunu kontrol et
    const totalDiaRecords = await DiaStock.countDocuments();
    console.log(`📊 Toplam DIA Stock kayıt sayısı: ${totalDiaRecords}`);
    
    if (totalDiaRecords === 0) {
      console.log('⚠️ DIA Stock koleksiyonunda veri bulunamadı. Önce DIA sync işlemini çalıştırın.');
      mongoose.disconnect();
      return;
    }
    
    // Önce stokta olan ürünleri al, sonra stokta olmayanları
    console.log('🔍 Stokta olan ürünler öncelikli olarak alınıyor...');
    
    const stockedProducts = await DiaStock.find({
      durum: 'A',
      b2c_gonder: 'E',
      fiili_stok: { $gt: 0 }
    }).limit(100); // Stokta olan ilk 100 ürün
    
    const nonStockedProducts = await DiaStock.find({
      durum: 'A',
      b2c_gonder: 'E',
      $or: [
        { fiili_stok: { $lte: 0 } },
        { fiili_stok: null }
      ]
    }).limit(50); // Stokta olmayan 50 ürün
    
    const diaProducts = [...stockedProducts, ...nonStockedProducts];
    
    console.log(`📦 Toplam ${diaProducts.length} adet DIA ürünü seçildi:`);
    console.log(`   🟢 Stokta olan: ${stockedProducts.length}`);
    console.log(`   🔴 Stokta olmayan: ${nonStockedProducts.length}`);
    
    if (diaProducts.length === 0) {
      console.log('⚠️ İşlenecek ürün bulunamadı');
      mongoose.disconnect();
      return;
    }
    
    let convertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    console.log('\n🚀 Ürün işleme başlatılıyor...\n');
    
    for (let i = 0; i < diaProducts.length; i++) {
      const diaProduct = diaProducts[i];
      
      try {
        const progress = `[${i + 1}/${diaProducts.length}]`;
        console.log(`${progress} 🔄 ${diaProduct.stokkartkodu} - ${(diaProduct.aciklama || '').substring(0, 40)}...`);
        
        // Ürün SKU'sunu temizle
        const cleanSku = diaProduct.stokkartkodu?.trim();
        if (!cleanSku) {
          console.log(`${progress} ⚠️ SKU bulunamadı, atlanıyor`);
          skippedCount++;
          continue;
        }
        
        // Çok kısa veya geçersiz SKU'ları atla
        if (cleanSku.length < 3) {
          console.log(`${progress} ⚠️ Geçersiz SKU (çok kısa), atlanıyor: ${cleanSku}`);
          skippedCount++;
          continue;
        }
        
        // Lastik ebatından bilgileri çıkar
        const sizeInfo = extractTireSize(diaProduct.ozelkod3 || diaProduct.aciklama);
        const loadSpeed = extractLoadSpeedIndex(diaProduct.aciklama);
        
        // Önce Product oluştur veya bul
        let product = await Product.findOne({ sku: cleanSku });
        
        if (!product) {
          // Yeni ürün oluştur - zorunlu alanları doğru enum değerleriyle doldur
          const productData = {
            name: diaProduct.aciklama || `${diaProduct.marka || 'Bilinmeyen'} Lastik`,
            sku: cleanSku,
            brand: diaProduct.marka || 'Bilinmeyen Marka',
            category: diaProduct.ozelkod7 || 'Lastik',
            price: parseFloat(diaProduct.fiyat1) || 0,
            stock: parseInt(diaProduct.fiili_stok) || parseInt(diaProduct.gercek_stok) || 0,
            description: diaProduct.aciklama || '',
            status: 'active',
            isActive: true,
            // Specifications - zorunlu alanları doğru tiplerle doldur
            specifications: {
              size: diaProduct.ozelkod3 || extractSizeString(sizeInfo) || '195/65R15',
              width: sizeInfo.width || 195,
              aspectRatio: sizeInfo.aspectRatio || 65,
              rimDiameter: sizeInfo.rimDiameter || 15,
              season: mapSeason(diaProduct.ozelkod1),
              loadIndex: loadSpeed.loadIndex || '91',
              speedIndex: loadSpeed.speedIndex || 'H',
              vehicleType: mapVehicleType(diaProduct.ozelkod8)
            }
          };
          
          product = new Product(productData);
          await product.save();
          console.log(`${progress} ✅ Ürün oluşturuldu: ${product.sku} - ${product.brand}`);
          convertedCount++;
        } else {
          // Mevcut ürünü güncelle
          const oldStock = product.stock;
          product.stock = parseInt(diaProduct.fiili_stok) || parseInt(diaProduct.gercek_stok) || 0;
          product.price = parseFloat(diaProduct.fiyat1) || product.price;
          product.lastStockUpdate = new Date();
          await product.save();
          console.log(`${progress} 🔄 Ürün güncellendi: ${product.sku} - Stok: ${oldStock} → ${product.stock}`);
          updatedCount++;
        }
        
        // Inventory kaydı oluştur veya güncelle
        let inventory = await Inventory.findOne({ productId: product._id });
        
        const stockQuantity = parseInt(diaProduct.fiili_stok) || parseInt(diaProduct.gercek_stok) || 0;
        const unitCost = parseFloat(diaProduct.fiyat1) || 0;
        
        if (!inventory) {
          inventory = new Inventory({
            productId: product._id,
            quantity: stockQuantity,
            cost: {
              unitCost: unitCost
            },
            supplier: {
              name: 'DIA ERP',
              code: 'DIA',
              contact: {
                email: 'dia@alastik.com'
              },
              leadTime: 3
            },
            locations: [{
              warehouse: 'Ana Depo',
              zone: 'A1',
              shelf: 'S1',
              quantity: stockQuantity
            }],
            minStockLevel: stockQuantity > 0 ? Math.max(1, Math.floor(stockQuantity * 0.2)) : 1,
            reorderPoint: stockQuantity > 0 ? Math.max(2, Math.floor(stockQuantity * 0.3)) : 2,
            reorderQuantity: Math.max(10, stockQuantity)
          });
          
          await inventory.save();
          console.log(`${progress} 📦 Stok kaydı oluşturuldu - Miktar: ${stockQuantity}`);
        } else {
          // Mevcut stok kaydını güncelle
          const oldQuantity = inventory.quantity;
          inventory.quantity = stockQuantity;
          inventory.cost.unitCost = unitCost;
          if (inventory.locations.length > 0) {
            inventory.locations[0].quantity = stockQuantity;
          }
          inventory.lastStockUpdate = new Date();
          await inventory.save();
          console.log(`${progress} 🔄 Stok güncellendi - Miktar: ${oldQuantity} → ${stockQuantity}`);
        }
        
        // Her 10 üründe bir ilerleme göster
        if ((i + 1) % 10 === 0) {
          console.log(`\n📈 İlerleme: ${i + 1}/${diaProducts.length} (${Math.round(((i + 1) / diaProducts.length) * 100)}%)`);
          console.log(`   ✅ Oluşturulan: ${convertedCount} | 🔄 Güncellenen: ${updatedCount} | ❌ Hata: ${errorCount} | ⏭️ Atlanan: ${skippedCount}\n`);
        }
        
      } catch (error) {
        console.error(`❌ ${diaProduct.stokkartkodu} işlenirken hata:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 İşlem tamamlandı!`);
    console.log(`✅ ${convertedCount} adet yeni ürün oluşturuldu`);
    console.log(`🔄 ${updatedCount} adet mevcut ürün güncellendi`);
    console.log(`❌ ${errorCount} adet hata`);
    console.log(`⏭️ ${skippedCount} adet atlanan`);
    
    // Özet bilgiler
    const totalProducts = await Product.countDocuments();
    const totalInventory = await Inventory.countDocuments();
    const inStockCount = await Inventory.countDocuments({ quantity: { $gt: 0 } });
    const totalStockValue = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$quantity', '$cost.unitCost'] } },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);
    
    console.log('\n📊 STOK SİSTEMİ ÖZETİ:');
    console.log(`   Toplam Ürün: ${totalProducts}`);
    console.log(`   Toplam Stok Kaydı: ${totalInventory}`);
    console.log(`   Stokta Olan: ${inStockCount}`);
    console.log(`   Toplam Stok Miktarı: ${totalStockValue[0]?.totalQuantity || 0}`);
    console.log(`   Toplam Stok Değeri: ${(totalStockValue[0]?.totalValue || 0).toFixed(2)} TL`);
    
    // Marka dağılımı
    const brandStats = await Product.aggregate([
      { $group: { _id: '$brand', count: { $sum: 1 }, totalStock: { $sum: '$stock' } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);
    
    console.log('\n🏷️ MARKA DAĞILIMI (İlk 15):');
    brandStats.forEach(brand => {
      console.log(`   ${brand._id}: ${brand.count} ürün, ${brand.totalStock} adet stok`);
    });
    
    // Stok durumu analizi
    const stockAnalysis = await Inventory.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $gt: ['$quantity', 10] }, 'Yeterli Stok',
              { $cond: [
                { $gt: ['$quantity', 0] }, 'Düşük Stok', 'Stoksuz'
              ]}
            ]
          },
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);
    
    console.log('\n📈 STOK DURUMU ANALİZİ:');
    stockAnalysis.forEach(status => {
      console.log(`   ${status._id}: ${status.count} ürün, ${status.totalQuantity} adet`);
    });
    
    // En yüksek stoklu ürünler
    const topStockProducts = await Inventory.find({ quantity: { $gt: 0 } })
      .populate('productId', 'name brand sku')
      .sort({ quantity: -1 })
      .limit(10);
    
    console.log('\n🔝 EN YÜKSEK STOKLU ÜRÜNLER (İlk 10):');
    topStockProducts.forEach((inv, index) => {
      console.log(`   ${index + 1}. ${inv.productId.brand} ${inv.productId.name.substring(0, 30)}... - ${inv.quantity} adet`);
    });
    
    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Genel hata:', error);
    mongoose.disconnect();
  }
}

// Yardımcı fonksiyonlar - lastik ebatından bilgi çıkarma
function extractTireSize(sizeString) {
  if (!sizeString) return { width: 195, aspectRatio: 65, rimDiameter: 15 };
  
  // 195/65R15 formatını parse et
  const match = sizeString.match(/(\d+)\/(\d+)R(\d+)/);
  if (match) {
    return {
      width: parseInt(match[1]),
      aspectRatio: parseInt(match[2]),
      rimDiameter: parseInt(match[3])
    };
  }
  
  // Varsayılan değerler
  return { width: 195, aspectRatio: 65, rimDiameter: 15 };
}

function extractSizeString(sizeInfo) {
  return `${sizeInfo.width}/${sizeInfo.aspectRatio}R${sizeInfo.rimDiameter}`;
}

function extractLoadSpeedIndex(description) {
  if (!description) return { loadIndex: '91', speedIndex: 'H' };
  
  // 91H, 95V gibi formatları ara
  const match = description.match(/(\d{2,3})([A-Z])/);
  if (match) {
    return {
      loadIndex: match[1],
      speedIndex: match[2]
    };
  }
  
  return { loadIndex: '91', speedIndex: 'H' };
}

function mapSeason(ozelkod1) {
  if (!ozelkod1) return '4mevsim';
  
  const season = ozelkod1.toLowerCase();
  if (season.includes('yaz') || season.includes('summer')) return 'yaz';
  if (season.includes('kış') || season.includes('kis') || season.includes('winter')) return 'kis';
  return '4mevsim';
}

function mapVehicleType(ozelkod8) {
  if (!ozelkod8) return 'otomobil';
  
  const type = ozelkod8.toLowerCase();
  if (type.includes('suv') || type.includes('4x4')) return 'suv';
  if (type.includes('kamyonet') || type.includes('pickup')) return 'kamyonet';
  if (type.includes('kamyon') || type.includes('truck')) return 'kamyon';
  if (type.includes('motor')) return 'motosiklet';
  return 'otomobil';
}

convertDiaToInventory(); 