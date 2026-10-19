const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const Setting = require('../../models/admin/settings/Setting');
const WebCategory = require('../../models/web/catalog/WebCategory');
const WebProduct = require('../../models/web/catalog/WebProduct');
const paths = require('../../config/path');

const PUBLIC_ROOT = paths.getStaticPath('');
const CACHE_ROOT = path.join(PUBLIC_ROOT, 'filigran');
const AYAR_TTL_MS = 60 * 1000;

const KONUMLAR = {
    'sol-ust': 'northwest',
    'sag-ust': 'northeast',
    'sol-alt': 'southwest',
    'sag-alt': 'southeast',
    'orta': 'center'
};

const VARSAYILAN_GENISLIK_YUZDE = 25;
const VARSAYILAN_OPAKLIK_YUZDE = 30;
const VARSAYILAN_ACI = 0;

const ACILAR = [0, 45, -45, 90, -90];

function sayiAyari(deger, enAz, enCok, varsayilan) {
    const sayi = Number(deger);

    if (!Number.isFinite(sayi)) return varsayilan;

    return Math.min(enCok, Math.max(enAz, sayi));
}

function kategoriListesi(deger) {
    let ham = deger;

    if (typeof ham === 'string') {
        try { ham = JSON.parse(ham); } catch { ham = ham.split(','); }
    }

    if (!Array.isArray(ham)) return [];

    return [...new Set(ham.map(k => String(k || '').trim()).filter(Boolean))];
}

const AYAR_ANAHTARLARI = [
    'watermark',
    'watermarkPosition',
    'watermarkImage',
    'watermarkWidth',
    'watermarkRotation',
    'watermarkOpacity',
    'watermarkExcludedCategories'
];

const HARIC_TTL_MS = 5 * 60 * 1000;

const ayarOnbellek = new Map();
const haricOnbellek = new Map();

async function getAyarlar(site) {
    const kayit = ayarOnbellek.get(site);

    if (kayit && Date.now() - kayit.zaman < AYAR_TTL_MS) return kayit.ayar;

    const kayitlar = await Setting.find({
        site,
        key: { $in: AYAR_ANAHTARLARI }
    }).lean().catch(() => []);

    const harita = {};

    kayitlar.forEach(k => { harita[k.key] = k.value; });

    const aci = Number(harita.watermarkRotation);

    const ayar = {
        aktif: harita.watermark === true || harita.watermark === 'true',
        konum: KONUMLAR[harita.watermarkPosition] || 'northwest',
        gorsel: String(harita.watermarkImage || '').trim(),
        genislikYuzde: sayiAyari(harita.watermarkWidth, 5, 100, VARSAYILAN_GENISLIK_YUZDE),
        opaklikYuzde: sayiAyari(harita.watermarkOpacity, 0, 100, VARSAYILAN_OPAKLIK_YUZDE),
        aci: ACILAR.includes(aci) ? aci : VARSAYILAN_ACI,
        haricKategoriler: kategoriListesi(harita.watermarkExcludedCategories)
    };

    ayarOnbellek.set(site, { zaman: Date.now(), ayar });

    return ayar;
}

function ayarOnbelleginiTemizle() {
    ayarOnbellek.clear();
    haricOnbellek.clear();
}

function yolAnahtari(gorselUrl) {
    let yol = String(gorselUrl || '');

    if (/^https?:\/\//i.test(yol)) {
        try { yol = new URL(yol).pathname; } catch { return ''; }
    }

    return yol.split('?')[0].replace(/^\/+/, '').toLowerCase();
}

async function haricKategoriAgaci(kategoriIdler) {
    if (!kategoriIdler.length) return [];

    const secilenler = await WebCategory.find({ _id: { $in: kategoriIdler } })
        .select('diaCategory diaLevel')
        .lean()
        .catch(() => []);

    const altlar = await WebCategory.find({ parentPath: { $in: kategoriIdler } })
        .select('diaCategory diaLevel')
        .lean()
        .catch(() => []);

    return [...secilenler, ...altlar].filter(k => k.diaCategory);
}

