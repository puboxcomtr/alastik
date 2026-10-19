const mongoose = require('mongoose');
const DiaStock = require('../models/DiaStock');
const WebProduct = require('../models/WebProduct');

class DiaToWebProductMigration {
  constructor() {
    this.processedCount = 0;
    this.errorCount = 0;
    this.skippedCount = 0;
    this.errors = [];
    this.batchSize = 100;
  }

  async migrate() {
    console.log('🚀 DiaStock → WebProduct migration başlatılıyor...');
    console.log('⏰ Başlangıç:', new Date().toISOString());

    try {
      const totalCount = await DiaStock.countDocuments();
      console.log(`📊 Toplam DiaStock kaydı: ${totalCount}`);

      const existingWebProducts = await WebProduct.countDocuments();
      console.log(`📊 Mevcut WebProduct kaydı: ${existingWebProducts}`);

      if (existingWebProducts > 0) {
        console.log('⚠️  Mevcut WebProduct kayıtları bulundu. Devam etmek için onay gerekli.');
      }

      let skip = 0;
      
      while (skip < totalCount) {
        const batch = await DiaStock.find({})
          .skip(skip)
          .limit(this.batchSize);

        if (batch.length === 0) break;

        await this.processBatch(batch);
        skip += this.batchSize;

        const progress = Math.min((skip / totalCount) * 100, 100);
        console.log(`İlerleme: ${progress.toFixed(1)}% (${this.processedCount}/${totalCount})`);
      }

      await this.printSummary();
      
    } catch (error) {
      console.error('Migration hatası:', error);
      throw error;
    }
  }

  async processBatch(diaProducts) {
    const bulkOperations = [];

    for (const diaProduct of diaProducts) {
      try {
        const webProductData = this.transformDiaToWeb(diaProduct);
        
        if (webProductData) {
          bulkOperations.push({
            updateOne: {
              filter: { _key: diaProduct._key },
              update: { $set: webProductData },
              upsert: true
            }
          });
        } else {
          this.skippedCount++;
        }

      } catch (error) {
        this.errorCount++;
        this.errors.push({
          _key: diaProduct._key,
          stokkartkodu: diaProduct.stokkartkodu,
          error: error.message
        });
      }
    }

    if (bulkOperations.length > 0) {
      try {
        const result = await WebProduct.bulkWrite(bulkOperations, { 
          ordered: false 
        });
        this.processedCount += result.upsertedCount + result.modifiedCount;
      } catch (error) {
        console.error('Bulk write hatası:', error);
        this.errorCount += bulkOperations.length;
      }
    }
  }

