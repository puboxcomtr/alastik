/**
 * LastikJantAVM haftalık sipariş raporu — son 7 günün siparişleri.
 * Toplam adet/ciro, durum ve ödeme yöntemi kırılımı, günlük dağılım, en çok satan ürünler.
 * Çıktı: stdout'a markdown (haftalık denetim raporunun başına eklenir).
 */
require('/var/www/alastik/node_modules/dotenv').config({ path: '/var/www/alastik/apps/api/.env.production' });
const mongoose = require('/var/www/alastik/apps/api/node_modules/mongoose');

const SITE = 'lastikjantavm';
const GUN = 7;

const tl = (v) => (Math.round((v || 0) * 100) / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' TL';

(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const col = mongoose.connection.db.collection('weborders');
    const baslangic = new Date(Date.now() - GUN * 24 * 60 * 60 * 1000);
    const filtre = { site: SITE, createdAt: { $gte: baslangic } };

    const genel = await col.aggregate([
        { $match: filtre },
        { $group: { _id: null, adet: { $sum: 1 }, ciro: { $sum: '$pricing.total' } } }
    ]).toArray();
    const adet = genel[0]?.adet || 0;
    const ciro = genel[0]?.ciro || 0;

    const cikti = [
        '## Haftalık Sipariş Özeti',
        '',
        `Dönem: son ${GUN} gün (${baslangic.toLocaleDateString('tr-TR')} → ${new Date().toLocaleDateString('tr-TR')})`,
        '',
        `Toplam sipariş: **${adet}** — Toplam ciro: **${tl(ciro)}** — Ortalama sepet: **${adet > 0 ? tl(ciro / adet) : '-'}**`,
        ''
    ];

    if (adet > 0) {
        const durumlar = await col.aggregate([
            { $match: filtre },
            { $group: { _id: '$status', adet: { $sum: 1 }, ciro: { $sum: '$pricing.total' } } },
            { $sort: { adet: -1 } }
        ]).toArray();
        cikti.push('### Durum kırılımı', '', '| Durum | Adet | Ciro |', '|---|---|---|',
            ...durumlar.map(d => `| ${d._id || '-'} | ${d.adet} | ${tl(d.ciro)} |`), '');

        const odemeler = await col.aggregate([
            { $match: filtre },
            { $group: { _id: '$payment.method', adet: { $sum: 1 }, ciro: { $sum: '$pricing.total' } } },
            { $sort: { adet: -1 } }
        ]).toArray();
        cikti.push('### Ödeme yöntemi kırılımı', '', '| Yöntem | Adet | Ciro |', '|---|---|---|',
            ...odemeler.map(d => `| ${d._id || '-'} | ${d.adet} | ${tl(d.ciro)} |`), '');

        const gunluk = await col.aggregate([
            { $match: filtre },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Europe/Istanbul' } },
                adet: { $sum: 1 }, ciro: { $sum: '$pricing.total' }
            } },
            { $sort: { _id: 1 } }
        ]).toArray();
        cikti.push('### Günlük dağılım', '', '| Gün | Adet | Ciro |', '|---|---|---|',
            ...gunluk.map(d => `| ${d._id} | ${d.adet} | ${tl(d.ciro)} |`), '');

        const urunler = await col.aggregate([
            { $match: filtre },
            { $unwind: '$items' },
            { $group: { _id: '$items.name', adet: { $sum: '$items.quantity' }, tutar: { $sum: '$items.totalPrice' } } },
            { $sort: { adet: -1 } },
            { $limit: 5 }
        ]).toArray();
        cikti.push('### En çok satılan 5 ürün', '', '| Ürün | Adet | Tutar |', '|---|---|---|',
            ...urunler.map(u => `| ${(u._id || '-').slice(0, 60)} | ${u.adet} | ${tl(u.tutar)} |`), '');
    }

    console.log(cikti.join('\n'));
    await mongoose.disconnect();
    process.exit(0);
})().catch((e) => { console.error('Sipariş raporu hatası:', e.message); process.exit(1); });
