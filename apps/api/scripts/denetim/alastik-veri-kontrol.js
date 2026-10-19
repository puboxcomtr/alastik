require('/var/www/alastik/node_modules/dotenv').config({ path: '/var/www/alastik/apps/api/.env.production' });
const mongoose = require('/var/www/alastik/apps/api/node_modules/mongoose');

const SITE = 'alastik';
const ORNEK_LIMIT = 20;

const satistaFiltre = {
    sites: SITE,
    'diaData.durum': 'A',
    'diaData.gercek_stok': { $gt: 0 },
    'customData.webVisible': { $ne: false },
    [`customData.siteData.${SITE}.webVisible`]: { $ne: false }
};

const GRUPLAR = [
    ['Stok (DIA)', { 'syncInfo.syncSource': { $ne: 'xml_integration' } }],
    ['XML', { 'syncInfo.syncSource': 'xml_integration' }]
];

function tabloSatirlari(docs) {
    return docs.map(d => `| ${d.diaData?.stokkartkodu || d._key} | ${(d.diaData?.aciklama || '').slice(0, 70)} |`);
}

async function grupluBolum(col, projection, baslik, ekFiltre) {
    const parcalar = [`## ${baslik}`, ''];
    for (const [grupAdi, grupFiltre] of GRUPLAR) {
        const filtre = { ...satistaFiltre, ...grupFiltre, ...ekFiltre };
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

    console.log(await grupluBolum(col, projection, '1. Görselsiz ürünler', {
        $and: [
            { $or: [{ 'customData.customImages': { $exists: false } }, { 'customData.customImages': { $size: 0 } }] },
            { $or: [{ 'customData.featuredImage': { $exists: false } }, { 'customData.featuredImage': { $in: [null, ''] } }] },
            { $or: [{ 'diaData.m_resimler': { $exists: false } }, { 'diaData.m_resimler': { $size: 0 } }] }
        ]
    }));

    console.log(await grupluBolum(col, projection, '2. Açıklamasız ürünler', {
        $and: [
            { $or: [{ 'customData.customDescription': { $exists: false } }, { 'customData.customDescription': { $in: [null, ''] } }] },
            { $or: [{ [`customData.siteDescriptions.${SITE}`]: { $exists: false } }, { [`customData.siteDescriptions.${SITE}`]: { $in: [null, ''] } }] }
        ]
    }));

    console.log(await grupluBolum(col, projection, '3. Fiyatı olmayan ürünler', {
        'diaData.m_birimler.0.fiyat4': { $not: { $gt: 0 } }
    }));

    const kargoFiltre = {
        ...satistaFiltre,
        'syncInfo.syncSource': 'xml_integration',
        'customData.shippingIncludedPrice': { $not: { $gt: 0 } }
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

    const dbNative = mongoose.connection.db;
    const aktifKaynaklar = await dbNative.collection('webxml')
        .find({ site: SITE, isActive: true }, { projection: { code: 1, name: 1 } }).toArray();
    const kaynakKodlari = aktifKaynaklar.map(k => k.code);
    const kaynakAdi = Object.fromEntries(aktifKaynaklar.map(k => [k.code, k.name || k.code]));

    const xmlKartKeys = new Set(
        (await dbNative.collection('diastocks')
            .find({ ozelkod10kodu: 'XML' }, { projection: { _key: 1 } }).toArray()
        ).map(d => String(d._key))
    );

    const sayilar = {};
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