  transformDiaToWeb(diaProduct) {
    if (!diaProduct._key) {
      throw new Error('Missing _key field');
    }

    if (!diaProduct.stokkartkodu) {
      throw new Error('Missing stokkartkodu field');
    }

    if (diaProduct.durum !== 'A') {
      return null;
    }

    if (diaProduct.ozelkod11kodu !== 'E') {
      return null;
    }

    const seoUrl = this.generateSeoUrl(diaProduct.aciklama || diaProduct.stokkartkodu);

    const webCategory = this.determineWebCategory(diaProduct);

    const webTags = this.generateWebTags(diaProduct);

    const featuredImage = this.getFeaturedImage(diaProduct.m_resimler);

    const webProductData = {
      _key: diaProduct._key,
      
      diaData: {
        _key_scf_karebarkod: diaProduct._key_scf_karebarkod,
        _key_scf_marka: diaProduct._key_scf_marka,
        _key_scf_odeme_plani: diaProduct._key_scf_odeme_plani,
        _key_scf_urun_ozellik: diaProduct._key_scf_urun_ozellik,
        _key_sis_ozelkod1: diaProduct._key_sis_ozelkod1,
        _key_sis_ozelkod2: diaProduct._key_sis_ozelkod2,
        _key_sis_ozelkod3: diaProduct._key_sis_ozelkod3,
        _key_sis_ozelkod4: diaProduct._key_sis_ozelkod4,
        _key_sis_ozelkod5: diaProduct._key_sis_ozelkod5,
        _key_sis_ozelkod6: diaProduct._key_sis_ozelkod6,
        _key_sis_ozelkod7: diaProduct._key_sis_ozelkod7,
        _key_sis_ozelkod8: diaProduct._key_sis_ozelkod8,
        _key_sis_ozelkod9: diaProduct._key_sis_ozelkod9,
        _key_sis_ozelkod10: diaProduct._key_sis_ozelkod10,
        _key_sis_ozelkod11: diaProduct._key_sis_ozelkod11,
        _key_sis_resim: diaProduct._key_sis_resim,

        aciklama: diaProduct.aciklama,
        anabarkod: diaProduct.anabarkod,
        barkodu: diaProduct.barkodu,
        durum: diaProduct.durum,
        
        ekalan1: diaProduct.ekalan1,
        ekalan2: diaProduct.ekalan2,
        ekalan3: diaProduct.ekalan3,
        ekalan4: diaProduct.ekalan4,
        ekalan5: diaProduct.ekalan5,
        ekalan6: diaProduct.ekalan6,
        ekalan7: diaProduct.ekalan7,
        ekalan8: diaProduct.ekalan8,
        ekalan9: diaProduct.ekalan9,
        ekalan10: diaProduct.ekalan10,

        gercek_stok: diaProduct.gercek_stok || diaProduct.fiili_stok || 0,
        b2c_indirimorani: parseFloat(diaProduct.b2c_indirimorani) || 0,
        birimindirimorani: diaProduct.birimindirimorani || '',
        marka: diaProduct.marka,
        menseiulkeadi: diaProduct.menseiulkeadi,

        ozelkod1: diaProduct.ozelkod1,
        ozelkod1kodu: diaProduct.ozelkod1kodu,
        ozelkod2: diaProduct.ozelkod2,
        ozelkod2kodu: diaProduct.ozelkod2kodu,
        ozelkod3: diaProduct.ozelkod3,
        ozelkod3kodu: diaProduct.ozelkod3kodu,
        ozelkod4: diaProduct.ozelkod4,
        ozelkod4kodu: diaProduct.ozelkod4kodu,
        ozelkod5: diaProduct.ozelkod5,
        ozelkod5kodu: diaProduct.ozelkod5kodu,
        ozelkod6: diaProduct.ozelkod6,
        ozelkod6kodu: diaProduct.ozelkod6kodu,
        ozelkod7: diaProduct.ozelkod7,
        ozelkod7kodu: diaProduct.ozelkod7kodu,
        ozelkod8: diaProduct.ozelkod8,
        ozelkod8kodu: diaProduct.ozelkod8kodu,
        ozelkod9: diaProduct.ozelkod9,
        ozelkod9kodu: diaProduct.ozelkod9kodu,
        ozelkod10: diaProduct.ozelkod10,
        ozelkod10kodu: diaProduct.ozelkod10kodu,
        ozelkod11: diaProduct.ozelkod11,
        ozelkod11kodu: diaProduct.ozelkod11kodu,

        stokkartkodu: diaProduct.stokkartkodu,
        synced: diaProduct.synced || 'synced',

        m_birimler: diaProduct.m_birimler || [],
        m_kategoriler: diaProduct.m_kategoriler || [],
        m_resimler: diaProduct.m_resimler || [],
        m_urunOzellikleri: diaProduct.m_urunOzellikleri || []
      },

      customData: {
        seoUrl: seoUrl,
        seoTitle: diaProduct.aciklama,
        seoDescription: this.generateSeoDescription(diaProduct),
        seoKeywords: webTags,
        
        webVisible: true,
        webOrder: 0,
        
        webCategory: webCategory,
        webTags: webTags,
        featuredImage: featuredImage,
        
        webDiscount: 0,
        discountType: 'percentage',
        minOrderQuantity: 1,
        stockAlert: 5,
        
        isNew: this.isNewProduct(diaProduct),
        isBestSeller: false,
        isFeatured: false
      },

      syncInfo: {
        lastDiaSync: new Date(),
        diaStatus: 'synced',
        webStatus: 'active',
        syncSource: 'migration_script'
      }
    };

    return webProductData;
  }

