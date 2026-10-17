/**
 * Ödemeler (admin) — bayi sitesindeki "Ödeme Yap" sayfasından başlatılan cari borç ödemelerinin kaydı.
 * Sipariş ödemesi değildir; her deneme (bekleyen / ödenen / başarısız) ayrı satırdır. Site bazlıdır (req.site).
 */
const router = require('express').Router();
const B2bPayment = require('../../../models/web/user/B2bPayment');
const WebMember = require('../../../models/web/user/WebMember');

const PAYMENT_STATUSES = B2bPayment.schema.path('status').enumValues;
const KURUS_PER_TL = 100;
// Arama ile eşleşecek en fazla cari sayısı
const MEMBER_SEARCH_LIMIT = 500;
const escapeRegex = (v) => String(v).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/admin/b2b-payments — liste (durum sekmesi + ödeme türü + arama + sayfalama) ve durum sayaçları
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 200);
        const match = { site: req.site };

        if (req.query.type) match.type = String(req.query.type);

        if (req.query.search && String(req.query.search).trim()) {
            const regex = new RegExp(escapeRegex(req.query.search), 'i');
            // Cari adı / e-posta / telefon eşleşenlerin ödemeleri + cari kodu ya da referansı eşleşen ödemeler
            const members = await WebMember.find(
                { site: req.site, $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }] },
                { _id: 1 }
            ).limit(MEMBER_SEARCH_LIMIT).lean();
            match.$or = [
                { cariKodu: regex },
                { reference: regex },
                { referenceCode: regex },
                ...(members.length ? [{ memberId: { $in: members.map(m => m._id) } }] : [])
            ];
        }

        // Sekme sayaçları: tür + arama uygulanmış, durum filtresi uygulanmamış kümede
        const statusFilter = PAYMENT_STATUSES.includes(req.query.status) ? req.query.status : '';
        const listMatch = statusFilter ? { ...match, status: statusFilter } : match;

        const [payments, total, countRows] = await Promise.all([
            B2bPayment.find(listMatch).select('-paymentGuid').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            B2bPayment.countDocuments(listMatch),
            B2bPayment.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 }, amountKurus: { $sum: '$amountKurus' } } }])
        ]);

        const memberIds = [...new Set(payments.map(p => String(p.memberId)).filter(Boolean))];
        const members = memberIds.length
            ? await WebMember.find({ _id: { $in: memberIds } }).select('firstName lastName email phone memberNo diaCustomerCode').lean()
            : [];
        const memberMap = new Map(members.map(m => [String(m._id), m]));

        const statusCounts = { all: 0, ...Object.fromEntries(PAYMENT_STATUSES.map(s => [s, 0])) };
        const statusAmounts = Object.fromEntries(PAYMENT_STATUSES.map(s => [s, 0]));
        for (const row of countRows) {
            if (!(row._id in statusAmounts)) continue;
            statusCounts[row._id] = row.count;
            statusCounts.all += row.count;
            statusAmounts[row._id] = row.amountKurus / KURUS_PER_TL;
        }

        const data = payments.map(p => {
            const member = memberMap.get(String(p.memberId));
            return {
                _id: String(p._id),
                createdAt: p.createdAt,
                paidAt: p.paidAt || null,
                status: p.status,
                type: p.type,
                gateway: p.gateway,
                installment: p.installment || null,
                amount: p.amountKurus / KURUS_PER_TL,
                reference: p.reference,
                referenceCode: p.referenceCode || '',
                transactionId: p.transactionId || '',
                authCode: p.authCode || '',
                cardLastFour: p.cardInfo?.lastFourDigits || '',
                cardBank: p.cardInfo?.bankName || '',
                errorMessage: p.errorMessage || '',
                errorCode: p.errorCode || '',
                mailSent: p.mailSent === true,
                cariKodu: p.cariKodu || member?.diaCustomerCode || '',
                member: member
                    ? { _id: String(member._id), memberNo: member.memberNo ?? null, name: `${member.firstName || ''} ${member.lastName || ''}`.trim(), email: member.email || '', phone: member.phone || '' }
                    : null
            };
        });

        res.json({ success: true, data, meta: { total, page, limit }, statusCounts, statusAmounts });
    } catch (error) {
        console.error('Ödeme kayıtları listeleme hatası:', error);
        res.status(500).json({ success: false, message: 'Ödeme kayıtları yüklenemedi' });
    }
});

module.exports = router;
