const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const WebMember = require('../../../models/web/user/WebMember');
const authMiddleware = require('../../../middleware/authMiddleware');
const { overdueKurusOf, discountsBlocked } = require('../../../services/web/b2b/financialDiscounts');
const { CREDIT_PAYMENT_METHOD, CREDIT_CLOSED_MESSAGES, CREDIT_CLOSED_REASONS, ORDERING_CLOSED_MESSAGES, CART_CLOSED_MESSAGE, CREDIT_LIMIT_INSUFFICIENT_MESSAGE, pendingOrderKurusOf, getCreditStatus } = require('../../../services/web/b2b/creditLimit');

const { getDeliveryMethods } = require('../../../services/web/cargo/deliveryMethods');
const { isShippingEnabled, shippingForStockCodes } = require('../../../services/web/b2b/b2bShipping');

/** Bayinin kayıtlı teslimat adreslerinden (DIA senkronu) seçilenin ili / ilçesi; adres bulunamazsa boş konum */
function deliveryLocationOf(member, addressId) {
    const address = (member?.diaCari?.addresses || []).find(a => String(a.id) === String(addressId || ''));
    return { city: address?.il || '', district: address?.ilce || '' };
}

/**
 * POST /login — bayi girişi: CARİ KODU veya E-POSTA + şifre.
 * Başarıda B2C üye token'ıyla aynı biçimde JWT döner (type: member) —
 * mevcut authenticate middleware'i bayi oturumları için de geçerlidir.
 */
// Başarısız bayi girişini kaydeder (destek için); kayıt hatası girişi etkilemez. Şifre yazılmaz.
function recordLoginFailure(req, identifier, reason, member) {
    const B2bLoginFailure = require('../../../models/web/user/B2bLoginFailure');
    B2bLoginFailure.create({
        site: req.site,
        identifier: String(identifier || '').slice(0, 120),
        reason,
        memberId: member?._id,
        cariKodu: member?.diaCustomerCode,
        ip: req.ip,
        userAgent: String(req.headers['user-agent'] || '').slice(0, 300)
    }).catch(e => console.error('[b2b-auth] Hatalı giriş kaydı yazılamadı:', e.message));
}

router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body || {};
        const kimlik = String(identifier || '').trim();

        if (!kimlik) {
            return res.status(400).json({ success: false, message: 'Bayi kodu (veya e-posta) giriniz.' });
        }

        // Kimlik: bayi kodu, e-posta VEYA cep telefonu. Telefon format farklarını (boşluk/0/90) tolere et.
        const or = [
            { diaCustomerCode: kimlik },
            { email: kimlik.toLowerCase() },
            { phone: kimlik }
        ];
        let tel = kimlik.replace(/\D/g, '');
        if (tel.startsWith('90')) tel = tel.slice(2);
        if (tel.startsWith('0')) tel = tel.slice(1);
        tel = tel.slice(-10);
        if (tel.length === 10) or.push({ phone: new RegExp(tel.split('').join('\\D*')) });

        const member = await WebMember.findOne({ site: req.site, $or: or });

        if (!member) {
            recordLoginFailure(req, kimlik, 'not_found');
            return res.status(401).json({ success: false, message: 'Cariniz sisteme kayıt edilmemiştir.' });
        }
        if (member.status === 'suspended') {
            recordLoginFailure(req, kimlik, 'suspended', member);
            return res.status(403).json({ success: false, message: 'Hesabınız askıya alınmıştır. Lütfen bizimle iletişime geçiniz.' });
        }
        if (member.status !== 'active') {
            recordLoginFailure(req, kimlik, 'inactive', member);
            return res.status(403).json({ success: false, message: 'Hesabınız henüz aktif değil. Lütfen bizimle iletişime geçiniz.' });
        }

        // Şifre kontrolü YALNIZ bayi kendi şifresini belirlediyse yapılır.
        // Aksi halde cari kodu yeterlidir; şifre ne girilirse girilsin (boş dahil) giriş yapılır.
        if (member.customPasswordSet === true) {
            const isPasswordValid = await member.comparePassword(String(password || ''));
            if (!isPasswordValid) {
                recordLoginFailure(req, kimlik, 'wrong_password', member);
                return res.status(401).json({ success: false, message: 'Şifre hatalı.' });
            }
        }

        const token = jwt.sign(
            { id: member._id, email: member.email, type: 'member' },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );

        // Kendi şifresini belirlememişse şifre değiştirme ekranı HATIRLATILIR (zorunlu değil)
        member.mustChangePassword = member.customPasswordSet !== true;
        member.lastLoginAt = new Date();
        member.loginAttempts = 0;
        await member.save();

        res.json({
            success: true,
            message: 'Giriş başarılı.',
            data: {
                token,
                mustChangePassword: member.mustChangePassword,
                member: {
                    id: member._id,
                    name: `${member.firstName || ''} ${member.lastName || ''}`.replace(/ \.$/, '').trim(),
                    email: member.email,
                    cariKodu: member.diaCustomerCode || ''
                }
            }
        });
    } catch (error) {
        console.error('[b2b-auth] Giriş hatası:', error);
        res.status(500).json({ success: false, message: 'Giriş yapılırken bir hata oluştu.' });
    }
});

/**
 * GET /me — oturumdaki bayinin bilgileri (token doğrulaması authenticate ile)
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site }).select('-password').lean();
        if (!member) {
            return res.status(404).json({ success: false, message: 'Bayi bulunamadı.' });
        }
        const credit = await getCreditStatus(req.site, member);
        res.json({
            success: true,
            data: {
                id: member._id,
                name: `${member.firstName || ''} ${member.lastName || ''}`.replace(/ \.$/, '').trim(),
                email: member.email,
                cariKodu: member.diaCustomerCode || '',
                phone: member.phone || '',
                // Premium cari (DIA özel kodundan senkronlanır) — bayi panelinde rozet
                premium: member.diaCari?.premium === true,
                // Vadesi geçen borç varsa iskontolar iptaldir (anasayfa ve sepette uyarı gösterilir)
                overdueKurus: overdueKurusOf(member),
                discountsBlocked: await discountsBlocked(req.site, member),
                // Vadeli alım kapalıysa (limit tanımsız ya da aşılmış) Cari Sipariş verilemez — yalnız kredi kartı / havale
                creditClosed: credit.closed,
                creditClosedReason: credit.reason,
                // Vadesi geçen borç nedeniyle de vadeli alım kapalıdır (limit nedeni öne geçse bile)
                creditClosedByOverdue: credit.cartClosed,
                totalLimitKurus: credit.totalLimitKurus,
                // Limit tanımsız, bitmiş ya da vadesi geçen borç varsa hiçbir yöntemle sipariş verilemez (anasayfa + sepette uyarı)
                orderingClosed: credit.orderingClosed,
                orderingClosedReason: credit.orderingClosedReason,
                orderingClosedMessage: credit.orderingClosed ? ORDERING_CLOSED_MESSAGES[credit.orderingClosedReason] : '',
                // Vadesi geçen borçta sepete ürün eklemek de kapalıdır (ekranda ortada uyarı açılır)
                cartClosed: credit.cartClosed,
                cartClosedMessage: credit.cartClosed ? CART_CLOSED_MESSAGE : '',
                // Plasiyerin bayi adına açtığı oturumda bayinin şifre belirleme hatırlatması gösterilmez
                mustChangePassword: member.mustChangePassword === true && !req.impersonatedBy,
                impersonated: !!req.impersonatedBy
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Bilgiler alınamadı.' });
    }
});

/**
 * POST /sifre-degistir — bayinin parolasını değiştirir (mevcut parola doğrulanır).
 */
router.post('/sifre-degistir', authMiddleware, async (req, res) => {
    try {
        // Plasiyer, bayi adına açtığı oturumdan bayinin şifresini değiştiremez
        if (req.impersonatedBy) {
            return res.status(403).json({ success: false, code: 'IMPERSONATED_SESSION', message: 'Bayi adına açılan oturumda bayinin şifresi değiştirilemez.' });
        }
        const { currentPassword, newPassword } = req.body || {};
        if (!newPassword) {
            return res.status(400).json({ success: false, message: 'Yeni parola zorunludur.' });
        }
        if (String(newPassword).length < 4) {
            return res.status(400).json({ success: false, message: 'Yeni parola en az 4 karakter olmalıdır.' });
        }
        if (String(newPassword) === '12345') {
            return res.status(400).json({ success: false, message: 'Yeni parola varsayılan parola olamaz.' });
        }
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site });
        if (!member) return res.status(404).json({ success: false, message: 'Bayi bulunamadı.' });
        // Daha önce kendi şifresini belirlediyse mevcut parola doğrulanır; ilk kez belirliyorsa sorulmaz.
        if (member.customPasswordSet === true) {
            const ok = await member.comparePassword(String(currentPassword || ''));
            if (!ok) return res.status(400).json({ success: false, message: 'Mevcut parolanız hatalı.' });
        }
        member.password = String(newPassword); // pre-save hook bcrypt ile hashler
        member.customPasswordSet = true;        // artık yalnız bu şifre kabul edilir
        member.mustChangePassword = false;      // hatırlatma kapanır
        await member.save();
        return res.json({ success: true, message: 'Parolanız güncellendi.' });
    } catch (error) {
        console.error('[b2b-auth] Parola değiştirme hatası:', error.message);
        return res.status(500).json({ success: false, message: 'Parola değiştirilemedi.' });
    }
});

