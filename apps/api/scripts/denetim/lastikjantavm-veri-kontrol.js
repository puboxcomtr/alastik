/**
 * LastikJantAVM haftalık denetim — veri kontrolleri.
 * Satıştaki (aktif, stoklu, gizlenmemiş) lastikjantavm ürünlerinde, Stok (DIA) ve XML ayrımıyla:
 *   1. Görselsiz  2. Açıklamasız  3. Fiyatsız  4. Kargo dahil fiyatı eksik XML ürünler
 * Çıktı: stdout'a markdown bölümleri (haftalık rapora eklenir).
 *
 * LJA farkı: fiyat ve kargo alanları site bazlıdır —
 *   Stok (DIA) satış fiyatı fiyat1 tabanlıdır (fiyat1 × B2C oran),
 *   XML vitrin fiyatı customData.siteData.lastikjantavm.xmlPrice,
 *   kargo dahil fiyat customData.siteData.lastikjantavm.shippingIncludedPrice.
 */
require('/var/www/alastik/node_modules/dotenv').config({ path: '/var/www/alastik/apps/api/.env.production' });
const mongoose = require('/var/www/alastik/apps/api/node_modules/mongoose');

const SITE = 'lastikjantavm';
const ORNEK_LIMIT = 20;
const siteAlan = (alan) => `customData.siteData.${SITE}.${alan}`;

// Satışta sayılma koşulu: aktif kart, stoklu, site listesinde ve gizlenmemiş
const satistaFiltre = {
    sites: SITE,
    'diaData.durum': 'A',
    'diaData.gercek_stok': { $gt: 0 },
    'customData.webVisible': { $ne: false },
    [`customData.siteData.${SITE}.webVisible`]: { $ne: false }
};

// Ürün grupları: kendi stok (DIA) ve XML kaynaklı
const GRUPLAR = [
    ['Stok (DIA)', { 'syncInfo.syncSource': { $ne: 'xml_integration' } }],
    ['XML', { 'syncInfo.syncSource': 'xml_integration' }]
];

function tabloSatirlari(docs) {
    return docs.map(d => `| ${d.diaData?.stokkartkodu || d._key} | ${(d.diaData?.aciklama || '').slice(0, 70)} |`);
}

/**
 * Gruplu bölüm üretir. ekFiltre tüm gruplara uygulanır;
 * grupEkFiltre verilirse grup adına göre o gruba özel ek filtre uygulanır (fiyat alanı gruba göre değişir).
 */