  generateSeoUrl(text) {
    if (!text) return null;
    
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/gi, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }

  determineWebCategory(diaProduct) {
    if (!diaProduct.m_kategoriler || diaProduct.m_kategoriler.length === 0) {
      return 'diger';
    }

    const firstCategory = diaProduct.m_kategoriler[0];
    const kategori1 = firstCategory.kategori_aciklama_1?.toLowerCase();
    const kategori2 = firstCategory.kategori_aciklama_2?.toLowerCase();

    if (kategori1?.includes('lastik')) {
      if (kategori2?.includes('yaz')) return 'yaz-lastikleri';
      if (kategori2?.includes('kış')) return 'kis-lastikleri';
      if (kategori2?.includes('oto')) return 'oto-lastikleri';
      return 'lastikler';
    }
    
    if (kategori1?.includes('jant')) return 'jantlar';
    if (kategori1?.includes('akü')) return 'aküler';
    
    return 'diger';
  }

  generateWebTags(diaProduct) {
    const tags = [];
    
    if (diaProduct.marka) {
      tags.push(diaProduct.marka.toLowerCase());
    }
    
    if (diaProduct.ozelkod3kodu) {
      tags.push(diaProduct.ozelkod3kodu.toLowerCase());
    }
    
    if (diaProduct.m_kategoriler && diaProduct.m_kategoriler[0]) {
      const kat = diaProduct.m_kategoriler[0];
      if (kat.kategori_aciklama_1) {
        tags.push(kat.kategori_aciklama_1.toLowerCase());
      }
      if (kat.kategori_aciklama_2) {
        tags.push(kat.kategori_aciklama_2.toLowerCase());
      }
    }

    return [...new Set(tags)];
  }

  generateSeoDescription(diaProduct) {
    const parts = [];
    
    if (diaProduct.marka) parts.push(diaProduct.marka);
    if (diaProduct.aciklama) parts.push(diaProduct.aciklama);
    if (diaProduct.ekalan1) parts.push(diaProduct.ekalan1);
    
    return parts.join(' - ').substring(0, 160);
  }

  getFeaturedImage(images) {
    if (!images || images.length === 0) return null;
    
    const firstImage = images[0];
    return firstImage.aws_url || null;
  }

  isNewProduct(diaProduct) {
    if (diaProduct.ekalan5) {
      const currentYear = new Date().getFullYear();
      const productYear = parseInt(diaProduct.ekalan5);
      return productYear >= currentYear - 1;
    }
    return false;
  }

  async printSummary() {
    console.log('\n📋 MIGRATION ÖZET RAPORU');
    console.log('='.repeat(50));
    console.log(`Başarılı: ${this.processedCount}`);
    console.log(` Atlandı: ${this.skippedCount}`);
    console.log(`Hata: ${this.errorCount}`);
    console.log(`Bitiş: ${new Date().toISOString()}`);

    if (this.errors.length > 0) {
      console.log('\n HATALAR:');
      this.errors.slice(0, 10).forEach(error => {
        console.log(`- ${error.stokkartkodu} (${error._key}): ${error.error}`);
      });
      
      if (this.errors.length > 10) {
        console.log(`... ve ${this.errors.length - 10} hata daha`);
      }
    }

    const webProductCount = await WebProduct.countDocuments();
    console.log(`\n📊 Toplam WebProduct kayıtları: ${webProductCount}`);
  }
}

async function runMigration() {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('MongoDB bağlantısı gerekli');
      return;
    }

    const migration = new DiaToWebProductMigration();
    await migration.migrate();
    
    console.log('Migration başarıyla tamamlandı!');
    
  } catch (error) {
    console.error('Migration başarısız:', error);
    process.exit(1);
  }
}

module.exports = { DiaToWebProductMigration, runMigration };