// Cari özet önbelleği: bayi başına 60 sn (her sayfa yüklemesi DIA'yı yormasın)
const cariOzetCache = new Map();
const CARI_OZET_TTL_MS = 5 * 60 * 1000; // 5 dk (DIA yükünü azalt; bayat cache hata halinde döner)

/**
 * GET /cari-ozet — oturumdaki bayinin DIA cari özeti (kuruş cinsinden):
 * bakiye, toplam limit (risklimiti), kalan limit, platformdaki bekleyen sipariş
 * toplamı. Vadesi geçen borç DIA ekstre servisine bağlanana kadar null döner.
 */
router.get('/cari-ozet', authMiddleware, async (req, res) => {
    let cacheKey = null;
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('diaCustomerKey diaCustomerCode diaCari').lean();
        if (!member?.diaCustomerKey) {
            return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });
        }

        // Platformdaki bekleyen siparişler (Mongo — anlık)
        const bekleyenSiparisKurus = await pendingOrderKurusOf(req.site, req.user._id);

        // Borç/Alacak — ekstre özetinden türet (DIA carikart borc/alacak çoğu zaman 0).
        // borç = debit + max(açılış,0), alacak = credit + max(−açılış,0) → borç−alacak = bakiye
        let borcKurus = 0, alacakKurus = 0;
        try {
            const B2bCariEkstre = require('../../../models/web/user/B2bCariEkstre');
            const ek = await B2bCariEkstre.findOne({ memberId: req.user._id, site: req.site }).select('summary').lean();
            if (ek?.summary) {
                const op = ek.summary.openingKurus || 0;
                borcKurus = (ek.summary.debitKurus || 0) + Math.max(op, 0);
                alacakKurus = (ek.summary.creditKurus || 0) + Math.max(-op, 0);
            }
        } catch (_) { /* borç/alacak olmadan da özet gösterilir */ }

        // Vadesi geçen borç: gerçek bakiye FIFO ile fatura vadelerine dağıtılıp
        // bugünden önceki kısmı toplanır. DIA hatasında null döner (kart "—" gösterir).
        const computeOverdueKurus = async (balanceKurus) => {
            // Borç yoksa (sıfır veya alacaklı/negatif bakiye) vadesi geçen de yoktur
            if (!(balanceKurus > 0)) return Number.isFinite(balanceKurus) ? 0 : null;
            try {
                const { invoiceDueDates } = require('../../../services/plugins/dia/b2bInvoiceReport');
                const due = await invoiceDueDates(req.site, member.diaCustomerKey, balanceKurus / 100);
                return Math.round((due.overdue || 0) * 100);
            } catch (e) {
                return null;
            }
        };

        // Senkronlanmış cari bilgisi Mongo'da varsa canlı DIA'ya GİTME (hızlı + güvenilir)
        if (member.diaCari?.syncedAt) {
            const c = member.diaCari;
            const totalLimitKurus = c.riskLimitiKurus || 0;
            const balanceKurus = c.bakiyeKurus || 0;
            // Vadesi geçen: önce günlük finans senkronundan; yoksa canlı FIFO hesap
            const overdueKurus = typeof c.overdueKurus === 'number'
                ? c.overdueKurus
                : await computeOverdueKurus(balanceKurus);
            return res.json({ success: true, data: {
                cariKodu: member.diaCustomerCode,
                balanceKurus,
                borcKurus,
                alacakKurus,
                totalLimitKurus,
                pendingOrderKurus: bekleyenSiparisKurus,
                remainingLimitKurus: totalLimitKurus - balanceKurus - bekleyenSiparisKurus,
                overdueKurus
            }, synced: true });
        }

        cacheKey = String(member.diaCustomerKey);
        const cached = cariOzetCache.get(cacheKey);
        if (cached && Date.now() - cached.at < CARI_OZET_TTL_MS) {
            return res.json({ success: true, data: cached.data, cached: true });
        }

        const { DiaOrderService } = require('../../../services/plugins/dia/DiaOrderService');
        const svc = new DiaOrderService(req.site);
        await svc.init().catch(() => { });
        await svc.login();
        const diaRes = await svc.sendRequest('/api/v3/scf/json', {
            scf_carikart_listele: {
                session_id: svc.sessionId,
                firma_kodu: svc.firmaKodu,
                donem_kodu: svc.donemKodu,
                filters: [{ field: '_key', operator: '=', value: cacheKey }],
                sorts: '',
                params: { selectedcolumns: ['carikartkodu', 'orjbakiye', 'borctoplam', 'alacaktoplam', 'risklimiti'] },
                limit: 1,
                offset: 0
            }
        });
        const kart = Array.isArray(diaRes?.result) ? diaRes.result[0] : null;
        if (!kart) {
            // DIA boş döndü (çakışma/geçici) — bayat cache varsa onu ver, kaybolmasın
            const stale = cariOzetCache.get(cacheKey);
            if (stale) return res.json({ success: true, data: stale.data, cached: true, stale: true });
            return res.status(502).json({ success: false, message: 'Cari bilgileri şu an alınamadı.' });
        }

        const kurus = (v) => Math.round((parseFloat(v) || 0) * 100);
        // `bakiye` işaretsiz; işaretli bakiye `orjbakiye` (alacaklı → negatif)
        const balanceKurus = String(kart.orjbakiye ?? '').trim() !== ''
            ? kurus(kart.orjbakiye)
            : (kurus(kart.borctoplam) - kurus(kart.alacaktoplam));
        const totalLimitKurus = kurus(kart.risklimiti);

        const data = {
            cariKodu: member.diaCustomerCode,
            balanceKurus,
            borcKurus,
            alacakKurus,
            totalLimitKurus,
            pendingOrderKurus: bekleyenSiparisKurus,
            remainingLimitKurus: totalLimitKurus - balanceKurus - bekleyenSiparisKurus,
            overdueKurus: await computeOverdueKurus(balanceKurus)
        };
        cariOzetCache.set(cacheKey, { at: Date.now(), data });
        res.json({ success: true, data });
    } catch (error) {
        // DIA hatası (çakışma/oturum) — bayat cache varsa döndür, ekran boş kalmasın
        const stale = cacheKey && cariOzetCache.get(cacheKey);
        if (stale) return res.json({ success: true, data: stale.data, cached: true, stale: true });
        console.error('[b2b-auth] Cari özet hatası:', error.message);
        res.status(500).json({ success: false, message: 'Cari bilgileri alınamadı.' });
    }
});

/**
 * GET /depo-stok?codes=kod1,kod2 — verilen stok kodlarının depo bazlı stoğu.
 * Depolar b2b DIA ayarındaki vitrinDepolari'ndan gelir. Yanıt: { "kod": [{ ad, adet }, ...], ... }
 */
router.get('/depo-stok', authMiddleware, async (req, res) => {
    try {
        const { parseCodes, getDepotStocks } = require('../../../services/web/b2b/depotStock');
        res.json({ success: true, data: await getDepotStocks(req.site, parseCodes(req.query.codes)) });
    } catch (error) {
        console.error('[b2b-auth] Depo stok hatası:', error.message);
        res.status(500).json({ success: false, message: 'Depo stoğu alınamadı.' });
    }
});

// Bayi sepeti sunucu kaydı: en fazla bu kadar kalem; sepet sayılmayacak kadar uzun süre dokunulmazsa kayıt süresi dolar
const DEALER_CART_MAX_LINES = 200;
const DEALER_CART_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * PUT /sepet — bayinin tarayıcıdaki sepetini sunucuya yazar (admin Aktif Sepetler bayi sepetlerini buradan görür).
 * Body: { lines: [{ productId, stockCode, diaStockCode, name, brand, image, quantity, unitPrice, warehouseName, xml }] }
 * Kayıt bayiye bağlıdır (userId = bayi, site = b2b); boş sepet gelirse kalemler temizlenir. Fiyatlar yalnız panelde
 * gösterim içindir — sipariş fiyatı siparişte sunucuda yeniden hesaplanır. Son hareket zamanı yalnız içerik değişince güncellenir.
 */
router.put('/sepet', authMiddleware, async (req, res) => {
    try {
        const WebCart = require('../../../models/web/cart/WebCart');
        const lines = Array.isArray(req.body?.lines) ? req.body.lines.slice(0, DEALER_CART_MAX_LINES) : [];
        const items = lines
            .map(l => ({
                productKey: String(l?.productId || '').slice(0, 64),
                productName: String(l?.name || '').slice(0, 200),
                productImage: String(l?.image || '').slice(0, 500),
                brandName: String(l?.brand || '').slice(0, 80),
                quantity: Math.max(1, Math.min(10000, parseInt(l?.quantity) || 1)),
                unitPrice: Math.max(0, Math.round((Number(l?.unitPrice) || 0) * 100) / 100),
                itemType: 'tire'
            }))
            .filter(i => i.productKey);
        const sameContent = (a, b) => a.length === b.length
            && a.every((x, i) => x.productKey === b[i]?.productKey && x.quantity === b[i]?.quantity && x.unitPrice === b[i]?.unitPrice);

        const existing = await WebCart.findOne({ site: req.site, userId: req.user._id });
        if (existing && sameContent(existing.items, items)) {
            return res.json({ success: true, changed: false });
        }
        const now = new Date();
        await WebCart.updateOne(
            { site: req.site, userId: req.user._id },
            {
                $set: { items, lastActivity: now, expiresAt: new Date(now.getTime() + DEALER_CART_TTL_MS) },
                $setOnInsert: { sessionId: `${req.site}-${req.user._id}` }
            },
            { upsert: true }
        );
        res.json({ success: true, changed: true });
    } catch (error) {
        console.error('[b2b-auth] Sepet kaydı hatası:', error.message);
        res.status(500).json({ success: false, message: 'Sepet kaydedilemedi.' });
    }
});