async function grupluBolum(col, projection, baslik, ekFiltre, grupEkFiltre = {}) {
    const parcalar = [`## ${baslik}`, ''];
    for (const [grupAdi, grupFiltre] of GRUPLAR) {
        const filtre = { ...satistaFiltre, ...grupFiltre, ...ekFiltre, ...(grupEkFiltre[grupAdi] || {}) };
        const toplam = await col.countDocuments(filtre);
        const ornekler = toplam > 0 ? await col.find(filtre, { projection }).limit(ORNEK_LIMIT).toArray() : [];
        parcalar.push(`### ${grupAdi} — toplam: ${toplam}${toplam > ORNEK_LIMIT ? ` (ilk ${ORNEK_LIMIT})` : ''}`, '');
        if (toplam > 0) {
            parcalar.push('| Stok Kodu | Ürün |', '|---|---|', ...tabloSatirlari(ornekler), '');
        } else {
            parcalar.push('Bulgu yok.', '');
        }
    }
    return parcalar.join('\n');
}

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const col = mongoose.connection.db.collection('webproducts');
    const projection = { _key: 1, 'diaData.stokkartkodu': 1, 'diaData.aciklama': 1 };

    // 1. Görselsiz: özel görsel yok + öne çıkan görsel yok + DIA görseli yok
    console.log(await grupluBolum(col, projection, '1. Görselsiz ürünler', {
        $and: [
            { $or: [{ 'customData.customImages': { $exists: false } }, { 'customData.customImages': { $size: 0 } }] },
            { $or: [{ 'customData.featuredImage': { $exists: false } }, { 'customData.featuredImage': { $in: [null, ''] } }] },
            { $or: [{ 'diaData.m_resimler': { $exists: false } }, { 'diaData.m_resimler': { $size: 0 } }] }
        ]
    }));

    // 2. Açıklamasız: ne genel açıklama ne LJA site açıklaması var
    console.log(await grupluBolum(col, projection, '2. Açıklamasız ürünler', {
        $and: [
            { $or: [{ 'customData.customDescription': { $exists: false } }, { 'customData.customDescription': { $in: [null, ''] } }] },
            { $or: [{ [`customData.siteDescriptions.${SITE}`]: { $exists: false } }, { [`customData.siteDescriptions.${SITE}`]: { $in: [null, ''] } }] }
        ]
    }));

    // 3. Fiyatsız — LJA'da fiyat kaynağı gruba göre değişir:
    //    Stok (DIA): satış = fiyat1 × B2C oran → fiyat1 > 0 değilse fiyatsız.
    //    XML: vitrin fiyatı siteData.lastikjantavm.xmlPrice > 0 değilse fiyatsız.
    // Dizi yolunda $in:[null] tuzağına düşmemek için $not/$gt kullanılır.
    console.log(await grupluBolum(col, projection, '3. Fiyatı olmayan ürünler', {}, {
        'Stok (DIA)': { 'diaData.m_birimler.0.fiyat1': { $not: { $gt: 0 } } },
        'XML': { [siteAlan('xmlPrice')]: { $not: { $gt: 0 } } }
    }));

    // 4. XML üründe kargo dahil fiyat eksik (kargo fiyata gömülü olduğundan müşteri fiyatı eksik kalır)
    const kargoFiltre = {
        ...satistaFiltre,
        'syncInfo.syncSource': 'xml_integration',
        [siteAlan('shippingIncludedPrice')]: { $not: { $gt: 0 } }
    };
    const kargoToplam = await col.countDocuments(kargoFiltre);
    const kargoOrnek = kargoToplam > 0 ? await col.find(kargoFiltre, { projection }).limit(ORNEK_LIMIT).toArray() : [];
    console.log([
        '## 4. Kargo dahil fiyatı eksik XML ürünler', '',
        `Toplam: ${kargoToplam}${kargoToplam > ORNEK_LIMIT ? ` (ilk ${ORNEK_LIMIT})` : ''}`, '',
        ...(kargoToplam > 0
            ? ['| Stok Kodu | Ürün |', '|---|---|', ...tabloSatirlari(kargoOrnek), '']
            : ['Bulgu yok.', ''])
    ].join('\n'));

    // 5. XML eşleştirme istatistikleri (kaynak başına):
    //    "gerçek karta eşleşen" = diaKey gerçek DIA stok kartına bağlı;
    //    "otomatik -XML kart"  = diaKey ozelkod10kodu='XML' olan otomatik açılmış karta bağlı;
    //    "eşleşmeyen"          = diaKey yok.
    const dbNative = mongoose.connection.db;
    const aktifKaynaklar = await dbNative.collection('webxml')
        .find({ site: SITE, isActive: true }, { projection: { code: 1, name: 1 } }).toArray();
    const kaynakKodlari = aktifKaynaklar.map(k => k.code);
    const kaynakAdi = Object.fromEntries(aktifKaynaklar.map(k => [k.code, k.name || k.code]));

    // Otomatik -XML kartların key kümesi (diastocks)
    const xmlKartKeys = new Set(
        (await dbNative.collection('diastocks')
            .find({ ozelkod10kodu: 'XML' }, { projection: { _key: 1 } }).toArray()
        ).map(d => String(d._key))
    );

    const sayilar = {}; // source -> { toplam, gercek, otoXml, eslesmeyen }
    const cursor = dbNative.collection('xmlproducts')
        .find({ source: { $in: kaynakKodlari } }, { projection: { source: 1, diaKey: 1 } });
    for await (const xp of cursor) {
        const s = (sayilar[xp.source] = sayilar[xp.source] || { toplam: 0, gercek: 0, otoXml: 0, eslesmeyen: 0 });
        s.toplam++;
        const key = xp.diaKey ? String(xp.diaKey) : '';
        if (!key) s.eslesmeyen++;
        else if (xmlKartKeys.has(key)) s.otoXml++;
        else s.gercek++;
    }

    const genel = { toplam: 0, gercek: 0, otoXml: 0, eslesmeyen: 0 };
    const satirlar = kaynakKodlari
        .filter(k => sayilar[k])
        .sort((a, b) => (sayilar[b].toplam - sayilar[a].toplam))
        .map(k => {
            const s = sayilar[k];
            genel.toplam += s.toplam; genel.gercek += s.gercek; genel.otoXml += s.otoXml; genel.eslesmeyen += s.eslesmeyen;
            return `| ${kaynakAdi[k]} | ${s.toplam} | ${s.gercek} | ${s.otoXml} | ${s.eslesmeyen} |`;
        });

    console.log([
        '## 5. XML eşleştirme istatistikleri', '',
        `Eşleştirilen toplam: **${genel.gercek + genel.otoXml}** (gerçek karta: ${genel.gercek}, otomatik -XML karta: ${genel.otoXml}) — Eşleştirilmeyen toplam: **${genel.eslesmeyen}**`, '',
        '| Kaynak | Toplam Ürün | Gerçek Karta Eşleşen | Otomatik -XML Kart | Eşleşmeyen |',
        '|---|---|---|---|---|',
        ...satirlar,
        `| **GENEL** | **${genel.toplam}** | **${genel.gercek}** | **${genel.otoXml}** | **${genel.eslesmeyen}** |`,
        ''
    ].join('\n'));

    await mongoose.disconnect();
    process.exit(0);
})().catch((e) => { console.error('Veri kontrol hatası:', e.message); process.exit(1); });
