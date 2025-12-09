#!/usr/bin/env node
/**
 * MongoDB Model Duplicate Index Düzeltme Scripti
 * Bu script tüm model dosyalarındaki "index: true" tanımlarını kaldırır
 */

const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '../apps/api/src/models');

// Düzeltilecek pattern'lar
const patterns = [
  // Tek satırda index: true
  { 
    regex: /,\s*index:\s*true/g, 
    replacement: '' 
  },
  // Çok satırlı index: true
  { 
    regex: /,\s*\n\s*index:\s*true/g, 
    replacement: '' 
  },
  // İlk alan olarak index: true
  { 
    regex: /index:\s*true,\s*/g, 
    replacement: '' 
  }
];

function fixDuplicateIndexes(filePath) {
  console.log(`🔧 Düzeltiliyor: ${path.basename(filePath)}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let changesCount = 0;
  
  // Her pattern için düzeltme yap
  patterns.forEach(pattern => {
    const matches = content.match(pattern.regex);
    if (matches) {
      content = content.replace(pattern.regex, pattern.replacement);
      changesCount += matches.length;
    }
  });
  
  // Eğer değişiklik varsa dosyayı kaydet
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${changesCount} duplicate index düzeltildi: ${path.basename(filePath)}`);
    return changesCount;
  } else {
    console.log(`ℹ️  Değişiklik yok: ${path.basename(filePath)}`);
    return 0;
  }
}

function main() {
  console.log('🚀 MongoDB Duplicate Index Düzeltme Scripti Başlatılıyor...');
  console.log(`📂 Models dizini: ${modelsDir}`);
  
  if (!fs.existsSync(modelsDir)) {
    console.error('❌ Models dizini bulunamadı:', modelsDir);
    process.exit(1);
  }
  
  const files = fs.readdirSync(modelsDir);
  const jsFiles = files.filter(file => file.endsWith('.js'));
  
  console.log(`📄 Bulunan model dosyaları: ${jsFiles.length}`);
  console.log('─'.repeat(50));
  
  let totalChanges = 0;
  let processedFiles = 0;
  
  jsFiles.forEach(file => {
    const filePath = path.join(modelsDir, file);
    try {
      const changes = fixDuplicateIndexes(filePath);
      totalChanges += changes;
      processedFiles++;
    } catch (error) {
      console.error(`❌ Hata (${file}):`, error.message);
    }
  });
  
  console.log('─'.repeat(50));
  console.log('📊 Özet:');
  console.log(`   İşlenen dosya: ${processedFiles}/${jsFiles.length}`);
  console.log(`   Toplam düzeltme: ${totalChanges}`);
  
  if (totalChanges > 0) {
    console.log('🎉 Duplicate indexler başarıyla düzeltildi!');
    console.log('💡 Şimdi sunucuyu yeniden başlatın: npm run dev:api');
  } else {
    console.log('ℹ️  Düzeltilecek duplicate index bulunamadı.');
  }
}

// Script çalıştırma
if (require.main === module) {
  main();
}

module.exports = { fixDuplicateIndexes, main };