/**
 * Oturumdaki bayinin DIA cari adreslerini map'ler (scf_carikart m_adresler).
 */
function mapDiaAddresses(list) {
    return (Array.isArray(list) ? list : []).map((a, i) => {
        // DIA'nın kendi (fatura/ana) adresi ya da başlıksız kayıtlar "Varsayılan"
        // olarak gösterilir; bayinin form ile eklediği kendi başlığı korunur.
        const rawBaslik = String(a.adresadi || '').trim();
        // DIA'nın kendi (fatura/ana) adresi başlıksızsa "Adres" gösterilir;
        // "Varsayılan" ayrı bir rozet olarak (a.ana) çıkar, çift yazılmasın.
        const varsayilan = !rawBaslik || String(a.anaadres) === '1' || /fatura/i.test(rawBaslik);
        return {
        id: String(a._key || i),
        baslik: varsayilan ? 'Adres' : rawBaslik,
        teslimat: a.adrestipi === 'T',
        ana: String(a.anaadres) === '1',
        adres: [a.adres1, a.adres2].filter((x) => x && String(x).trim()).join(' ').trim(),
        il: a._key_sis_sehirler?.sehiradi || a.sehir || a.sehiradi || '',
        ilce: a.ilce || '',
        telefon: a.ceptel || ''
        };
    });
}

const adresCache = new Map();
const ADRES_TTL_MS = 30 * 60 * 1000; // 30 dk (adresler nadiren değişir; yeni adres eklenince invalidate edilir)

/**
 * GET /adresler — bayinin DIA carisindeki adresleri döner (fatura + teslimat).
 * 2 dk önbellekli (her sepet açılışında DIA'ya gidilmesin).
 */
router.get('/adresler', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('diaCustomerKey diaCari.addresses').lean();
        if (!member?.diaCustomerKey) return res.json({ success: true, data: [] });

        // Mongo'da senkronlanmış adres varsa oradan (ANINDA — canlı DIA'ya gitmez)
        if (member.diaCari?.addresses?.length) {
            return res.json({ success: true, data: member.diaCari.addresses, synced: true });
        }

        // Henüz senkronlanmamış (günlük sync gelmemiş) — lazy: DIA'dan çek, Mongo'ya yaz
        const { refreshMemberAddresses } = require('../../../services/plugins/dia/b2bAddress');
        const addresses = await refreshMemberAddresses(req.site, member._id, member.diaCustomerKey);
        return res.json({ success: true, data: addresses });
    } catch (error) {
        console.error('[b2b-auth] Adres listesi hatası:', error.message);
        res.status(500).json({ success: false, message: 'Adresler alınamadı.' });
    }
});

/**
 * POST /adres — bayinin DIA carisine yeni bir TESLİMAT adresi ekler.
 * Read-modify-write: cari kartı okunur, m_adresler'e eklenir, kart geri yazılır
 * (diğer alanlar korunur). { baslik, adres, il, ilce, telefon }
 */
router.post('/adres', authMiddleware, async (req, res) => {
    try {
        const { baslik, adSoyad, adres, adresDetay, il, ilce, telefon, postaKodu } = req.body || {};
        if (!adres || !String(adres).trim()) {
            return res.status(400).json({ success: false, message: 'Adres alanı zorunludur.' });
        }
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('diaCustomerKey diaCustomerCode firstName lastName email phone').lean();
        if (!member?.diaCustomerKey) {
            return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });
        }

        const { DiaOrderService } = require('../../../services/plugins/dia/DiaOrderService');
        const svc = new DiaOrderService(req.site);
        await svc.init().catch(() => {});
        await svc.login();

        // Cari kartını HİÇ güncellemeden, DIA'nın adrese özel metoduyla yeni
        // adresi doğrudan ekliyoruz: scf_carikart_adresleri_ekle. Adres cariye
        // `_key_scf_carikart` ile bağlanır ve DIA'da "Diğer Adresler" sekmesine
        // düşer. (scf_carikart_ekle yalnız INSERT'tir; tüm kartı yazmak vergi
        // no/kod/e-posta zorunluluklarına ve kopya cari riskine yol açıyordu.)
        const { addDiaDeliveryAddress } = require('../../../services/plugins/dia/b2bAddress');
        const upd = await addDiaDeliveryAddress(svc, member.diaCustomerKey, { baslik, adSoyad, adres, adresDetay, il, ilce, telefon, postaKodu });
        console.log('[b2b-adres] DIA adres ekle cevabı:', JSON.stringify({ code: upd?.code, key: upd?.key, msg: upd?.msg }));
        if (String(upd?.code) !== '200') {
            return res.status(502).json({ success: false, message: upd?.msg || 'Adres DIA cariye eklenemedi.' });
        }

        adresCache.delete(String(member.diaCustomerKey)); // önbelleği tazele

        // Yeni teslimat adresi yönetici paneline de düşsün: Mongo webaddresses'a
        // ayna kaydı yazılır (kaynak yine DIA; bu kayıt salt görüntüleme içindir).
        // Panelde ad ile gösterildiğinden il/ilçe/mahalle ID alanları için yer
        // tutucu yeterli; validasyon atlanır (b2b formunda mahalle ID yok).
        try {
            const WebAddress = require('../../../models/web/address/WebAddress');
            const adSoyadTam = (adSoyad && String(adSoyad).trim())
                || `${member.firstName || ''} ${member.lastName || ''}`.replace(/ \.$/, '').trim();
            const doc = new WebAddress({
                userId: member._id,
                addressName: (baslik && String(baslik).trim()) || 'Teslimat Adresi',
                addressDescription: String(adres).trim(),
                invoiceType: 'corporate',
                fullName: adSoyadTam,
                companyName: adSoyadTam,
                email: member.email || `${(member.diaCustomerCode || 'b2b').toLowerCase()}@eposta-tanimsiz.b2b`,
                phone: (telefon && String(telefon).trim()) || member.phone || '-',
                cityId: '-',
                cityName: (il || '').trim(),
                districtId: '-',
                districtName: (ilce || '').trim(),
                neighborhoodId: '-',
                neighborhoodName: '',
                addressNote: (adresDetay || '').trim(),
                isBilling: false,
                isShipping: true,
                isDefault: false
            });
            await doc.save({ validateBeforeSave: false });
        } catch (mongoErr) {
            console.error('[b2b-auth] Adres Mongo aynası yazılamadı:', mongoErr.message);
            // DIA yazımı başarılı; ayna hatası ana akışı bozmaz.
        }

        // Güncel listeyi güvenilir metotla (adresleri_listele) çek, Mongo'ya yaz, döndür
        const { fetchCariAddresses } = require('../../../services/plugins/dia/b2bAddress');
        const F2 = { session_id: svc.sessionId, firma_kodu: svc.firmaKodu, donem_kodu: svc.donemKodu };
        const addresses = await fetchCariAddresses(svc, F2, member.diaCustomerKey);
        if (addresses.length) {
            await WebMember.updateOne({ _id: member._id }, { $set: {
                'diaCari.addresses': addresses, 'diaCari.addressesSyncedAt': new Date()
            } });
        }
        res.json({ success: true, data: addresses });
    } catch (error) {
        console.error('[b2b-auth] Adres ekleme hatası:', error.message);
        res.status(500).json({ success: false, message: 'Adres eklenemedi.' });
    }
});

// Finansal iskonto ucunda tek istekte sorulabilecek en fazla ürün kodu
const FINANCIAL_DISCOUNT_MAX_CODES = 300;

// Cari segment (özelkod2, ör. F4) önbelleği — ödeme iskontoları buna bağlı.
const segmentCache = new Map();
const SEGMENT_TTL_MS = 10 * 60 * 1000;

async function getCariSegment(site, diaCustomerCode) {
    const key = `${site}:${diaCustomerCode}`;
    const c = segmentCache.get(key);
    if (c && Date.now() - c.at < SEGMENT_TTL_MS) return c.segment;
    // Önce Mongo'da senkronlanmış segment (canlı DIA'ya gitme)
    try {
        const m = await WebMember.findOne({ site, diaCustomerCode, 'diaCari.segment': { $nin: [null, ''] } })
            .select('diaCari.segment').lean();
        if (m?.diaCari?.segment) {
            segmentCache.set(key, { at: Date.now(), segment: m.diaCari.segment });
            return m.diaCari.segment;
        }
    } catch (e) { /* Mongo hatası — DIA'ya düş */ }
    const { DiaOrderService } = require('../../../services/plugins/dia/DiaOrderService');
    const svc = new DiaOrderService(site);
    await svc.init().catch(() => {});
    await svc.login();
    // scf_carikart_getir'in _key_sis_ozelkod2'si bazı carilerde boş/eksik
    // dönüyor (getir güvenilmez); scf_carikart_listele güvenilir ozelkod2kod verir.
    const r = await svc.sendRequest('/api/v3/scf/json', {
        scf_carikart_listele: {
            session_id: svc.sessionId, firma_kodu: svc.firmaKodu, donem_kodu: svc.donemKodu,
            filters: [{ field: 'carikartkodu', operator: '=', value: String(diaCustomerCode) }],
            limit: 1, offset: 0
        }
    });
    const row = Array.isArray(r?.result) ? r.result[0] : null;
    const segment = String(row?.ozelkod2kod || '').trim();
    segmentCache.set(key, { at: Date.now(), segment });
    return segment;
}

