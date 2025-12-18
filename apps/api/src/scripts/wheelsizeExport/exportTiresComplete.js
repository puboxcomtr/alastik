// apps/api/src/scripts/wheelsizeExport/exportTiresComplete.js

const axios = require('axios');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

// ============================================================================
// YAPILANDIRMA
// ============================================================================

const CONFIG = {
    WHEEL_SIZE_USER_KEY: 'd53fc3695c85571775540c1c9a3ac8c5',
    BASE_URL: 'https://api.wheel-size.com/v2',
    OUTPUT_DIR: path.join(__dirname, '../../../exports/wheelsize'),
    DELAY_MS: 500,
    TIMEOUT_MS: 15000
};

// ============================================================================
// YARDIMCI FONKSİYONLAR
// ============================================================================

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const log = {
    info: (msg) => console.log(`[BİLGİ] ${msg}`),
    success: (msg) => console.log(`[✓] ${msg}`),
    error: (msg) => console.error(`[HATA] ${msg}`),
    warning: (msg) => console.warn(`[!] ${msg}`),
    progress: (current, total, msg) => console.log(`[${current}/${total}] ${msg}`)
};

async function apiRequest(endpoint) {
    try {
        const response = await axios.get(`${CONFIG.BASE_URL}${endpoint}`, {
            params: {
                user_key: CONFIG.WHEEL_SIZE_USER_KEY
            },
            timeout: CONFIG.TIMEOUT_MS
        });
        return response.data.data || response.data;
    } catch (error) {
        log.error(`API Hatası [${endpoint}]: ${error.message}`);
        return null;
    }
}

// ============================================================================
// MARKA LİSTESİNİ ÇEK
// ============================================================================

async function getTireBrands() {
    log.info('Lastik markaları getiriliyor...');

    const brands = await apiRequest('/tires/catalog/');

    if (!brands || brands.length === 0) {
        log.error('Marka verisi alınamadı!');
        return [];
    }

    log.success(`${brands.length} lastik markası bulundu`);
    return brands;
}

// ============================================================================
// MARKA MODELLERİNİ ÇEK
// ============================================================================

async function getBrandModels(brandSlug) {
    const models = await apiRequest(`/tires/catalog/${brandSlug}/`);
    return models || [];
}

// ============================================================================
// EXCEL DOSYASI OLUŞTUR
// ============================================================================

async function createExcelFile(brandsData) {
    log.info('Excel dosyası oluşturuluyor...');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ALastik.com';
    workbook.created = new Date();

    // 1. ÖZET SAYFASI
    const summarySheet = workbook.addWorksheet('Marka Özeti');
    summarySheet.columns = [
        { header: 'Sıra', key: 'no', width: 8 },
        { header: 'Marka Adı', key: 'name', width: 25 },
        { header: 'Slug', key: 'slug', width: 25 },
        { header: 'Fiyat Segmenti', key: 'segment', width: 15 },
        { header: 'Model Sayısı', key: 'count', width: 15 },
        { header: 'Durum', key: 'status', width: 20 }
    ];

    // Başlık stili
    const headerRow = summarySheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // 2. TÜM MODELLERİ SAYFASI
    const allModelsSheet = workbook.addWorksheet('Tüm Lastik Modelleri');
    allModelsSheet.columns = [
        { header: 'Sıra', key: 'no', width: 8 },
        { header: 'Marka', key: 'brand', width: 25 },
        { header: 'Model Adı', key: 'model', width: 40 },
        { header: 'Model Slug', key: 'slug', width: 40 },
        { header: 'Sezon', key: 'season', width: 15 },
        { header: 'Araç Tipi', key: 'type', width: 15 }
    ];

    const dataHeaderRow = allModelsSheet.getRow(1);
    dataHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    dataHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF70AD47' }
    };
    dataHeaderRow.alignment = { vertical: 'middle', horizontal: 'center' };
    dataHeaderRow.height = 25;

    let totalModels = 0;
    let modelNo = 1;

    // Verileri ekle
    brandsData.forEach((brand, index) => {
        // Özet sayfasına ekle
        const summaryRow = summarySheet.addRow({
            no: index + 1,
            name: brand.display || brand.name || brand.slug,
            slug: brand.slug,
            segment: brand.price_segment || '-',
            count: brand.models.length,
            status: brand.models.length > 0 ? 'Model Var' : 'Model Yok'
        });

        // Renklendirme
        if (brand.models.length === 0) {
            summaryRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFC7CE' }
            };
        }

        // Modelleri ekle
        if (brand.models.length > 0) {
            brand.models.forEach(model => {
                allModelsSheet.addRow({
                    no: modelNo++,
                    brand: brand.display || brand.name || brand.slug,
                    model: model.name || model.display || model.slug,
                    slug: model.slug,
                    season: model.season || '-',
                    type: model.automobile_type || '-'
                });
                totalModels++;
            });
        }
    });

    // Toplam satırı
    summarySheet.addRow({});
    const totalRow = summarySheet.addRow({
        no: '',
        name: 'TOPLAM',
        slug: '',
        segment: '',
        count: totalModels,
        status: `${brandsData.length} marka`
    });
    totalRow.font = { bold: true, size: 13 };
    totalRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' }
    };

    // Filtre ekle
    summarySheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: summarySheet.rowCount, column: 6 }
    };

    allModelsSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: allModelsSheet.rowCount, column: 6 }
    };

    // Dosyayı kaydet
    if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
        fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
    }

    const fileName = `lastik_katalog_${new Date().toISOString().split('T')[0]}.xlsx`;
    const filePath = path.join(CONFIG.OUTPUT_DIR, fileName);

    await workbook.xlsx.writeFile(filePath);

    return {
        filePath,
        fileName,
        totalBrands: brandsData.length,
        totalModels
    };
}

