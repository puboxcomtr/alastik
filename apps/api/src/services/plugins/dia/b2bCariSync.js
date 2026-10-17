/**
 * b2b cari bilgilerini DIA'dan Mongo'ya senkronlar (bakiye, borç/alacak, risk
 * limiti, segment/ozelkod2). Worker'da periyodik çalışır (diaLock içinde).
 *
 * Uçlar (/cari-ozet, /fiyat-orani, /odeme-yontemleri, sipariş segmenti) canlı
 * DIA yerine WebMember.diaCari'den okur — DIA tek-oturum çakışması ve gecikmesi
 * kullanıcıya yansımaz. 2135 bayi tek tek değil, ~100'lük chunk'larla toplu çekilir.
 */
const { DiaOrderService } = require('./DiaOrderService');
const WebMember = require('../../../models/web/user/WebMember');
const { getPremiumRule, resolvePremium } = require('./b2bPremium');

const kurus = v => Math.round((parseFloat(v) || 0) * 100);

/**
 * @param {object} [options]
 * @param {string} [options.memberId] verilirse yalnız o cari senkronlanır (admin "Cariyi Güncelle")
 */
async function syncB2bCari(logger = console, { memberId } = {}) {
    const query = { site: 'b2b', diaCustomerKey: { $exists: true, $ne: null } };
    if (memberId) query._id = memberId;
    const members = await WebMember.find(
        query,
        { diaCustomerKey: 1, diaCustomerCode: 1, phone: 1, 'diaCari.firmaTuru': 1, 'diaCari.salespersonKey': 1, 'diaCari.diaCreatedAt': 1 }
    ).lean();
    if (!members.length) return { total: 0, updated: 0, chunks: 0, bosChunk: 0 };

    const svc = new DiaOrderService('b2b');
    await svc.init().catch(() => {});
    await svc.login();
    const F = { session_id: svc.sessionId, firma_kodu: svc.firmaKodu, donem_kodu: svc.donemKodu };
    // Premium cari kuralı (hangi özel kod / hangi değer) panel ayarından okunur
    const premiumRule = getPremiumRule(svc.settings);

    const CHUNK = 100;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let updated = 0, bosChunk = 0, chunks = 0;
    const matched = new Set();

    // Satış elemanı (plasiyer) master'ı: _key → kullaniciadi. Cari kartı yalnız
    // satış elemanının KODUNU taşır; giriş kullanıcısına eşleme buradan yapılır.
    const satisElemani = {};
    try {
        const r = await svc.sendRequest('/api/v3/scf/json', {
            scf_satiselemani_listele: { ...F, limit: 1000, offset: 0 }
        });
        // kodu/aciklama DIA'da tutarsız: bazen kodu tam ad + aciklama kısaltma ("KADİR KARAER"/"KK"),
        // bazen tersi ("KD"/"KAAN DEMİR"). Ada benzeyeni seç: boşluk içeren > daha uzun.
        const adSec = (...adaylar) => adaylar
            .map(v => String(v || '').trim()).filter(Boolean)
            .sort((a, b) => (Number(/\s/.test(b)) - Number(/\s/.test(a))) || (b.length - a.length))[0] || '';
        for (const s of (Array.isArray(r?.result) ? r.result : [])) {
            satisElemani[String(s._key)] = {
                kullanici: String(s.kullaniciadi || '').trim().toLowerCase(),
                ad: adSec(s.kodu, s.aciklama)
            };
        }
    } catch (e) {
        logger.warn?.('[b2bCariSync] satış elemanı listesi alınamadı: ' + e.message);
    }

    // Ödeme planı _key → vade günü (planın ilk kalemindeki "+30" gibi gün). Plan sayısı az; senkron başına bir kez sorulur.
    const planDays = new Map();
    const termDaysOf = async (planKey) => {
        if (!planKey) return null;
        if (planDays.has(planKey)) return planDays.get(planKey);
        let days = null;
        try {
            const r = await svc.sendRequest('/api/v3/scf/json', { scf_odeme_plani_getir: { ...F, key: planKey } });
            const gun = parseInt(String(r?.result?.m_kalemler?.[0]?.gun || '').replace(/[^\d-]/g, ''));
            days = Number.isFinite(gun) ? gun : null;
        } catch (e) {
            logger.warn?.('[b2bCariSync] ödeme planı okunamadı: ' + e.message);
        }
        planDays.set(planKey, days);
        return days;
    };

    // DIA tarih metni ("2025-12-11 14:44:11", İstanbul saati) → Date
    const diaTarih = (v) => {
        const s = String(v || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
        const d = new Date(s.replace(' ', 'T') + (s.length > 10 ? '' : 'T00:00:00') + '+03:00');
        return isNaN(d.getTime()) ? null : d;
    };

    // Bir kart satırını ilgili üyeye yazar
    const writeRow = (ops, m, row) => {
        // DIA `bakiye` İŞARETSİZDİR (alacaklı cari de pozitif gelir) ve `borc`/`alacak` hep 0 döner.
        // İşaretli bakiye `orjbakiye` (alacaklı → negatif); toplamlar `borctoplam`/`alacaktoplam`.
        const borc = kurus(row.borctoplam), alacak = kurus(row.alacaktoplam);
        const bakiye = String(row.orjbakiye ?? '').trim() !== '' ? kurus(row.orjbakiye) : (borc - alacak);
        const spKey = String(row._key_scf_satiselemani || '').trim();
        const set = {
            'diaCari.bakiyeKurus': bakiye,
            'diaCari.borcKurus': borc,
            'diaCari.alacakKurus': alacak,
            'diaCari.riskLimitiKurus': kurus(row.risklimiti),
            'diaCari.segment': String(row.ozelkod2kod || '').trim(),
            'diaCari.paymentPlanName': String(row.odemeplani || '').trim(),
            'diaCari.paymentPlanKey': parseInt(row._key_scf_odeme_plani) || 0,
            'diaCari.paymentTermDays': row.__termDays ?? null,
            'diaCari.syncedAt': new Date()
        };
        // Premium: DIA kaynaklıdır, her senkronda yeniden belirlenir (DIA'da kaldırılırsa Normal'e döner)
        if (premiumRule) {
            const tier = resolvePremium(row, premiumRule);
            set['diaCari.premium'] = tier.premium;
            set['diaCari.premiumCode'] = tier.code;
        }
        // ── Profil verileri DIA'dan YALNIZ İLK KEZ alınır, sonra DB'de tutulur ──
        // (finansal alanlar + segment + DIA son güncellenme her senkronda güncellenir)
        // Plasiyer: kayıtlı değilse
        if (!m.diaCari?.salespersonKey && spKey && spKey !== '0') {
            set['diaCari.salespersonKey'] = spKey;
            // Tam ad master'dan; master'da yoksa cari kartındaki metin
            set['diaCari.salespersonName'] = satisElemani[spKey]?.ad || String(row.satiselemani || '').trim();
            set['diaCari.salespersonUsername'] = satisElemani[spKey]?.kullanici || '';
        }
        // Telefon: kayıtlı değilse (boş / "-"); cep öncelikli, yoksa sabit
        const tel = String(row.ceptel || '').trim() || String(row.telefon1 || '').trim();
        if (tel && (!m.phone || m.phone === '-')) set.phone = tel;
        // Fatura bilgileri DIA'dan YALNIZ İLK KEZ alınır, sonra bizim DB'de tutulur:
        // carinin kaydında firma türü varsa bu dört alana dokunulmaz.
        if (!m.diaCari?.firmaTuru) {
            const kayitTuru = String(row.carikayitturu || '').trim().toUpperCase();
            // Şahıs (SHS) → bireysel; diğer her şey → kurumsal
            set['diaCari.firmaTuru'] = kayitTuru === 'SHS' ? 'bireysel' : 'kurumsal';
            set['diaCari.vergiNo'] = String(row.verginumarasi || '').trim();
            set['diaCari.vergiDairesi'] = String(row.vergidairesi || '').trim();
            set['diaCari.tcKimlikNo'] = String(row.tckimlikno || '').trim();
        }
        const cdate = diaTarih(row._cdate);
        if (cdate && !m.diaCari?.diaCreatedAt) set['diaCari.diaCreatedAt'] = cdate;
        const udate = diaTarih(row._date);
        if (udate) set['diaCari.diaUpdatedAt'] = udate;
        matched.add(String(m._id));
        ops.push({ updateOne: { filter: { _id: m._id }, update: { $set: set } } });
    };

    const cols = ['_key', 'carikartkodu', 'orjbakiye', 'borctoplam', 'alacaktoplam', 'risklimiti', 'ozelkod2kod',
        '_cdate', '_date', 'satiselemani', '_key_scf_satiselemani', 'ceptel', 'telefon1', 'odemeplani', '_key_scf_odeme_plani',
        'carikayitturu', 'verginumarasi', 'vergidairesi', 'tckimlikno'];
    if (premiumRule) cols.push(premiumRule.codeColumn, premiumRule.textColumn);

    // Bir chunk'ı verilen alan (field: '_key' veya 'carikartkodu') ile çeker ve yazar
    async function processBatch(batch, field, valueOf) {
        const vals = batch.map(valueOf).filter(Boolean);
        if (!vals.length) return;
        chunks++;
        let rows = [];
        try {
            const r = await svc.sendRequest('/api/v3/scf/json', {
                scf_carikart_listele: {
                    ...F,
                    filters: [{ field, operator: 'IN', value: vals.join(',') }],
                    sorts: '',
                    params: { selectedcolumns: cols },
                    limit: vals.length, offset: 0
                }
            });
            rows = Array.isArray(r?.result) ? r.result : [];
        } catch (e) {
            try { svc.sessionId = null; await svc.login(); F.session_id = svc.sessionId; } catch (_) {}
        }
        if (!rows.length) { bosChunk++; await sleep(500); return; } // boş — eski veriyi koru
        const byVal = {};
        for (const row of rows) byVal[String(field === '_key' ? row._key : row.carikartkodu)] = row;
        // Ödeme planlarının vade günleri (yalnız ilk görülen planlar DIA'dan okunur)
        for (const row of rows) row.__termDays = await termDaysOf(parseInt(row._key_scf_odeme_plani) || 0);
        const ops = [];
        for (const m of batch) {
            const row = byVal[String(valueOf(m))];
            if (row) writeRow(ops, m, row);
        }
        if (ops.length) {
            try { const res = await WebMember.bulkWrite(ops, { ordered: false }); updated += res.modifiedCount; }
            catch (e) { logger.warn?.('[b2bCariSync] bulkWrite hatası: ' + e.message); }
        }
        await sleep(250);
    }

    // 1) _key IN ile toplu (hızlı, çoğu cari)
    for (let i = 0; i < members.length; i += CHUNK) {
        await processBatch(members.slice(i, i + CHUNK), '_key', m => String(m.diaCustomerKey || ''));
    }

    // 2) _key ile eşleşmeyenleri carikartkodu ile dene (bazı carilerin _key'i listede dönmüyor)
    const kalanlar = members.filter(m => !matched.has(String(m._id)) && m.diaCustomerCode);
    for (let i = 0; i < kalanlar.length; i += CHUNK) {
        await processBatch(kalanlar.slice(i, i + CHUNK), 'carikartkodu', m => String(m.diaCustomerCode || ''));
    }

    return { total: members.length, updated, chunks, bosChunk, eslesen: matched.size };
}

module.exports = { syncB2bCari };