/**
 * GET /odeme-yontemleri — oturumdaki carinin segmentine (özelkod2) göre b2b
 * ödeme yöntemleri + marka bazlı iskonto haritası (DIA kampanyalarından).
 */
router.get('/odeme-yontemleri', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('diaCustomerKey diaCustomerCode diaCari.overdueKurus diaCari.riskLimitiKurus diaCari.bakiyeKurus diaCari.paymentTermDays').lean();
        if (!member?.diaCustomerCode) {
            return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });
        }
        let segment = await getCariSegment(req.site, member.diaCustomerCode);
        if (!segment) {
            // Segmenti (özelkod2) tanımsız carilerde varsayılan b2b segmenti
            // kullanılır — böylece ödeme yöntemleri her zaman gelir. Panelden
            // ayarlanır (webdia.b2bVarsayilanSegment); boşsa F4 (b2b standardı).
            const WebDia = require('../../../models/plugins/dia/DiaSettings');
            const s = await WebDia.getSettings(req.site);
            segment = String(s?.b2bVarsayilanSegment || 'F4').trim();
        }
        const { getB2bPaymentPricing } = require('../../../services/plugins/dia/diaCampaignPricing');
        const pricing = await getB2bPaymentPricing(req.site, segment);
        // Cari limiti: limit tanımsızsa ya da aşıldıysa vadeli (Cari Sipariş) yöntemi kapalı döner; sepet kalan limiti de bilir
        const credit = await getCreditStatus(req.site, member);
        const creditLimit = { hasLimit: credit.hasLimit, closed: credit.closed, reason: credit.reason, methodId: CREDIT_PAYMENT_METHOD, totalLimitKurus: credit.totalLimitKurus, remainingLimitKurus: credit.remainingLimitKurus, orderingClosed: credit.orderingClosed, orderingClosedReason: credit.orderingClosedReason, orderingClosedMessage: credit.orderingClosed ? ORDERING_CLOSED_MESSAGES[credit.orderingClosedReason] : '', cartClosed: credit.cartClosed, cartClosedMessage: credit.cartClosed ? CART_CLOSED_MESSAGE : '' };
        const blocked = await discountsBlocked(req.site, member);
        // Vadeli alım kapalıysa (limit tanımsız, limit aşıldı ya da vadesi geçen borç) Cari Sipariş listede HİÇ gösterilmez
        const hideCreditMethod = credit.closed;
        const methods = (pricing.methods || []).filter(m => !(hideCreditMethod && m.id === CREDIT_PAYMENT_METHOD)).map(m => ({
            ...m,
            // Vadesi geçen borcu olan caride ödeme yöntemi iskontoları sıfırlanır (yöntemler seçilebilir kalır)
            ...(blocked ? { discountPct: 0 } : {}),
            ...(credit.closed && m.id === CREDIT_PAYMENT_METHOD ? { disabled: true } : {}),
            // Cari Sipariş: carinin DIA ödeme planındaki vade günü (ör. 30) — sepette yöntemin yanında yazar
            ...(m.id === CREDIT_PAYMENT_METHOD && Number.isFinite(member.diaCari?.paymentTermDays) ? { termDays: member.diaCari.paymentTermDays } : {})
        }));
        res.json({
            success: true,
            data: {
                ...pricing,
                methods,
                ...(blocked ? { brandMap: {}, defaultDiscounts: Object.fromEntries(Object.keys(pricing.defaultDiscounts || {}).map(k => [k, 0])), discountsBlocked: true } : {}),
                creditLimit
            }
        });
    } catch (error) {
        console.error('[b2b-auth] Ödeme yöntemleri hatası:', error.message);
        res.status(500).json({ success: false, message: 'Ödeme yöntemleri alınamadı.' });
    }
});

/**
 * GET /fiyat-orani — oturumdaki carinin segmentine göre "Sabit Fiyatlı Ürünler
 * | Cari" fiyat kartı oranı: { tanimlifiyat, fiyatyuzde, artieksi }. Vitrin,
 * satış fiyatını fiyat<tanimlifiyat> × (fiyatyuzde/100) ile hesaplar (dinamik).
 */
router.get('/fiyat-orani', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('diaCustomerCode').lean();
        let segment = member?.diaCustomerCode ? await getCariSegment(req.site, member.diaCustomerCode) : '';
        if (!segment) {
            const WebDia = require('../../../models/plugins/dia/DiaSettings');
            const s = await WebDia.getSettings(req.site);
            segment = String(s?.b2bVarsayilanSegment || 'F4').trim();
        }
        const { getSabitCariRate } = require('../../../services/plugins/dia/diaCampaignPricing');
        const rate = await getSabitCariRate(req.site, segment);
        // Kargo ücreti açık mı (DIA ayarında kargo bedeli hizmet kartı seçili) — vitrin fiyatına kargo payını buna göre ekler
        res.json({ success: true, data: { segment, ...rate, shippingEnabled: await isShippingEnabled(req.site) } });
    } catch (error) {
        console.error('[b2b-auth] Fiyat oranı hatası:', error.message);
        res.status(500).json({ success: false, message: 'Fiyat oranı alınamadı.' });
    }
});

/**
 * GET /teslimat-yontemleri?adresId= — seçilen teslimat adresinde sunulan teslimat yöntemleri
 * (Kargo Firmaları tanımları; hizmet bölgesi tanımlı olanlar yalnız o il / ilçelerde). Sıra: öncelik.
 */
router.get('/teslimat-yontemleri', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site }).select('diaCari.addresses').lean();
        if (!member) return res.status(404).json({ success: false, message: 'Bayi kaydınız bulunamadı.' });
        const methods = await getDeliveryMethods(req.site, deliveryLocationOf(member, req.query.adresId));
        res.json({ success: true, data: methods });
    } catch (error) {
        console.error('[b2b-auth] Teslimat yöntemleri hatası:', error.message);
        res.status(500).json({ success: false, message: 'Teslimat yöntemleri alınamadı.' });
    }
});

/**
 * POST /finansal-iskonto — oturumdaki carinin tipine (Premium / Normal) göre, verilen ürünler için
 * panelde tanımlı finansal iskonto oranları: { tier, methods: [{ id, title }], discounts: { stokKodu: { ödemeYöntemi: oran } }, discountsBlocked }.
 * Yalnız kuralı eşleşen ürün/yöntemler döner. Ürün listesi ve sepet bunu gösterir; /siparis aynı kuralı uygular.
 */
router.post('/finansal-iskonto', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site }).select('diaCari.premium diaCari.overdueKurus diaCari.paymentTermDays').lean();
        if (!member) return res.status(404).json({ success: false, message: 'Bayi kaydınız bulunamadı.' });
        const { tierOfMember, resolveForStocks } = require('../../../services/web/b2b/financialDiscounts');
        const { PAYMENT_METHODS } = require('../../../services/plugins/dia/diaCampaignPricing');
        const tier = tierOfMember(member);
        const codes = [...new Set((Array.isArray(req.body?.codes) ? req.body.codes : []).map(c => String(c || '').trim()).filter(Boolean))]
            .slice(0, FINANCIAL_DISCOUNT_MAX_CODES);
        // Ödeme yöntemleri (sıra + ad) — bayi ekranı yöntem bazlı fiyatları bu sırayla gösterir
        // Cari Sipariş yanında carinin DIA ödeme planındaki vade günü (ürün listesi fiyat kutusunda gösterilir)
        const termDays = Number.isFinite(member.diaCari?.paymentTermDays) ? member.diaCari.paymentTermDays : null;
        const methods = PAYMENT_METHODS.map(m => ({ id: m.id, title: m.title, ...(m.id === CREDIT_PAYMENT_METHOD && termDays > 0 ? { termDays } : {}) }));
        // Vadesi geçen borcu olan caride iskontolar SEPETTE ve SİPARİŞTE uygulanmaz (discountsBlocked); oranlar yine döner ki
        // ürün listesinde bayi alabileceği iskontoyu görsün. Sepet ve sepet paneli bu bayrakla oranları yok sayar.
        const blocked = await discountsBlocked(req.site, member);
        if (!codes.length) return res.json({ success: true, data: { tier, methods, discounts: {}, discountsBlocked: blocked } });
        const DiaStock = require('../../../models/plugins/DiaStock');
        const { getNetPriceRule, netPriceSelect } = require('../../../services/web/b2b/netPrice');
        const netRule = await getNetPriceRule(req.site);
        const stocks = await DiaStock.find({ stokkartkodu: { $in: codes } }).select(`stokkartkodu marka ekalan5 m_kategoriler ${netPriceSelect(netRule)}`).lean();
        const discounts = await resolveForStocks(req.site, tier, stocks, PAYMENT_METHODS.map(m => m.id));
        // Kargo payları (sitede kargo açıksa): liste / sepet bunu ürün fiyatına ekler ya da ayrı satır gösterir
        const shipping = await isShippingEnabled(req.site)
            ? Object.fromEntries([...(await shippingForStockCodes(req.site, codes)).entries()].filter(([, v]) => v.perUnit > 0))
            : {};
        res.json({ success: true, data: { tier, methods, discounts, discountsBlocked: blocked, shipping } });
    } catch (error) {
        console.error('[b2b-auth] Finansal iskonto hatası:', error.message);
        res.status(500).json({ success: false, message: 'İskonto bilgisi alınamadı.' });
    }
});

