/**
 * b2b Ödeme Makbuzu (PDF) — pdfkit ile üretilir. Türkçe karakterler için
 * DejaVuSans fontu gömülür. Tutarlar TL (ondalıklı) gösterilir.
 */
const path = require('path');
const PDFDocument = require('pdfkit');

const FONT_DIR = path.join(__dirname, '..', '..', '..', 'assets', 'fonts');
const FONT_REGULAR = path.join(FONT_DIR, 'DejaVuSans.ttf');
const FONT_BOLD = path.join(FONT_DIR, 'DejaVuSans-Bold.ttf');

const TL = (v) =>
    `${Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;

const tarih = (d) => {
    if (!d) return '-';
    try {
        return new Date(d).toLocaleString('tr-TR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch (_) { return '-'; }
};

function odemeAdi(p) {
    if (!p) return '-';
    if (p.gateway === 'netahsilat' || (Number(p.installment) > 1)) return `Kredi Kartı - ${p.installment || 2} Taksit`;
    if (p.method === 'credit_card') return 'Kredi Kartı - Tek Çekim';
    if (p.method === 'bank_transfer') return 'Banka Havalesi/EFT';
    if (p.method === 'cari') return 'Cari Hesap';
    return p.method || '-';
}

/**
 * @returns {Promise<Buffer>} makbuz PDF
 */
function makbuzPdf(order, company = {}) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 48, font: FONT_REGULAR });
            doc.registerFont('regular', FONT_REGULAR);
            doc.registerFont('bold', FONT_BOLD);

            const chunks = [];
            doc.on('data', (c) => chunks.push(c));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const left = doc.page.margins.left;
            const right = doc.page.width - doc.page.margins.right;
            const width = right - left;
            const DARK = '#1a1a1a';
            const GRAY = '#6b7280';

            // ── Başlık: satıcı + belge adı ──
            doc.font('bold').fontSize(15).fillColor(DARK).text(company.name || 'LastikJantAVM', left, 48);
            let y = doc.y + 2;
            doc.font('regular').fontSize(8.5).fillColor(GRAY);
            if (company.officialName) { doc.text(company.officialName, left, y, { width: width * 0.62 }); }
            const satAdres = [company.district, company.city].filter(Boolean).join(' / ');
            if (satAdres || company.address) doc.text([satAdres, company.address].filter(Boolean).join(' - '), { width: width * 0.62 });
            if (company.phone) doc.text(`Tel: ${company.phone}${company.website ? '  ·  ' + company.website : ''}`, { width: width * 0.62 });

            doc.font('bold').fontSize(15).fillColor(DARK).text('ÖDEME MAKBUZU', left, 50, { width, align: 'right' });
            doc.font('regular').fontSize(9).fillColor(GRAY).text('Proforma', left, doc.y, { width, align: 'right' });

            // Ayraç çizgi
            y = 118;
            doc.moveTo(left, y).lineTo(right, y).lineWidth(1.5).strokeColor(DARK).stroke();

            // ── Meta ──
            y += 14;
            const metaRow = (label, value) => {
                doc.font('regular').fontSize(9).fillColor(GRAY).text(label, left, y);
                doc.font('bold').fontSize(9).fillColor(DARK).text(String(value || '-'), left + 120, y, { width: width - 120 });
                y = doc.y + 4;
            };
            metaRow('Sipariş No', order.orderNumber);
            metaRow('Tarih', tarih(order.payment?.paidAt || order.createdAt));
            metaRow('Bayi', order.customerName);
            if (order.customerPhone) metaRow('Telefon', order.customerPhone);

            // ── Ürün tablosu ──
            y += 8;
            const cols = { urun: left, adet: left + width * 0.56, birim: left + width * 0.70, tutar: left + width * 0.86 };
            doc.rect(left, y, width, 20).fillColor('#f4f6f8').fill();
            doc.font('bold').fontSize(9).fillColor(DARK);
            doc.text('Ürün', cols.urun + 6, y + 6);
            doc.text('Adet', cols.adet, y + 6, { width: width * 0.12, align: 'right' });
            doc.text('Birim Fiyat', cols.birim, y + 6, { width: width * 0.14, align: 'right' });
            doc.text('Tutar', cols.tutar, y + 6, { width: width * 0.14 - 6, align: 'right' });
            y += 20;
            doc.moveTo(left, y).lineTo(right, y).lineWidth(1).strokeColor(DARK).stroke();

            (order.items || []).forEach((it) => {
                const ad = `${it.name || it.stockCode || ''}${it.stockCode && it.name ? ' (' + it.stockCode + ')' : ''}`;
                const rowH = Math.max(18, doc.font('regular').fontSize(8.5).heightOfString(ad, { width: width * 0.54 }) + 8);
                doc.fillColor(DARK).font('regular').fontSize(8.5);
                doc.text(ad, cols.urun + 6, y + 5, { width: width * 0.54 });
                doc.text(String(it.quantity || 0), cols.adet, y + 5, { width: width * 0.12, align: 'right' });
                doc.text(TL(it.unitPrice), cols.birim, y + 5, { width: width * 0.14, align: 'right' });
                doc.text(TL(it.totalPrice), cols.tutar, y + 5, { width: width * 0.14 - 6, align: 'right' });
                y += rowH;
                doc.moveTo(left, y).lineTo(right, y).lineWidth(0.5).strokeColor('#e1e5e9').stroke();
            });

            // ── Toplamlar ──
            y += 12;
            const tx = left + width * 0.58;
            const tw = width * 0.42;
            const topRow = (label, value, bold) => {
                doc.font(bold ? 'bold' : 'regular').fontSize(bold ? 11 : 9.5).fillColor(DARK);
                doc.text(label, tx, y, { width: tw * 0.55 });
                doc.text(value, tx + tw * 0.45, y, { width: tw * 0.55, align: 'right' });
                y = doc.y + 4;
            };
            topRow('Ara Toplam (KDV hariç)', TL(order.pricing?.subtotal));
            topRow('KDV', TL(order.pricing?.vatAmount));
            doc.moveTo(tx, y + 2).lineTo(right, y + 2).lineWidth(1.2).strokeColor(DARK).stroke();
            y += 8;
            topRow('Genel Toplam', TL(order.pricing?.total), true);

            // ── Ödeme bilgileri ──
            y += 14;
            doc.rect(left, y, width, 2).fillColor('#e1e5e9').fill();
            y += 12;
            doc.font('bold').fontSize(10).fillColor(DARK).text('Ödeme Bilgileri', left, y);
            y = doc.y + 6;
            const p = order.payment || {};
            const odRow = (label, value) => {
                if (!value) return;
                doc.font('regular').fontSize(9).fillColor(GRAY).text(label, left, y);
                doc.font('bold').fontSize(9).fillColor(DARK).text(String(value), left + 120, y);
                y = doc.y + 4;
            };
            odRow('Ödeme Yöntemi', odemeAdi(p));
            odRow('Durum', p.status === 'paid' ? 'Ödendi' : (p.status || '-'));
            if (p.cardInfo?.lastFourDigits) odRow('Kart', `**** ${p.cardInfo.lastFourDigits}`);
            if (p.authCode) odRow('Onay Kodu', p.authCode);

            // ── Alt not ──
            doc.font('regular').fontSize(7.5).fillColor(GRAY).text(
                `Bu belge ${company.name || 'LastikJantAVM'} tarafından elektronik olarak oluşturulmuştur. Resmi fatura ayrıca düzenlenir.`,
                left, doc.page.height - 70, { width, align: 'center' }
            );

            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { makbuzPdf };
