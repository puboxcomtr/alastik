// montaj.xlsx → webmontagepoints (lastikjantavm). Kullanım: node import-montaj.js [--apply]
require('dotenv').config({ path: '/var/www/alastik/apps/api/.env.production' });
const fs = require('fs');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');

const SRC = '/var/www/alastik/apps/montaj-noktalari-sablon.xlsx';
const REPORT = '/var/www/alastik/apps/montaj-import-rapor.xlsx';
const BACKUP = '/var/www/alastik/tools/montaj/backup-lja-montaj-' + new Date().toISOString().slice(0, 10) + '.json';
const SITE = 'lastikjantavm';
const APPLY = process.argv.includes('--apply');

const COL = { name: 0, city: 1, district: 2, address: 3, phone: 4, wdOpen: 5, wdClose: 6, satOpen: 7, satClose: 8, sunOpen: 9, sunClose: 10, servicesFrom: 11, servicesTo: 30, waitingRoom: 31, wifi: 32, ac: 33, refreshments: 34, wc: 35 };
// Atlanacak hizmet sütunları (0 tabanlı): 600.112 ve iki 600.113 (mobil hizmetler katalogda yok)
const SKIP_SERVICE_COLS = new Set([22, 23, 24]);
const AMENITY_COLS = { waiting_room: COL.waitingRoom, wifi: COL.wifi, air_conditioning: COL.ac, refreshments: COL.refreshments, wc: COL.wc };
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

// Yazım hatası düzeltmeleri (dosyadaki değer → adres veritabanındaki ad)
const CITY_FIX = { 'istnabul': 'İstanbul', 'afyon': 'Afyonkarahisar', 'affyonkarahisar': 'Afyonkarahisar', 'buca': 'İzmir' };
const DISTRICT_FIX = { 'erdemit': 'Edremit', 'etimeskurt': 'Etimesgut', 'yüregir': 'Yüreğir', 'yahşıhan': 'Yahşihan', 'yahşihan': 'Yahşihan' };
const DISTRICT_FROM_CITY_FIX = { 'buca': 'Buca' };
// Sütun başlığındaki SKU → katalog SKU (başlık hatalı/eksik olanlar)
const SKU_FIX = { '600.109': '600.201', '600.110': '600.202', '600.111': '600.203' };