/**
 * POST /siparis — b2b bayi siparişi oluşturur ve DIA'ya aktarır.
 * Fiyat SUNUCUDA hesaplanır (istemciye güvenilmez): DiaStock.fiyat1 → Cari taban
 * (fiyat1 × oran) → seçilen ödeme yöntemi iskontosu. Kalemler DIA'ya
 * müşteri siparişi (scf_siparis_ekle) olarak gider; b2b'de şirketler arası zincir
 * kapalı olduğu için fiziksel stok hareketi olmaz. Sipariş yönetici paneline düşer.
 */
// XML (tedarikçi) kartlarının DIA stok kodu eki
const XML_STOCK_CODE_SUFFIX = '-XML';

/** XML ürünün sitede gösterilen satış fiyatı (KDV dahil; katalog /products/filter ile aynı hesap). Fiyat yoksa 0. */
async function xmlSalePrice(site, stokkartkodu) {
    const WebProduct = require('../../../models/web/catalog/WebProduct');
    const { applySitePricingMany } = require('../../../utils/sitePricing');
    const product = await WebProduct.findOne({
        sites: site,
        'diaData.stokkartkodu': stokkartkodu,
        'syncInfo.syncSource': 'xml_integration'
    }).lean();
    if (!product) return 0;
    applySitePricingMany([product], site);
    if (product.customData?.priceHidden) return 0;
    return Math.round((Number(product.customData?.webPrice) || 0) * 100) / 100;
}

// Aynı bayiden birebir aynı Cari/Havale siparişi bu süre içinde tekrar gelirse yeni sipariş açılmaz
const DUPLICATE_ORDER_WINDOW_MS = 2 * 60 * 1000;
// Sipariş açıklaması azami uzunluğu (DIA açıklama satırı 128 karakter; sepet alanıyla aynı)
const ORDER_NOTE_MAX_LENGTH = 128;

