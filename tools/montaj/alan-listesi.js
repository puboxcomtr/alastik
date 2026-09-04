require('dotenv').config({ path: '/var/www/alastik/apps/api/.env.production' });
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const OUT = '/var/www/alastik/montaj-noktalari-alanlar.xlsx';
const SITE = 'lastikjantavm';
const DAYS = [['monday', 'Pazartesi'], ['tuesday', 'Salı'], ['wednesday', 'Çarşamba'], ['thursday', 'Perşembe'], ['friday', 'Cuma'], ['saturday', 'Cumartesi'], ['sunday', 'Pazar']];
const AMENITIES = { wc: 'WC', waiting_room: 'Bekleme Salonu', wifi: 'Wi-Fi', air_conditioning: 'Klima', refreshments: 'İkram', oil_change: 'Yağ Değişimi', headlight_check: 'Far Kontrolü' };

const FIELDS = [
    ['name', 'Evet', 'Metin', 'Montaj noktası adı', 'LastikJantAVM Mecidiyeköy (Merkez)', d => d.name],
    ['city', 'Evet', 'Metin', 'İl (adres veritabanındaki il adıyla birebir)', 'İstanbul', d => d.city],
    ['district', 'Hayır', 'Metin', 'İlçe (adres veritabanındaki ilçe adıyla birebir)', 'Şişli', d => d.district],
    ['address', 'Hayır', 'Metin', 'Açık adres', 'Gülbahar Mah. Galataderesi Cad. No:51/B', d => d.address],
    ['phone', 'Hayır', 'Metin', 'Telefon', '0212 212 08 08', d => d.phone],
    ['workingSchedule', 'Hayır', 'Saat (HH:MM)', 'Excel sütunları: Hafta İçi / Cumartesi / Pazar Açılış-Kapanış; boş = kapalı', '09:00 / 19:00', d => d.workingSchedule?.monday?.open],
    ['services', 'Hayır', 'Liste', 'Excel sütunu: Hizmetler — SKU veya hizmet adı, virgülle ayrılmış (Hizmetler sayfasına bakın). Noktaya özel fiyat için SKU:fiyat', '600.16, 600.09, 600.10:900', d => d.services?.length],
    ['amenities', 'Hayır', 'Liste', 'Excel sütunu: Olanaklar — virgülle: ' + Object.values(AMENITIES).join(', '), 'wc, wifi, waiting_room', d => d.amenities?.length],
    ['image', 'Hayır', 'Dosya yolu', 'Görsel — Excel ile aktarılmaz, panelden yüklenir', '', d => d.image],
    ['documents', 'Hayır', 'Dosya', 'Sözleşme/evrak dosyaları — Excel ile aktarılamaz, panelden yüklenir', '', d => d.documents?.length],
    ['reviews', 'Hayır', 'Liste', 'Yorumlar — Excel ile aktarılmaz', '', d => d.reviews?.length],
    ['location.lat', 'Hayır', 'Sayı', 'Harita enlem', '41.0672', d => d.location?.lat],
    ['location.lng', 'Hayır', 'Sayı', 'Harita boylam', '28.9948', d => d.location?.lng],
    ['isActive', 'Hayır', 'Evet/Hayır', 'Vitrinde göster (varsayılan Evet)', 'Evet', d => d.isActive],
    ['order', 'Hayır', 'Sayı', 'Sıralama (küçük önce)', '0', d => d.order],
];

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const db = mongoose.connection.db;
    const docs = await db.collection('webmontagepoints').find({ site: SITE }).sort({ order: 1, name: 1 }).toArray();
    const services = await db.collection('webproducts').find(
        { 'diaData.durum': 'A', 'diaData.m_kategoriler.kategori_aciklama_1': 'Hizmetlerimiz' },
        { projection: { 'diaData.stokkartkodu': 1, 'diaData.aciklama': 1, 'diaData.m_birimler': 1, 'customData.webPrice': 1 } }
    ).sort({ 'diaData.aciklama': 1 }).toArray();

    const wb = new ExcelJS.Workbook();
    const head = (ws) => { ws.getRow(1).font = { bold: true }; ws.views = [{ state: 'frozen', ySplit: 1 }]; };

    // 1) Alanlar
    const ws1 = wb.addWorksheet('Alanlar');
    ws1.columns = [
        { header: 'Alan', key: 'f', width: 20 }, { header: 'Zorunlu', key: 'r', width: 9 }, { header: 'Tür', key: 't', width: 14 },
        { header: 'Açıklama', key: 'd', width: 80 }, { header: 'Örnek', key: 'e', width: 36 },
        { header: `LJA'da dolu (${docs.length} kayıt)`, key: 'c', width: 18 }
    ];
    for (const [f, r, t, d, e, pick] of FIELDS) {
        const filled = docs.filter(x => { const v = pick(x); return v !== undefined && v !== null && v !== '' && v !== 0 && v !== false; }).length;
        ws1.addRow({ f, r, t, d, e, c: filled });
    }
    head(ws1);

    // 2) Şablon
    const ws2 = wb.addWorksheet('Sablon');
    const cols = ['Bayi Adı', 'İl', 'İlçe', 'Adres', 'Telefon', 'Hafta İçi Açılış', 'Hafta İçi Kapanış', 'Cumartesi Açılış', 'Cumartesi Kapanış', 'Pazar Açılış', 'Pazar Kapanış', 'Hizmetler', 'Olanaklar', 'Enlem', 'Boylam', 'Sıra', 'Aktif'];
    ws2.columns = cols.map(c => ({ header: c, key: c, width: c === 'Adres' ? 50 : c === 'Hizmetler' ? 40 : c === 'Olanaklar' ? 30 : c.includes('Açılış') || c.includes('Kapanış') ? 14 : 22 }));
    ws2.addRow({ 'Bayi Adı': 'Örnek Bayi', 'İl': 'İstanbul', 'İlçe': 'Şişli', 'Adres': 'Örnek Mah. Örnek Cad. No:1', 'Telefon': '0212 000 00 00', 'Hafta İçi Açılış': '09:00', 'Hafta İçi Kapanış': '19:00', 'Cumartesi Açılış': '09:00', 'Cumartesi Kapanış': '17:00', 'Pazar Açılış': '', 'Pazar Kapanış': '', 'Hizmetler': '600.16, 600.09, 600.10:900', 'Olanaklar': 'WC, Wi-Fi, Bekleme Salonu', 'Enlem': 41.0672, 'Boylam': 28.9948, 'Sıra': 0, 'Aktif': 'Evet' });
    head(ws2);

    // 3) Mevcut LJA kayıtları
    const ws3 = wb.addWorksheet('Mevcut LJA');
    ws3.columns = ws2.columns.map(c => ({ header: c.header, key: c.key, width: c.width }));
    for (const d of docs) {
        const ws = d.workingSchedule || {};
        ws3.addRow({
            'Bayi Adı': d.name, 'İl': d.city, 'İlçe': d.district, 'Adres': d.address, 'Telefon': d.phone,
            'Hafta İçi Açılış': ws.monday?.open || '', 'Hafta İçi Kapanış': ws.monday?.close || '',
            'Cumartesi Açılış': ws.saturday?.open || '', 'Cumartesi Kapanış': ws.saturday?.close || '',
            'Pazar Açılış': ws.sunday?.open || '', 'Pazar Kapanış': ws.sunday?.close || '',
            'Hizmetler': (d.services || []).map(s => s.price != null ? `${s.sku}:${s.price}` : s.sku).join(', '),
            'Olanaklar': (d.amenities || []).map(a => AMENITIES[a] || a).join(', '),
            'Enlem': d.location?.lat ?? '', 'Boylam': d.location?.lng ?? '',
            'Sıra': d.order ?? 0, 'Aktif': d.isActive ? 'Evet' : 'Hayır'
        });
    }
    head(ws3);

    // 4) Hizmetler
    const ws4 = wb.addWorksheet('Hizmetler');
    ws4.columns = [{ header: 'SKU', key: 's', width: 12 }, { header: 'Hizmet Adı', key: 'n', width: 70 }, { header: 'Varsayılan Fiyat', key: 'p', width: 16 }, { header: 'Kaç noktada tanımlı', key: 'c', width: 20 }];
    const usage = {};
    for (const d of docs) for (const s of d.services || []) usage[s.sku] = (usage[s.sku] || 0) + 1;
    const seen = new Set();
    for (const p of services) {
        const sku = p.diaData?.stokkartkodu; if (!sku || seen.has(sku)) continue; seen.add(sku);
        ws4.addRow({ s: sku, n: p.diaData?.aciklama || p.name, p: p.price ?? p.diaData?.fiyat1 ?? '', c: usage[sku] || 0 });
    }
    for (const d of docs) for (const s of d.services || []) if (!seen.has(s.sku)) { seen.add(s.sku); ws4.addRow({ s: s.sku, n: s.name, p: s.defaultPrice, c: usage[s.sku] }); }
    head(ws4);

    await wb.xlsx.writeFile(OUT);
    console.log('yazıldı', OUT, '| LJA kayıt', docs.length, '| hizmet ürünü', services.length, '| hizmet satırı', seen.size);
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