const trNorm = v => String(v ?? '').replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase().replace(/\s+/g, ' ').trim();
const trTitle = s => String(s).toLocaleLowerCase('tr-TR').replace(/(^|[\s\-\/\(\.])(\S)/g, (m, p, c) => p + c.toLocaleUpperCase('tr-TR'));

const normalizePhone = (value) => {
    if (!String(value || '').trim()) return '';
    let digits = String(value).replace(/\D/g, '').replace(/^0+/, '');
    if (digits.startsWith('90')) digits = digits.slice(2);
    digits = digits.replace(/^0+/, '');
    if (digits.length !== 10) return null;
    return `+90 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
};

// Excel hücresi: metin "09.00" / "KAPALI" / "07.00-24.00" ya da tarih olarak yorumlanmış sayı (08.30 → 30 Ağustos)
const cellTime = (ws, R, C) => {
    const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
    if (!cell) return { open: '', close: '' , raw: '' };
    if (cell.t === 'n') {
        const d = XLSX.SSF.parse_date_code(cell.v);
        return { single: `${String(d.m).padStart(2, '0')}:${String(d.d).padStart(2, '0')}`, raw: cell.w };
    }
    const s = String(cell.v).trim();
    if (!s || /kapalı|kapali|hayır/i.test(s)) return { single: '', raw: s };
    const range = s.match(/^(\d{1,2})[.:](\d{2})\s*-\s*(\d{1,2})[.:](\d{2})$/);
    if (range) return { range: [fmt(range[1], range[2]), fmt(range[3], range[4])], raw: s };
    const one = s.match(/^(\d{1,2})[.:](\d{2})(?::\d{2})?$/);
    if (one) return { single: fmt(one[1], one[2]), raw: s };
    return { invalid: true, raw: s };
};
const fmt = (h, mi) => { let H = Number(h); if (H === 24) return '23:59'; return `${String(H).padStart(2, '0')}:${mi}`; };

const parsePrice = (v) => {
    const s = String(v).replace(/₺|tl/gi, '').trim();
    if (!s) return null;
    // "1.000" → 1000, "1,200.00" → 1200, "250,00" → 250, "312.50" → 312.5
    const lastSep = Math.max(s.lastIndexOf('.'), s.lastIndexOf(','));
    let n = s;
    if (lastSep >= 0) {
        const decimals = s.slice(lastSep + 1);
        n = /^\d{2}$/.test(decimals) && !/^\d{3}$/.test(decimals)
            ? s.slice(0, lastSep).replace(/[.,]/g, '') + '.' + decimals
            : s.replace(/[.,]/g, '');
    }
    const num = Number(n);
    return Number.isFinite(num) ? num : null;
};

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const wb = XLSX.readFile(SRC);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    const header = rows[0];
    const FIRST_ROW = 1;

    const [cities, districts, products] = await Promise.all([
        db.collection('address_cities').find().toArray(),
        db.collection('address_districts').find().toArray(),
        db.collection('webproducts').find({ 'diaData.durum': 'A' }, { projection: { _key: 1, 'diaData.stokkartkodu': 1, 'diaData.aciklama': 1, 'diaData.m_birimler': 1, 'customData.webPrice': 1, 'diaData.m_kategoriler.kategori_aciklama_1': 1 } }).toArray()
    ]);
    const cityByName = new Map(cities.map(c => [trNorm(c.cityName), c]));
    const distByCity = new Map();
    districts.forEach(d => { const k = String(d.cityId); if (!distByCity.has(k)) distByCity.set(k, new Map()); distByCity.get(k).set(trNorm(d.districtName), d); });
    const bySku = new Map();
    products.forEach(p => {
        const sku = p.diaData?.stokkartkodu; if (!sku) return;
        const unit = p.diaData?.m_birimler?.[0] || {};
        bySku.set(sku, { productKey: String(p._key), sku, name: p.diaData?.aciklama || sku, defaultPrice: Math.round(Number(p.customData?.webPrice || unit.fiyat4 || unit.fiyat1 || 0) * 100) / 100, category: p.diaData?.m_kategoriler?.[0]?.kategori_aciklama_1 || '' });
    });

    // Hizmet sütunları
    const serviceCols = [];
    for (let c = COL.servicesFrom; c <= COL.servicesTo; c++) {
        if (SKIP_SERVICE_COLS.has(c)) continue;
        const hdrSku = String(header[c]).split(/\s/)[0].trim();
        const sku = SKU_FIX[`${c}:${hdrSku}`] || SKU_FIX[hdrSku] || hdrSku;
        serviceCols.push({ c, hdrSku, sku, hdr: String(header[c]).replace(/\s+/g, ' ').trim(), product: bySku.get(sku) || null });
    }

    const docs = [];
    const report = [];
    const seen = new Map();
    for (let R = FIRST_ROW; R < rows.length; R++) {
        const x = rows[R];
        const line = R + 1;
        const issues = [];
        const name = String(x[COL.name]).trim() || '';
        if (!name) { report.push({ line, name: '', status: 'ATLANDI', issues: 'Bayi Adı boş' }); continue; }
        const key = trNorm(name);
        if (seen.has(key)) { report.push({ line, name, status: 'ATLANDI', issues: `Aynı bayi ${seen.get(key)}. satırda zaten var` }); continue; }
        seen.set(key, line);

        const doc = { site: SITE, name: trTitle(name), workingSchedule: {}, services: [], amenities: [], image: '', documents: [], reviews: [], location: { lat: null, lng: null }, isActive: true, order: 0 };

        // İl / ilçe
        const rawCity = String(x[COL.city]).trim();
        const rawDistrict = String(x[COL.district]).trim();
        let cityName = CITY_FIX[trNorm(rawCity)] || rawCity;
        let districtName = DISTRICT_FROM_CITY_FIX[trNorm(rawCity)] || DISTRICT_FIX[trNorm(rawDistrict)] || rawDistrict;
        if (cityName !== rawCity) issues.push(`İl düzeltildi: "${rawCity}" → ${cityName}`);
        if (districtName !== rawDistrict) issues.push(`İlçe düzeltildi: "${rawDistrict}" → ${districtName}`);
        const cityDoc = cityByName.get(trNorm(cityName));
        if (!cityDoc) { report.push({ line, name, status: 'ATLANDI', issues: `İl bulunamadı: "${rawCity}"` }); continue; }
        doc.city = cityDoc.cityName; doc.cityId = String(cityDoc.cityId);
        doc.district = ''; doc.districtId = '';
        if (districtName) {
            const dDoc = distByCity.get(doc.cityId)?.get(trNorm(districtName));
            if (dDoc) { doc.district = dDoc.districtName; doc.districtId = String(dDoc.districtId); }
            else issues.push(`İlçe bulunamadı, boş bırakıldı: "${rawDistrict}"`);
        }
        doc.address = String(x[COL.address]).trim();

        const phone = normalizePhone(x[COL.phone]);
        if (phone === null) { issues.push(`Telefon geçersiz, boş bırakıldı: "${x[COL.phone]}"`); doc.phone = ''; } else doc.phone = phone;

        // Çalışma saatleri
        const sched = (label, cOpen, cClose, days) => {
            const o = cellTime(ws, R, cOpen), c = cellTime(ws, R, cClose);
            let open = '', close = '';
            if (o.invalid || c.invalid) { issues.push(`${label} saati okunamadı: "${o.raw}" / "${c.raw}"`); }
            else if (o.range || c.range) { [open, close] = o.range || c.range; }
            else { open = o.single || ''; close = c.single || ''; if ((open && !close) || (!open && close)) { issues.push(`${label} açılış/kapanış eksik ("${o.raw}"/"${c.raw}"), kapalı sayıldı`); open = close = ''; } }
            days.forEach(d => { doc.workingSchedule[d] = { open, close }; });
        };
        sched('Hafta içi', COL.wdOpen, COL.wdClose, WEEKDAYS);
        sched('Cumartesi', COL.satOpen, COL.satClose, ['saturday']);
        sched('Pazar', COL.sunOpen, COL.sunClose, ['sunday']);

        // Hizmetler: fiyat → o fiyatla; EVET/var/adet/araç başı → varsayılan fiyat; ücretsiz → 0; HAYIR/boş → yok
        for (const sc of serviceCols) {
            const v = String(x[sc.c]).trim();
            const vn = trNorm(v);
            if (!vn || ['hayır', 'hayir', 'hizmet yok', 'yok'].includes(vn)) continue;
            let price = null;
            if (vn.includes('ücretsiz')) price = 0;
            else if (/\d/.test(v)) {
                const numPart = v.match(/[\d.,]+/)[0];
                price = parsePrice(numPart);
                if (price === null) { issues.push(`Hizmet fiyatı okunamadı (${sc.sku}): "${v}"`); continue; }
                if (numPart !== v.replace(/₺|tl/gi, '').trim()) issues.push(`Hizmet fiyatı metinden ayıklandı (${sc.sku}): "${v}" → ${price}`);
            }
            else if (!['evet', 'var', 'adet', 'araç başı', 'arac basi'].includes(vn)) { issues.push(`Hizmet hücresi anlaşılamadı (${sc.sku}): "${v}"`); continue; }
            if (!sc.product) { issues.push(`Hizmet katalogda yok, atlandı: ${sc.sku}`); continue; }
            if (doc.services.some(s => s.sku === sc.product.sku)) continue;
            doc.services.push({ productKey: sc.product.productKey, sku: sc.product.sku, name: sc.product.name, defaultPrice: sc.product.defaultPrice, price: price !== null && price !== sc.product.defaultPrice ? price : null });
        }

        for (const [amenity, c] of Object.entries(AMENITY_COLS)) {
            if (/^(evet|var)$/i.test(String(x[c]).trim())) doc.amenities.push(amenity);
        }
        doc.order = docs.length;
        docs.push(doc);
        report.push({ line, name: doc.name, status: 'AKTARILDI', city: doc.city, district: doc.district, phone: doc.phone, services: doc.services.length, amenities: doc.amenities.join(', '), issues: issues.join(' | ') });
    }

    // Rapor
    const rwb = new ExcelJS.Workbook();
    const r1 = rwb.addWorksheet('Satırlar');
    r1.columns = [{ header: 'Excel satırı', key: 'line', width: 12 }, { header: 'Bayi', key: 'name', width: 34 }, { header: 'Durum', key: 'status', width: 12 }, { header: 'İl', key: 'city', width: 16 }, { header: 'İlçe', key: 'district', width: 16 }, { header: 'Telefon', key: 'phone', width: 20 }, { header: 'Hizmet sayısı', key: 'services', width: 12 }, { header: 'Olanaklar', key: 'amenities', width: 40 }, { header: 'Notlar', key: 'issues', width: 120 }];
    report.forEach(r => r1.addRow(r));
    r1.getRow(1).font = { bold: true };
    const r2 = rwb.addWorksheet('Hizmet sütunları');
    r2.columns = [{ header: 'Sütun', key: 'c', width: 8 }, { header: 'Başlıktaki SKU', key: 'hdrSku', width: 14 }, { header: 'Başlık', key: 'hdr', width: 70 }, { header: 'Katalog SKU', key: 'sku', width: 14 }, { header: 'Katalog adı', key: 'name', width: 70 }, { header: 'Katalog fiyatı', key: 'price', width: 14 }, { header: 'Kategori', key: 'cat', width: 16 }, { header: 'Kaç bayide', key: 'n', width: 12 }];
    serviceCols.forEach(sc => r2.addRow({ c: sc.c + 1, hdrSku: sc.hdrSku, hdr: sc.hdr, sku: sc.product?.sku || 'YOK', name: sc.product?.name || '', price: sc.product?.defaultPrice ?? '', cat: sc.product?.category || '', n: docs.filter(d => sc.product && d.services.some(s => s.sku === sc.product.sku)).length }));
    r2.getRow(1).font = { bold: true };
    await rwb.xlsx.writeFile(REPORT);

    const skipped = report.filter(r => r.status === 'ATLANDI');
    console.log(`Excel satırı: ${rows.length - 2} | aktarılacak: ${docs.length} | atlanan: ${skipped.length} | notlu satır: ${report.filter(r => r.issues).length}`);
    skipped.forEach(r => console.log('  ATLANDI', r.line, r.name, '-', r.issues));
    console.log('rapor:', REPORT);

    if (APPLY) {
        const col = db.collection('webmontagepoints');
        const old = await col.find({ site: SITE }).toArray();
        fs.writeFileSync(BACKUP, JSON.stringify(old, null, 1));
        const del = await col.deleteMany({ site: SITE });
        const now = new Date();
        const ins = await col.insertMany(docs.map(d => ({ ...d, createdAt: now, updatedAt: now, __v: 0 })));
        console.log(`yedek: ${BACKUP} (${old.length}) | silindi: ${del.deletedCount} | eklendi: ${ins.insertedCount}`);
    } else {
        console.log('DENEME MODU — veritabanına yazılmadı (--apply ile uygula)');
    }
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