router.post('/siparis', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site }).lean();
        if (!member) {
            return res.status(404).json({ success: false, message: 'Bayi kaydınız bulunamadı.' });
        }

        const { items, paymentMethod, deliveryMethod, address } = req.body || {};
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Sepetiniz boş.' });
        }

        // Mükerrer koruma: bayi yanıtı beklerken sayfayı yenileyip tekrar gönderirse aynı Cari/Havale siparişi ikinci kez açılmaz,
        // son DUPLICATE_ORDER_WINDOW_MS içindeki birebir aynı sipariş döner (kartlı siparişte yeni deneme serbesttir)
        const requestedMethod = ['cari', 'havale'].includes(paymentMethod) ? paymentMethod : null;
        if (requestedMethod) {
            const WebOrderModel = require('../../../models/web/order/WebOrder');
            const itemsKey = (list) => list
                .map(it => `${String(it?.stockCode || '').trim()}:${Math.max(1, parseInt(it?.quantity) || 1)}`)
                .sort().join('|');
            const requestedKey = itemsKey(items);
            const recentOrders = await WebOrderModel.find({
                site: req.site,
                memberId: member._id,
                'payment.method': requestedMethod === 'havale' ? 'bank_transfer' : 'cari',
                status: { $nin: ['cancelled', 'payment_failed'] },
                createdAt: { $gte: new Date(Date.now() - DUPLICATE_ORDER_WINDOW_MS) }
            }).select('orderNumber items.stockCode items.quantity pricing.total').sort({ createdAt: -1 }).lean();
            const duplicate = recentOrders.find(o => itemsKey(o.items || []) === requestedKey);
            if (duplicate) {
                console.log('[b2b-auth] Mükerrer sipariş isteği, mevcut sipariş döndü:', duplicate.orderNumber);
                return res.json({ success: true, data: { orderNumber: duplicate.orderNumber, total: duplicate.pricing?.total, duplicate: true } });
            }
        }

        // Limit tanımsız, bitmiş ya da vadesi geçen borç varsa ödeme yönteminden bağımsız olarak sipariş verilemez
        const orderCredit = await getCreditStatus(req.site, member);
        if (orderCredit.orderingClosed) {
            return res.status(400).json({ success: false, code: 'ORDERING_CLOSED', reason: orderCredit.orderingClosedReason, message: ORDERING_CLOSED_MESSAGES[orderCredit.orderingClosedReason] });
        }

        const DiaStock = require('../../../models/plugins/DiaStock');
        const WebOrder = require('../../../models/web/order/WebOrder');
        const { getSabitCariRate, getB2bPaymentPricing, discountFor } = require('../../../services/plugins/dia/diaCampaignPricing');
        const { getActiveRules, matchFinancialDiscount, splitMethodDiscount, productScope, tierOfMember, getSecondHandRule, isSecondHandStock } = require('../../../services/web/b2b/financialDiscounts');
        const secondHandRule = await getSecondHandRule();
        // Panelde tanımlı finansal iskontolar (cari tipine göre) — eşleşen satırda DIA ödeme iskontosunun yerine geçer
        const financialRules = await getActiveRules(req.site);
        const customerTier = tierOfMember(member);
        const noDiscounts = await discountsBlocked(req.site, member);

        // Segment + Cari oranı + ödeme yöntemi iskonto haritası
        let segment = await getCariSegment(req.site, member.diaCustomerCode);
        if (!segment) {
            const WebDia = require('../../../models/plugins/dia/DiaSettings');
            const s = await WebDia.getSettings(req.site);
            segment = String(s?.b2bVarsayilanSegment || 'F4').trim();
        }
        const cariRate = await getSabitCariRate(req.site, segment);
        const oran = (Number(cariRate.fiyatyuzde) > 0 ? Number(cariRate.fiyatyuzde) : 50) / 100;
        const pricing = await getB2bPaymentPricing(req.site, segment);
        const methodId = ['cari', 'havale', 'kkTek', 'kkTaksit'].includes(paymentMethod) ? paymentMethod : 'cari';
        // Teslimat yöntemi: yalnız seçilen teslimat adresinde sunulan yöntemler kabul edilir (Kargo Firmaları + hizmet bölgesi);
        // geçersiz / bölge dışı seçimde o adresin ilk yöntemi kullanılır
        const deliveryMethods = await getDeliveryMethods(req.site, deliveryLocationOf(member, req.body?.deliveryAddressId));
        const shippingMethod = (deliveryMethods.find(d => d.id === deliveryMethod) || deliveryMethods[0])?.id || '';

        // Kalemler — fiyat sunucuda DiaStock.fiyat1'den
        // Net Fiyat ürünleri (DIA ek alanı) yalnız Cari iskontosu alır
        const { getNetPriceRule, netPriceSelect, isNetPriceStock } = require('../../../services/web/b2b/netPrice');
        const netRule = await getNetPriceRule(req.site);
        const orderItems = [];
        let subtotal = 0, vatAmount = 0, total = 0, discountAmount = 0;
        for (const it of items) {
            const requestedCode = String(it?.stockCode || '').trim();
            const qty = Math.max(1, parseInt(it?.quantity) || 1);
            if (!requestedCode) continue;
            // XML ürün: katalog kodu "-XML" eki olmadan gösterir; eski sepet kayıtları kısa kodla gelebilir.
            // xml işaretli satırda önce XML kartı, diğerlerinde önce gelen kod aranır
            const xmlCode = requestedCode.endsWith(XML_STOCK_CODE_SUFFIX) ? requestedCode : `${requestedCode}${XML_STOCK_CODE_SUFFIX}`;
            const lookupCodes = [...new Set(it?.xml === true ? [xmlCode, requestedCode] : [requestedCode, xmlCode])];
            let stock = null;
            for (const code of lookupCodes) {
                stock = await DiaStock.findOne({ stokkartkodu: code })
                    .select(`_key stokkartkodu aciklama marka ekalan5 m_kategoriler m_birimler birimindirimorani b2c_indirimorani ${netPriceSelect(netRule)}`).lean();
                if (stock) break;
            }
            if (!stock) {
                return res.status(400).json({ success: false, message: `Ürün bulunamadı: ${requestedCode}` });
            }
            const kod = stock.stokkartkodu;
            const isXml = kod.endsWith(XML_STOCK_CODE_SUFFIX);
            const fiyat1 = Number(stock.m_birimler?.[0]?.fiyat1) || 0;
            const fiyat4 = Number(stock.m_birimler?.[0]?.fiyat4) || 0;
            // XML ürün: sipariş fiyatı katalogda gösterilen XML fiyatıdır (KDV dahil, iskontosuz) — DIA fiyat1'i XML kartında boştur
            const xmlPrice = isXml ? await xmlSalePrice(req.site, kod) : 0;
            if (isXml ? xmlPrice <= 0 : fiyat1 <= 0) {
                return res.status(400).json({ success: false, message: `Fiyatı tanımsız ürün: ${requestedCode}` });
            }
            // B2C İndirim Oranı 0 (2.El vb.) → cari iskonto UYGULANMAZ, baz = fiyat4 (bayi).
            const b2cOran = parseFloat(String(stock.birimindirimorani || '').replace(/[^0-9.]/g, ''))
                || Number(stock.b2c_indirimorani) || 0;
            // İkinci el üründe hiçbir iskonto yoktur (cari iskontosu da): baz = fiyat4 (bayi)
            const secondHand = isSecondHandStock(stock, secondHandRule);
            const oranSifir = !isXml && (b2cOran === 0 || secondHand) && fiyat4 > 0;
            const baseFiyat = oranSifir ? fiyat4 : fiyat1;
            // İskonto oranları AYRI ve ZİNCİRLİ: Cari (fiyat1→cari) + ödeme yöntemi.
            // XML ve oran=0 üründe cari iskonto yok.
            const cariPct = (isXml || oranSifir) ? 0 : Math.round((1 - oran) * 100 * 1e6) / 1e6; // ör. %50
            const scope = productScope(stock);
            // Seçilen yöntemin oranı; kural eşleşmezse DIA oranı
            const methodRateOf = id => {
                const rule = matchFinancialDiscount(financialRules, { tier: customerTier, methodId: id, scope });
                return rule ? rule.rate : discountFor(pricing, stock.marka, id);
            };
            // Vadesi geçen borcu olan caride ve Net Fiyat ürününde ödeme iskontosu yok (yalnız taban cari fiyatı)
            const netPrice = isNetPriceStock(stock, netRule);
            const noPaymentDiscount = isXml || noDiscounts || netPrice || secondHand;
            const paymentPct = noPaymentDiscount ? 0 : methodRateOf(methodId);
            // Yöntem oranı DIA'ya iki satırda gider: yıl + marka iskontosu (Cari Sipariş oranı) + ödeme yönteminden kalan fark
            const split = splitMethodDiscount(noPaymentDiscount ? 0 : methodRateOf(CREDIT_PAYMENT_METHOD), paymentPct);
            // POZİSYONEL: [indirim1=Cari, indirim2=yıl + marka, indirim3=ödeme yöntemi farkı]. Zincirli.
            const discountRates = isXml ? [] : [cariPct, split.yearBrandRate, split.remainderRate];
            // Satış fiyatı yöntemin TAM oranından hesaplanır (bölünmüş oranların yuvarlaması fiyata yansımaz)
            let factor = 1;
            for (const r of [cariPct, paymentPct]) if (r > 0.000001) factor *= (1 - r / 100);
            const listUnitPrice = isXml ? xmlPrice : baseFiyat;                              // KDV dahil LİSTE (oran=0: fiyat4)
            const unitPrice = isXml ? xmlPrice : Math.round(baseFiyat * factor * 100) / 100; // KDV dahil final satış (XML: iskontosuz)
            // Breakdown (KDV hariç): Ara Toplam = net mal bedeli, İskonto = liste−satış farkı
            const lineNetHaric = Math.round((unitPrice * qty / 1.2) * 100) / 100;
            const lineGrossHaric = Math.round((listUnitPrice * qty / 1.2) * 100) / 100;
            const lineVat = Math.round((lineNetHaric * 0.20) * 100) / 100;
            subtotal += lineNetHaric;
            discountAmount += Math.round((lineGrossHaric - lineNetHaric) * 100) / 100;
            vatAmount += lineVat;
            total += Math.round((lineNetHaric + lineVat) * 100) / 100;
            orderItems.push({
                productKey: String(stock._key),
                stockCode: stock.stokkartkodu,
                name: stock.aciklama || kod,
                quantity: qty,
                unitPrice,
                listUnitPrice,
                discountRates,
                totalPrice: Math.round(unitPrice * qty * 100) / 100,
                vatRate: 20,
                vatAmount: lineVat,
                isXml
            });
        }
        if (!orderItems.length) {
            return res.status(400).json({ success: false, message: 'Geçerli ürün bulunamadı.' });
        }

        // Kargo bedeli (DIA ayarında kargo hizmet kartı seçiliyse): ürün başına pay, iskontosuz; toplamlara eklenir,
        // DIA'ya ürün satırlarından ayrı hizmet satırı olarak gider
        let shippingCost = 0;
        if (await isShippingEnabled(req.site)) {
            const shipping = await shippingForStockCodes(req.site, orderItems.map(i => i.stockCode));
            for (const item of orderItems) {
                const perUnit = shipping.get(item.stockCode)?.perUnit || 0;
                if (!(perUnit > 0)) continue;
                const line = Math.round(perUnit * item.quantity * 100) / 100;
                const lineHaric = Math.round((line / 1.2) * 100) / 100;
                item.shippingPerUnit = perUnit;
                item.shippingTotal = line;
                shippingCost += line;
                subtotal += lineHaric;
                vatAmount += Math.round((line - lineHaric) * 100) / 100;
                total += line;
            }
        }

        // Cari limiti: vadeli (Cari Sipariş) yöntem kapalıysa reddedilir; HER ödeme yönteminde sipariş tutarı kalan limiti aşamaz
        if (methodId === CREDIT_PAYMENT_METHOD && orderCredit.closed) {
            return res.status(400).json({ success: false, code: 'CREDIT_CLOSED', reason: orderCredit.reason, message: CREDIT_CLOSED_MESSAGES[orderCredit.reason] });
        }
        if (Math.round(total * 100) > orderCredit.remainingLimitKurus) {
            return res.status(400).json({ success: false, code: 'CREDIT_LIMIT_INSUFFICIENT', message: CREDIT_LIMIT_INSUFFICIENT_MESSAGE });
        }

        // Ödeme yöntemi → WebOrder payment (DIA ödeme planı bunun üstünden seçilir)
        const paymentMap = {
            cari: { method: 'cari', installment: 1 },
            havale: { method: 'bank_transfer', installment: 1 },
            kkTek: { method: 'credit_card', installment: 1 },
            kkTaksit: { method: 'credit_card', installment: 2 }
        };
        const pay = paymentMap[methodId];

        // Teslimat adresi: bayinin sepette seçtiği adres (cari kartındaki DIA adres kaydı) — DIA siparişinde sevk adresi olur.
        // Seçim yoksa carinin ana (fatura) adresi teslimat adresi sayılır; cari kartında hiç adres yoksa boş kalır
        // (syncOrderToDia fatura adresini DIA'dan bağlar).
        const memberAddresses = member.diaCari?.addresses || [];
        const selectedAddress = memberAddresses.find(a => String(a.id) === String(req.body?.deliveryAddressId || ''));
        const defaultAddress = memberAddresses.find(a => a.ana) || memberAddresses[0];
        const adr = selectedAddress || address || defaultAddress || {};
        const musteriAd = adr.fullName || member.unvan || member.companyName
            || `${member.firstName || ''} ${member.lastName || ''}`.trim() || member.diaCustomerCode || 'Bayi';
        const musteriTel = adr.phone || adr.telefon || member.phone || '';
        const shippingSnapshot = {
            addressName: adr.baslik || adr.addressName || 'Teslimat',
            fullName: musteriAd,
            email: member.email || '',
            phone: musteriTel,
            cityName: adr.il || adr.cityName || '',
            districtName: adr.ilce || adr.districtName || '',
            street: adr.adres || adr.address || adr.street || '',
            // Seçilen teslimat adresinin DIA kaydı (varsa) — "Sevk Adresi" bölümü için.
            // Boşsa syncOrderToDia carinin fatura adresini bağlar.
            diaAddressKey: parseInt(adr.id || adr.diaAddressKey) || 0
        };

        // Kredi kartı siparişinde dönüş POST'unu (JWT'siz) doğrulamak için tek
        // kullanımlık nonce — payment.paymentGuid'de saklanır, istemciye döner.
        const kartOdemesi = methodId === 'kkTek' || methodId === 'kkTaksit';
        const paymentToken = kartOdemesi ? require('crypto').randomBytes(24).toString('hex') : undefined;

        const orderNumber = await WebOrder.generateOrderNumber(req.site);
        const order = await WebOrder.create({
            site: req.site,
            orderNumber,
            memberId: member._id,
            customerName: musteriAd,
            customerPhone: musteriTel,
            items: orderItems,
            // Fatura bilgileri carinin DIA kartından (panelde sipariş detayında görünür)
            billingSnapshot: require('../../../services/web/b2b/orderBilling').buildBillingSnapshot(member, musteriAd),
            pricing: {
                subtotal: Math.round(subtotal * 100) / 100,
                vatAmount: Math.round(vatAmount * 100) / 100,
                discountAmount: Math.round(discountAmount * 100) / 100,
                shippingCost: Math.round(shippingCost * 100) / 100,
                total: Math.round(total * 100) / 100,
                currency: 'TRY'
            },
            payment: {
                method: pay.method, status: 'pending', installment: pay.installment, paymentGuid: paymentToken,
                // Cari Sipariş: carinin kendi DIA ödeme planı (vade günü sepette gösterilenle aynı)
                ...(methodId === CREDIT_PAYMENT_METHOD && member.diaCari?.paymentPlanKey ? { diaPaymentPlanKey: member.diaCari.paymentPlanKey } : {})
            },
            shipping: { method: shippingMethod },
            shippingSnapshot,
            customerNote: `Ödeme: ${methodId} · Teslimat: ${shippingMethod}`,
            // Bayinin sepette yazdığı açıklama (tek satır; DIA açıklama satırına gider)
            orderNote: String(req.body?.orderNote || '').replace(/\s+/g, ' ').trim().slice(0, ORDER_NOTE_MAX_LENGTH) || undefined,
            // Cari Sipariş limit ve borç denetimlerinden geçmiştir, ödeme beklemez: doğrudan onaylıdır.
            // Havale ve kart siparişi onay / ödeme bekler (kartta ödeme alınınca onaylanır).
            status: methodId === CREDIT_PAYMENT_METHOD ? 'confirmed' : 'pending'
        });

        // Kredi kartında (kkTek/kkTaksit) DIA aktarımı ÖDEME ONAYINDAN SONRA yapılır
        // (bkz. /api/b2b/payment/paynet/return). Burada yalnız pending sipariş döner.
        if (kartOdemesi) {
            return res.json({
                success: true,
                data: {
                    orderId: String(order._id),
                    orderNumber,
                    total: order.pricing.total,
                    paymentToken,
                    requiresPayment: true
                }
            });
        }

        // Cari / Havale: sipariş oluşur oluşmaz DIA'ya aktarılır (stok hareketi yok). Aktarım arka planda sürer:
        // DIA kilidi başka işte meşgulse bayi yanıtı beklerken "yükleniyor"da kalıp siparişi tekrar göndermesin
        const { syncOrderToDia } = require('../../../services/plugins/dia/DiaOrderService');
        syncOrderToDia(order.toObject())
            .then(result => {
                if (!result?.success) console.error('[b2b-auth] Sipariş DIA aktarımı başarısız:', orderNumber, result?.message);
            })
            .catch(e => console.error('[b2b-auth] Sipariş DIA aktarım hatası:', orderNumber, e.message));

        // Bayiye "siparişiniz alındı" maili (yönetici kopyasıyla); kart siparişinde ödeme sonrası makbuzla gider
        require('../../../services/web/b2b/b2bMail').queueOrderMail(order._id);

        res.json({
            success: true,
            data: {
                orderNumber,
                total: order.pricing.total
            }
        });
    } catch (error) {
        console.error('[b2b-auth] Sipariş oluşturma hatası:', error.message);
        res.status(500).json({ success: false, message: 'Sipariş oluşturulamadı: ' + error.message });
    }
});

