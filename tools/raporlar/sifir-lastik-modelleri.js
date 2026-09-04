// Sıfır lastik modelleri (LJA) → Excel: marka, model, ürün sayısı, gömülü görsel, görsel linki
require('dotenv').config({ path: '/var/www/alastik/apps/api/.env.production' });
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const ExcelJS = require('exceljs');
const sharp = require('sharp');

const OUT = '/var/www/alastik/apps/sifir-lastik-modelleri.xlsx';
const PUBLIC = '/var/www/alastik/apps/api/public';
const MEDIA_URL = 'https://api.alastik.com';
const SITE = 'lastikjantavm';
const THUMB = 110;

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const c = mongoose.connection.db.collection('webproducts');
    const rows = await c.aggregate([
        { $match: { 'diaData.durum': 'A', 'diaData.ozelkod6kodu': 'SIFIR', 'diaData.ozelkod7kodu': 'LASTİK', sites: SITE } },
        { $sort: { 'diaData.aciklama': 1 } },
        { $group: {
            _id: { marka: '$diaData.marka', model: '$diaData.ozelkod5kodu' },
            count: { $sum: 1 },
            images: { $first: '$diaData.m_resimler' },
            featured: { $first: '$customData.featuredImage' },
            sample: { $first: '$diaData.aciklama' }
        } },
        { $sort: { '_id.marka': 1, '_id.model': 1 } }
    ]).toArray();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sıfır Lastik Modelleri');
    ws.columns = [
        { header: 'Marka', key: 'brand', width: 16 },
        { header: 'Model', key: 'model', width: 34 },
        { header: 'Ürün Sayısı', key: 'count', width: 12 },
        { header: 'Görsel', key: 'img', width: 18 },
        { header: 'Görsel Linki', key: 'url', width: 70 },
        { header: 'Örnek Ürün', key: 'sample', width: 50 }
    ];
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];

    let embedded = 0;
    for (const r of rows) {
        const sorted = (r.images || []).slice().sort((a, b) => Number(a.order_id) - Number(b.order_id));
        const rel = r.featured || sorted[0]?.aws_url || '';
        const url = rel ? MEDIA_URL + rel : '';
        const row = ws.addRow({ brand: r._id.marka || '', model: r._id.model || '(model tanımsız)', count: r.count, img: '', url, sample: r.sample });
        row.height = 85;
        row.alignment = { vertical: 'middle' };
        const abs = rel ? path.join(PUBLIC, rel) : '';
        if (abs && fs.existsSync(abs)) {
            try {
                const buffer = await sharp(abs).resize(THUMB, THUMB, { fit: 'inside', background: '#fff' }).flatten({ background: '#fff' }).jpeg({ quality: 80 }).toBuffer();
                const id = wb.addImage({ buffer, extension: 'jpeg' });
                ws.addImage(id, { tl: { col: 3.1, row: row.number - 1 + 0.08 }, ext: { width: 105, height: 105 } });
                embedded++;
            } catch (e) { row.getCell('img').value = 'okunamadı'; }
        } else {
            row.getCell('img').value = 'dosya yok';
        }
        if (url) row.getCell('url').value = { text: url, hyperlink: url };
    }
    await wb.xlsx.writeFile(OUT);
    console.log('yazıldı', OUT, '| model:', rows.length, '| gömülü görsel:', embedded);
    process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
