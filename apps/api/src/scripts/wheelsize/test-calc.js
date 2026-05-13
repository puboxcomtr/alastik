const mongoose = require('mongoose');
const path = require('path');
const WheelSizeService = require('../../services/plugins/wheelsize/WheelSizeService');

require('dotenv').config({ path: path.join(__dirname, '../../../.env.production') });

/**
 * Lastik çapı (mm) hesaplar
 * Formül: rim_diameter_inch × 25.4 + 2 × (section_width × aspect_ratio / 100)
 */
function calcTireDiameter(width, aspectRatio, rimDiameter) {
    const sidewallHeight = (width * aspectRatio) / 100;
    const rimMm = rimDiameter * 25.4;
    return rimMm + (2 * sidewallHeight);
}

/**
 * Çevre (mm)
 */
function calcCircumference(diameter) {
    return diameter * Math.PI;
}

/**
 * Çap farkı yüzdesi
 */
function calcDiameterDiff(original, target) {
    return ((target - original) / original) * 100;
}

/**
 * Hız göstergesi sapması (km/h - 100 km/h referans)
 */
function calcSpeedoDiff(originalCirc, targetCirc, refSpeed = 100) {
    return (refSpeed * targetCirc / originalCirc) - refSpeed;
}

/**
 * Uygunluk değerlendirmesi
 */
function evaluateFitment(diffPercent) {
    const abs = Math.abs(diffPercent);
    if (abs <= 2) return { status: 'safe', label: 'Uygun - Güvenle Kullanılabilir', color: 'green' };
    if (abs <= 3) return { status: 'warning', label: 'Sınırda - Dikkatli Kullanılmalı', color: 'yellow' };
    return { status: 'danger', label: 'Uygun Değil - Önerilmez', color: 'red' };
}

async function test() {
    try {
        console.log('\n=== WHEELSIZE LASTIK HESAPLAMA TESTI ===\n');

        console.log('1. Section Width (Lastik Tabanı) listesi çekiliyor...');
        const widths = await WheelSizeService.getTireSectionWidths();
        console.log(`✓ ${widths.length} adet width değeri`);
        console.log(`  Örnek: ${widths.slice(0, 8).map(w => w.value).join(', ')}...\n`);

        console.log('2. Aspect Ratio (Lastik Yanağı) listesi çekiliyor...');
        const ratios = await WheelSizeService.getTireAspectRatios();
        console.log(`✓ ${ratios.length} adet aspect ratio`);
        console.log(`  Örnek: ${ratios.slice(0, 8).map(r => r.value).join(', ')}...\n`);

        console.log('3. Rim Diameter (Jant Çapı) listesi çekiliyor...');
        const rims = await WheelSizeService.getTireRimDiameters();
        console.log(`✓ ${rims.length} adet rim diameter`);
        console.log(`  Örnek: ${rims.slice(0, 8).map(r => r.value).join(', ')}...\n`);

        console.log('=== HESAPLAMA TESTLERI ===\n');

        const testCases = [
            { name: 'Aynı Ebat', orig: [205, 55, 16], target: [205, 55, 16] },
            { name: 'Görseldeki Test (195/65R15 → 205/55R16)', orig: [195, 65, 15], target: [205, 55, 16] },
            { name: 'Plus Sizing (205/55R16 → 225/45R17)', orig: [205, 55, 16], target: [225, 45, 17] },
            { name: 'Uyumsuz (195/65R15 → 245/40R18)', orig: [195, 65, 15], target: [245, 40, 18] },
            { name: 'Sınırda (205/55R16 → 215/55R16)', orig: [205, 55, 16], target: [215, 55, 16] }
        ];

        testCases.forEach((tc, i) => {
            const origDia = calcTireDiameter(...tc.orig);
            const targetDia = calcTireDiameter(...tc.target);
            const origCirc = calcCircumference(origDia);
            const targetCirc = calcCircumference(targetDia);
            const diff = calcDiameterDiff(origDia, targetDia);
            const speedo = calcSpeedoDiff(origCirc, targetCirc);
            const fit = evaluateFitment(diff);

            console.log(`Test ${i + 1}: ${tc.name}`);
            console.log(`  Mevcut: ${tc.orig[0]}/${tc.orig[1]}R${tc.orig[2]} → Çap: ${origDia.toFixed(1)} mm`);
            console.log(`  Yeni:   ${tc.target[0]}/${tc.target[1]}R${tc.target[2]} → Çap: ${targetDia.toFixed(1)} mm`);
            console.log(`  Çap Farkı: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}%`);
            console.log(`  Hız Sapması (100 km/h ref): ${speedo > 0 ? '+' : ''}${speedo.toFixed(2)} km/h`);
            console.log(`  Durum: ${fit.label} [${fit.color}]\n`);
        });

        console.log('=== TEST TAMAMLANDI ===\n');
        process.exit(0);

    } catch (error) {
        console.error('\n!!! HATA !!!');
        console.error('Mesaj:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

test();