/**
 * GET /siparis/:orderNumber — bayiye ait siparişi getir (ödeme makbuzu/detay için).
 * Satıcı firma bilgisi (companyInfo) de eklenir; makbuz başlığında kullanılır.
 */
router.get('/siparis/:orderNumber', authMiddleware, async (req, res) => {
    try {
        const WebOrder = require('../../../models/web/order/WebOrder');
        let order = await WebOrder.findOne({
            orderNumber: String(req.params.orderNumber || '').trim(),
            site: req.site,
            memberId: req.user._id
        }).lean();
        // Panel dışı (DIA) sipariş — WebOrder'da yoksa: önce lazy DB cache, sonra DIA
        if (!order) {
            const orderNo = String(req.params.orderNumber || '').trim();
            const member = await WebMember.findOne({ _id: req.user._id, site: req.site }).select('diaCustomerKey').lean();
            const key = member?.diaCustomerKey ? String(member.diaCustomerKey) : null;
            const B2bOrderDetail = require('../../../models/web/user/B2bOrderDetail');
            // Cache — yalnız sahibi cari okuyabilir
            const cachedDoc = await B2bOrderDetail.findOne({ site: req.site, orderNumber: orderNo }).lean();
            if (cachedDoc?.order && key && String(cachedDoc.diaCustomerKey) === key) {
                order = cachedDoc.order;
            } else if (key) {
                try {
                    const { fetchOrderDetail } = require('../../../services/plugins/dia/b2bOrderList');
                    order = await fetchOrderDetail(req.site, orderNo, key);
                    if (order) {
                        B2bOrderDetail.updateOne(
                            { site: req.site, orderNumber: orderNo },
                            { $set: { order, diaCustomerKey: key, syncedAt: new Date() } },
                            { upsert: true }
                        ).catch(() => {});
                    }
                } catch (_) { /* DIA hatası → aşağıda 404 */ }
            }
        }
        if (!order) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı.' });
        }
        let company = {};
        try {
            const WebSettings = require('../../../models/web/settings/WebSettings');
            const settings = await WebSettings.getSettings(req.site);
            company = settings?.companyInfo || {};
        } catch (_) { /* firma bilgisi olmasa da makbuz oluşur */ }
        res.set('Cache-Control', 'no-store');
        return res.json({ success: true, data: { order, company } });
    } catch (error) {
        console.error('[b2b-auth] Sipariş getirme hatası:', error.message);
        res.status(500).json({ success: false, message: 'Sipariş alınamadı.' });
    }
});

/**
 * GET /siparislerim — giriş yapan bayinin siparişleri (liste, en yeni önce).
 */
// Sipariş listesi — carinin DIA siparişleri (panel dışı dahil), 15 dk cache
const siparisListesiCache = new Map();

router.get('/siparislerim', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('diaCustomerKey').lean();
        if (!member?.diaCustomerKey) {
            return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });
        }
        // Sipariş Açıklaması: yalnız bayinin sepette yazdığı not (WebOrder.orderNote). DIA açıklama alanları
        // personelin iç notlarını taşıdığı için bayiye gösterilmez; panel dışı siparişte açıklama boş kalır.
        const withNotes = async (orders) => {
            const WebOrder = require('../../../models/web/order/WebOrder');
            const notes = await WebOrder.find({ site: req.site, memberId: req.user._id, orderNote: { $nin: [null, ''] } })
                .select('orderNumber orderNote').lean();
            const byNumber = new Map(notes.map(n => [n.orderNumber, n.orderNote]));
            return orders.map(o => ({ ...o, orderNote: byNumber.get(o.orderNumber) || '' }));
        };
        const key = String(member.diaCustomerKey);
        const cached = siparisListesiCache.get(key);
        if (cached && Date.now() - cached.at < 15 * 60 * 1000) {
            const orders = await withNotes(cached.orders);
            return res.json({ success: true, data: { orders, total: orders.length }, cached: true });
        }
        const { fetchOrders } = require('../../../services/plugins/dia/b2bOrderList');
        const diaOrders = await fetchOrders(req.site, member.diaCustomerKey);
        siparisListesiCache.set(key, { at: Date.now(), orders: diaOrders });
        const orders = await withNotes(diaOrders);
        res.set('Cache-Control', 'no-store');
        return res.json({ success: true, data: { orders, total: orders.length } });
    } catch (error) {
        console.error('[b2b-auth] Sipariş listesi hatası:', error.message);
        res.status(502).json({ success: false, message: 'Siparişler alınamadı.' });
    }
});

// Bayi fatura istatistiği (yıl/ay ciro + alım adet) — kısa süreli cache
const purchaseStatsCache = new Map();

/**
 * GET /alim-adet — giriş yapan bayinin DIA satış FATURALARINDAN yıl/ay bazlı
 * ciro (net, KDV dahil) + alım adedi (toplammiktar). İptal/iade hariç.
 */
router.get('/alim-adet', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('diaCustomerKey diaCari.purchaseStats').lean();
        if (!member?.diaCustomerKey) {
            return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });
        }
        // Önce DB (günlük finans senkronu) — anında, DIA-bağımsız
        if (member.diaCari?.purchaseStats?.years) {
            return res.json({ success: true, data: member.diaCari.purchaseStats, synced: true });
        }
        // Fallback: canlı DIA (senkron henüz oluşmamışsa), 1 saat cache
        const key = String(member.diaCustomerKey);
        const cached = purchaseStatsCache.get(key);
        if (cached && Date.now() - cached.at < 60 * 60 * 1000) {
            return res.json({ success: true, data: cached.data, cached: true });
        }
        const { invoiceStats } = require('../../../services/plugins/dia/b2bInvoiceReport');
        const data = await invoiceStats(req.site, member.diaCustomerKey);
        purchaseStatsCache.set(key, { at: Date.now(), data });
        res.set('Cache-Control', 'no-store');
        return res.json({ success: true, data });
    } catch (error) {
        console.error('[b2b-auth] Fatura istatistik hatası:', error.message);
        return res.status(502).json({ success: false, message: 'Fatura istatistiği şu an alınamadı.' });
    }
});

// Bayi vade takvimi (açık satış faturalarının vadeleri) — kısa süreli cache
const dueDatesCache = new Map();

/**
 * GET /vade-takvimi — giriş yapan bayinin açık (ödenmemiş) satış faturalarının
 * vade tarihi + kalan tutarı (takvim görünümü için).
 */
router.get('/vade-takvimi', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('diaCustomerKey diaCari').lean();
        if (!member?.diaCustomerKey) {
            return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });
        }
        // Bugün (okuma anında) — vade kalemleri sabit, "bugün" dinamik olmalı.
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        // Önce DB (günlük finans senkronu) — anında, DIA-bağımsız
        if (member.diaCari?.dueItems) {
            return res.json({ success: true, data: { items: member.diaCari.dueItems, today }, synced: true });
        }
        // Fallback: canlı DIA (senkron henüz oluşmamışsa), 1 saat cache
        const key = String(member.diaCustomerKey);
        const cached = dueDatesCache.get(key);
        if (cached && Date.now() - cached.at < 60 * 60 * 1000) {
            return res.json({ success: true, data: cached.data, cached: true });
        }
        // Gerçek açık borç = cari bakiyesi (senkron); FIFO dağıtımı için servise geçilir.
        const openBalanceTL = typeof member.diaCari?.bakiyeKurus === 'number'
            ? member.diaCari.bakiyeKurus / 100
            : undefined;
        const { invoiceDueDates } = require('../../../services/plugins/dia/b2bInvoiceReport');
        const data = await invoiceDueDates(req.site, member.diaCustomerKey, openBalanceTL);
        dueDatesCache.set(key, { at: Date.now(), data });
        res.set('Cache-Control', 'no-store');
        return res.json({ success: true, data });
    } catch (error) {
        console.error('[b2b-auth] Vade takvimi hatası:', error.message);
        return res.status(502).json({ success: false, message: 'Vade takvimi şu an alınamadı.' });
    }
});