// ============================================================================
// ANA FONKSİYON
// ============================================================================

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('  LASTİK MARKA VE MODEL KATALOG EXPORT');
    console.log('='.repeat(70) + '\n');

    const startTime = Date.now();

    try {
        // 1. Markaları çek
        const brands = await getTireBrands();

        if (brands.length === 0) {
            log.error('Hiç marka bulunamadı. İşlem sonlandırılıyor.');
            return;
        }

        log.info(`\n${brands.length} marka için model verileri çekiliyor...\n`);

        // 2. Her marka için modelleri çek
        const brandsWithModels = [];
        let successCount = 0;
        let totalFetched = 0;

        for (let i = 0; i < brands.length; i++) {
            const brand = brands[i];
            const brandName = brand.display || brand.name || brand.slug;

            log.progress(i + 1, brands.length, `"${brandName}" işleniyor...`);

            const models = await getBrandModels(brand.slug);

            brandsWithModels.push({
                ...brand,
                models: models
            });

            if (models.length > 0) {
                successCount++;
                totalFetched += models.length;
                log.success(`  ${models.length} model bulundu`);
            } else {
                log.warning('  Model bulunamadı');
            }

            // Rate limit için bekle
            if (i < brands.length - 1) {
                await delay(CONFIG.DELAY_MS);
            }
        }

        console.log('\n' + '-'.repeat(70) + '\n');

        // 3. Excel dosyası oluştur
        const result = await createExcelFile(brandsWithModels);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        // Sonuç
        console.log('='.repeat(70));
        console.log('  İŞLEM BAŞARIYLA TAMAMLANDI');
        console.log('='.repeat(70) + '\n');

        console.log(`Toplam Marka         : ${result.totalBrands}`);
        console.log(`Model Bulunan        : ${successCount}`);
        console.log(`Model Bulunamayan    : ${brands.length - successCount}`);
        console.log(`Toplam Model         : ${result.totalModels}`);
        console.log(`\nDosya Adı            : ${result.fileName}`);
        console.log(`Dosya Konumu         : ${result.filePath}`);
        console.log(`İşlem Süresi         : ${duration} saniye\n`);

        log.success('Excel dosyası başarıyla oluşturuldu! 🎉\n');

    } catch (error) {
        console.log('\n' + '='.repeat(70));
        log.error('Beklenmeyen hata oluştu!');
        console.log('='.repeat(70) + '\n');
        console.error(error);
    }
}

// Script'i çalıştır
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { getTireBrands, getBrandModels, createExcelFile, main };