async function haricGorseller(site) {
    const kayit = haricOnbellek.get(site);

    if (kayit && Date.now() - kayit.zaman < HARIC_TTL_MS) return kayit.kume;

    const ayar = await getAyarlar(site);
    const kume = new Set();

    if (!ayar.haricKategoriler.length) {
        haricOnbellek.set(site, { zaman: Date.now(), kume });

        return kume;
    }

    const kategoriler = await haricKategoriAgaci(ayar.haricKategoriler);

    if (kategoriler.length) {
        const kosullar = kategoriler.map(k => ({
            'diaData.m_kategoriler': {
                $elemMatch: { [k.diaLevel || 'kategori_aciklama_2']: k.diaCategory }
            }
        }));

        const urunler = await WebProduct.find({ $or: kosullar })
            .select('diaData.m_resimler.aws_url customData.customImages.url customData.featuredImage')
            .lean()
            .catch(() => []);

        urunler.forEach(urun => {
            (urun.diaData?.m_resimler || []).forEach(r => {
                const anahtar = yolAnahtari(r?.aws_url);

                if (anahtar) kume.add(anahtar);
            });

            (urun.customData?.customImages || []).forEach(r => {
                const anahtar = yolAnahtari(r?.url);

                if (anahtar) kume.add(anahtar);
            });

            const kapak = yolAnahtari(urun.customData?.featuredImage);

            if (kapak) kume.add(kapak);
        });
    }

    haricOnbellek.set(site, { zaman: Date.now(), kume });

    return kume;
}

function filigranDosyaYolu(gorselUrl) {
    if (!gorselUrl) return null;

    let yol = gorselUrl;

    if (/^https?:\/\//i.test(yol)) {
        try { yol = new URL(yol).pathname; } catch { return null; }
    }

    const temiz = yol.replace(/^\/+/, '');

    const adaylar = [
        path.join(PUBLIC_ROOT, temiz),
        path.join(PUBLIC_ROOT, temiz.replace(/^uploads\//, ''))
    ];

    return adaylar.find(p => fs.existsSync(p)) || null;
}

async function filigranliDosya(site, istekYolu) {
    const ayar = await getAyarlar(site);

    if (!ayar.aktif || !ayar.gorsel) return null;

    const filigranYolu = filigranDosyaYolu(ayar.gorsel);

    if (!filigranYolu) return null;

    const guvenliYol = path.normalize(istekYolu).replace(/^(\.\.[/\\])+/, '').replace(/^\/+/, '');

    const haric = await haricGorseller(site);

    if (haric.has(guvenliYol.toLowerCase())) return null;

    const kaynak = path.join(PUBLIC_ROOT, guvenliYol);

    if (!kaynak.startsWith(PUBLIC_ROOT) || !fs.existsSync(kaynak)) return null;

    const hedef = path.join(CACHE_ROOT, site, guvenliYol);

    if (fs.existsSync(hedef)) {
        const kaynakZaman = fs.statSync(kaynak).mtimeMs;
        const hedefZaman = fs.statSync(hedef).mtimeMs;
        const filigranZaman = fs.statSync(filigranYolu).mtimeMs;

        if (hedefZaman >= kaynakZaman && hedefZaman >= filigranZaman) return hedef;
    }

    fs.mkdirSync(path.dirname(hedef), { recursive: true });

    const meta = await sharp(kaynak).metadata();
    const gorselGenislik = meta.width || 600;
    const gorselYukseklik = meta.height || 600;

    const logoMeta = await sharp(filigranYolu).metadata();
    const logoOrani = (logoMeta.height || 1) / (logoMeta.width || 1);

    const radyan = Math.abs(ayar.aci) * Math.PI / 180;
    const kosinus = Math.abs(Math.cos(radyan));
    const sinus = Math.abs(Math.sin(radyan));

    const hedefKutuGenislik = gorselGenislik * (ayar.genislikYuzde / 100);
    const genislikIcin = hedefKutuGenislik / (kosinus + logoOrani * sinus);

    const yukseklikIcin = gorselYukseklik / (sinus + logoOrani * kosinus);

    const filigranGenislik = Math.max(20, Math.round(Math.min(genislikIcin, yukseklikIcin)));

    let filigranIslem = sharp(filigranYolu)
        .resize({ width: filigranGenislik })
        .ensureAlpha();

    if (ayar.aci !== 0) {
        filigranIslem = filigranIslem.rotate(ayar.aci, { background: { r: 0, g: 0, b: 0, alpha: 0 } });
    }

    const filigran = await filigranIslem
        .composite([{
            input: Buffer.from([255, 255, 255, Math.round(255 * (ayar.opaklikYuzde / 100))]),
            raw: { width: 1, height: 1, channels: 4 },
            tile: true,
            blend: 'dest-in'
        }])
        .png()
        .toBuffer();

    await sharp(kaynak)
        .composite([{ input: filigran, gravity: ayar.konum }])
        .toFile(hedef);

    return hedef;
}

function onbellegiSil(site) {
    ayarOnbelleginiTemizle();

    const klasor = site ? path.join(CACHE_ROOT, site) : CACHE_ROOT;

    if (fs.existsSync(klasor)) fs.rmSync(klasor, { recursive: true, force: true });
}

module.exports = {
    AYAR_ANAHTARLARI,
    getAyarlar,
    haricGorseller,
    filigranliDosya,
    onbellegiSil,
    ayarOnbelleginiTemizle,
    CACHE_ROOT,
    KONUMLAR
};