// Bayi vade durumu (fatura bazlı yaşlandırma) — kısa süreli cache
const agingCache = new Map();

/**
 * GET /vade-durumu — giriş yapan bayinin açık (kalanı olan) satış faturaları:
 * fatura/vade tarihi, fatura no, gün sayısı (istemci hesaplar), toplam/ödenen/kalan tutar.
 */
router.get('/vade-durumu', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('diaCustomerKey diaCari').lean();
        if (!member?.diaCustomerKey) {
            return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });
        }
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        // Önce DB (finans senkronu) — anında, DIA-bağımsız
        if (member.diaCari?.agingItems) {
            return res.json({ success: true, data: { items: member.diaCari.agingItems, today }, synced: true });
        }
        // Fallback: canlı DIA (senkron henüz oluşmamışsa), 1 saat cache
        const key = String(member.diaCustomerKey);
        const cached = agingCache.get(key);
        if (cached && Date.now() - cached.at < 60 * 60 * 1000) {
            return res.json({ success: true, data: { items: cached.items, today } });
        }
        const openBalanceTL = typeof member.diaCari?.bakiyeKurus === 'number'
            ? member.diaCari.bakiyeKurus / 100
            : undefined;
        const { invoiceAging } = require('../../../services/plugins/dia/b2bInvoiceReport');
        const aging = await invoiceAging(req.site, member.diaCustomerKey, openBalanceTL);
        agingCache.set(key, { at: Date.now(), items: aging.items });
        res.set('Cache-Control', 'no-store');
        return res.json({ success: true, data: { items: aging.items, today } });
    } catch (error) {
        console.error('[b2b-auth] Vade durumu hatası:', error.message);
        return res.status(502).json({ success: false, message: 'Vade durumu şu an alınamadı.' });
    }
});

// Cari ekstre (hesap hareketleri) — cari başına canlı DIA, 15 dk cache
const ekstreCache = new Map();

/** Giriş yapan bayinin ekstresini (movements + özet) döner. Önce gecelik senkron
 *  (B2bCariEkstre), yoksa canlı DIA (15 dk cache). */
async function getEkstre(req) {
    const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
        .select('diaCustomerKey diaCari.bakiyeKurus').lean();
    if (!member?.diaCustomerKey) return { notFound: true };

    // Önce DB (gecelik senkron) — anında, DIA-bağımsız
    const B2bCariEkstre = require('../../../models/web/user/B2bCariEkstre');
    const stored = await B2bCariEkstre.findOne({ memberId: req.user._id, site: req.site })
        .select('movements summary syncedAt').lean();
    if (stored?.movements) {
        return { data: { movements: stored.movements, summary: stored.summary, generatedAt: stored.syncedAt || null }, synced: true };
    }

    // Fallback: canlı DIA (senkron henüz oluşmamışsa), 15 dk cache
    const key = String(member.diaCustomerKey);
    const cached = ekstreCache.get(key);
    if (cached && Date.now() - cached.at < 15 * 60 * 1000) return { data: cached.data };
    const balanceTL = typeof member.diaCari?.bakiyeKurus === 'number' ? member.diaCari.bakiyeKurus / 100 : undefined;
    const { cariEkstre } = require('../../../services/plugins/dia/b2bCariEkstre');
    const data = await cariEkstre(req.site, member.diaCustomerKey, balanceTL);
    data.generatedAt = new Date();
    ekstreCache.set(key, { at: Date.now(), data });
    return { data };
}

/**
 * GET /cari-ekstre — cari hesap hareketleri (borç/alacak + yürüyen bakiye).
 */
router.get('/cari-ekstre', authMiddleware, async (req, res) => {
    try {
        const r = await getEkstre(req);
        if (r.notFound) return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });
        res.set('Cache-Control', 'no-store');
        return res.json({ success: true, data: r.data, synced: r.synced || false });
    } catch (error) {
        console.error('[b2b-auth] Cari ekstre hatası:', error.message);
        return res.status(502).json({ success: false, message: 'Cari ekstre şu an alınamadı.' });
    }
});

/**
 * GET /cari-ekstre/excel?yil=&q=&sort=&dir= — ekranda görülen ekstreyi renkli,
 * biçimlendirilmiş Excel (.xlsx) olarak indirir (aynı süzgeç ve sıralama).
 */
router.get('/cari-ekstre/excel', authMiddleware, async (req, res) => {
    try {
        const r = await getEkstre(req);
        if (r.notFound) return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('firstName lastName diaCustomerCode').lean();
        let company = {};
        try {
            const WebSettings = require('../../../models/web/settings/WebSettings');
            company = (await WebSettings.getSettings(req.site))?.companyInfo || {};
        } catch (_) { /* firma bilgisi olmasa da dosya oluşur */ }

        const yil = /^\d{4}$/.test(String(req.query.yil || '')) ? String(req.query.yil) : '';
        const { buildEkstreExcel } = require('../../../services/web/b2b/ekstreExcel');
        const buffer = await buildEkstreExcel({
            movements: r.data.movements,
            summary: r.data.summary,
            filter: { yil, q: String(req.query.q || ''), sort: String(req.query.sort || ''), dir: String(req.query.dir || '') },
            member: {
                name: `${member?.firstName || ''} ${member?.lastName || ''}`.replace(/ \.$/, '').trim(),
                cariKodu: member?.diaCustomerCode || ''
            },
            company,
            generatedAt: r.data.generatedAt
        });
        res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.set('Content-Disposition', `attachment; filename="cari-ekstre-${yil || 'tumu'}.xlsx"`);
        res.set('Cache-Control', 'no-store');
        return res.send(buffer);
    } catch (error) {
        console.error('[b2b-auth] Cari ekstre Excel hatası:', error.message);
        return res.status(502).json({ success: false, message: 'Excel dosyası şu an oluşturulamadı.' });
    }
});

/**
 * GET /odemeler — ekstredeki tahsilat/ödeme (saf alacak) hareketleri.
 */
router.get('/odemeler', authMiddleware, async (req, res) => {
    try {
        const r = await getEkstre(req);
        if (r.notFound) return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });
        const payments = (r.data.movements || []).filter((m) => m.alacak > 0);
        const totalKurus = Math.round(payments.reduce((s, m) => s + m.alacak, 0) * 100);
        res.set('Cache-Control', 'no-store');
        return res.json({ success: true, data: { payments, totalKurus, count: payments.length }, synced: r.synced || false });
    } catch (error) {
        console.error('[b2b-auth] Ödemeler hatası:', error.message);
        return res.status(502).json({ success: false, message: 'Ödemeler şu an alınamadı.' });
    }
});

/**
 * GET /makbuz/:orderNumber — ödeme makbuzunu PDF olarak indirir (bayiye ait).
 */
router.get('/makbuz/:orderNumber', authMiddleware, async (req, res) => {
    try {
        const WebOrder = require('../../../models/web/order/WebOrder');
        const order = await WebOrder.findOne({
            orderNumber: String(req.params.orderNumber || '').trim(),
            site: req.site,
            memberId: req.user._id
        }).lean();
        if (!order) {
            return res.status(404).json({ success: false, message: 'Sipariş bulunamadı.' });
        }
        let company = {};
        try {
            const WebSettings = require('../../../models/web/settings/WebSettings');
            const settings = await WebSettings.getSettings(req.site);
            company = settings?.companyInfo || {};
        } catch (_) { /* firma bilgisi olmasa da makbuz oluşur */ }

        const { makbuzPdf } = require('../../../services/web/b2b/makbuzPdf');
        const pdf = await makbuzPdf(order, company);
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', `attachment; filename="Makbuz-${order.orderNumber}.pdf"`);
        res.set('Cache-Control', 'no-store');
        return res.send(pdf);
    } catch (error) {
        console.error('[b2b-auth] Makbuz PDF hatası:', error.message);
        res.status(500).json({ success: false, message: 'Makbuz oluşturulamadı.' });
    }
});

/**
 * GET /fatura-pdf?fisno=&belgeNo=&tarih= — ekstredeki faturanın resmi e-Fatura /
 * e-Arşiv PDF'ini indirir. Arama bayinin kendi cari key'i ile süzülür.
 */
router.get('/fatura-pdf', authMiddleware, async (req, res) => {
    const fisno = String(req.query.fisno || '').trim();
    if (!fisno) return res.status(400).json({ success: false, message: 'Fatura numarası eksik.' });
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site }).select('diaCustomerKey').lean();
        if (!member?.diaCustomerKey) return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });

        const { getInvoicePdf } = require('../../../services/plugins/dia/b2bInvoicePdf');
        const r = await getInvoicePdf(req.site, member.diaCustomerKey, {
            fisno,
            belgeNo: String(req.query.belgeNo || '').trim(),
            tarih: String(req.query.tarih || '').trim()
        });
        if (r.notFound) return res.status(404).json({ success: false, message: 'Bu faturanın PDF kopyası sistemde bulunamadı.' });
        if (r.noEbelge) return res.status(404).json({ success: false, message: 'Bu faturanın e-belge (PDF) kopyası bulunmuyor.' });

        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', `attachment; filename="${r.fileName}"`);
        res.set('Cache-Control', 'no-store');
        return res.send(r.pdf);
    } catch (error) {
        console.error('[b2b-auth] Fatura PDF hatası:', error.message);
        return res.status(502).json({ success: false, message: 'Fatura şu an indirilemedi, lütfen biraz sonra tekrar deneyin.' });
    }
});

module.exports = router;
