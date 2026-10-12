// Montaj Noktası (Bayi) Bilgi ve Fiyat Formu — alan ve seçenek tanımları (TEK KAYNAK).
// Form sayfası bu tanımı API'den okur (/api/bayi-formu/tanim), sunucu doğrulaması ve admin Excel çıktısı
// aynı tanımı kullanır. Bir aralığı değiştirmek için yalnızca bu dosya düzenlenir.
const aralik = (bas, son, adim) => { const o = []; for (let v = bas; v <= son; v += adim) o.push(v); return o; };

const SITE = 'lastikjantavm';                 // form yalnızca bu sitede açılır
const KAPALI = 'Kapalı';
const VERMIYORUM = 'vermiyorum';              // fiyat satırında "Bu hizmeti vermiyorum"
const VERMIYORUM_ETIKET = 'Bu hizmeti vermiyorum';
const EVET_HAYIR = ['Evet', 'Hayır'];
const SAATLER = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}.00`);

const SAAT_ALANLARI = [
    { key: 'haftaIciAcilis', etiket: 'Hafta İçi Açılış', kapaliOlabilir: false },
    { key: 'haftaIciKapanis', etiket: 'Hafta İçi Kapanış', kapaliOlabilir: false },
    { key: 'cumartesiAcilis', etiket: 'Cumartesi Açılış', kapaliOlabilir: true, es: 'cumartesiKapanis' },
    { key: 'cumartesiKapanis', etiket: 'Cumartesi Kapanış', kapaliOlabilir: true, es: 'cumartesiAcilis' },
    { key: 'pazarAcilis', etiket: 'Pazar Açılış', kapaliOlabilir: true, es: 'pazarKapanis' },
    { key: 'pazarKapanis', etiket: 'Pazar Kapanış', kapaliOlabilir: true, es: 'pazarAcilis' }
];

// Hizmet fiyatları — KDV dahil TL. Her satırda ayrıca "Bu hizmeti vermiyorum" seçeneği vardır.
const FIYAT_GRUPLARI = [
    { ad: 'Sibop Fiyatları ve Hizmetler', satirlar: [
        { kod: 'SBP-1', ad: 'Normal Sibop (montaj hariç fiyat)', birim: 'Adet', secenekler: aralik(50, 250, 25) },
        { kod: 'SBP-3', ad: 'Çelik Sibop (montaj hariç fiyat)', birim: 'Adet', secenekler: aralik(100, 500, 25) }
    ] },
    { ad: 'Rot ve Balans Hizmetleri', satirlar: [
        { kod: '600.94', ad: '13 ve 16 İnç Arası Rot Ayarı', birim: 'Araç başı', secenekler: aralik(500, 2500, 50) },
        { kod: '600.95', ad: '17 ve 18 İnç Arası Rot Ayarı', birim: 'Araç başı', secenekler: aralik(500, 2500, 50) },
        { kod: '600.96', ad: '19 İnç ve Üzeri Rot Ayarı', birim: 'Araç başı', secenekler: aralik(500, 2500, 50) }
    ] },
    { ad: 'Lastik Oteli (Depolama) Hizmetleri', satirlar: [
        { kod: '600103', ad: '13 ve 16 İnç Arası Sezonluk Lastik Depolama (maksimum 6 ay)', birim: 'Adet', secenekler: aralik(100, 500, 50) },
        { kod: '600104', ad: '17 ve 18 İnç Arası Sezonluk Lastik Depolama (maksimum 6 ay)', birim: 'Adet', secenekler: aralik(100, 500, 50) },
        { kod: '600105', ad: '19 İnç ve Üzeri Sezonluk Lastik Depolama (maksimum 6 ay)', birim: 'Adet', secenekler: aralik(100, 500, 50) }
    ] },
    { ad: 'Yazlık Kışlık Lastik Değişim Hizmetleri', satirlar: [
        { kod: '600109', ad: '13 ve 16 İnç Arası Lastik Sök Tak + Balans Ayarı', birim: 'Adet', secenekler: aralik(100, 1000, 50) },
        { kod: '600110', ad: '17 ve 18 İnç Arası Lastik Sök Tak + Balans Ayarı', birim: 'Adet', secenekler: aralik(100, 1000, 50) },
        { kod: '600111', ad: '19 İnç ve Üzeri Lastik Sök Tak + Balans Ayarı', birim: 'Adet', secenekler: aralik(100, 1000, 50) }
    ] },
    { ad: 'Mobil Yerinde Değişim', satirlar: [
        { kod: '600112', ad: 'Mobil 13 ve 16 İnç Arası Yazlık Kışlık Değişim + Balans Ayarı (maksimum 5 km’ye kadar)', birim: '1 adet lastik için', secenekler: aralik(500, 2500, 50) },
        { kod: '600113', ad: 'Mobil 17 ve 18 İnç Arası Yazlık Kışlık Değişim + Balans Ayarı (maksimum 5 km’ye kadar)', birim: '1 adet lastik için', secenekler: aralik(500, 2500, 50) },
        { kod: '600114', ad: 'Mobil 19 İnç ve Üzeri Yazlık Kışlık Değişim + Balans Ayarı (maksimum 5 km’ye kadar)', birim: '1 adet lastik için', secenekler: aralik(500, 2500, 50) }
    ] },
    { ad: 'Jant Pres Hizmetleri', satirlar: [
        { kod: '600.26', ad: 'Demir Jant Pres 13–16 İnç', birim: 'Adet', secenekler: aralik(100, 750, 50) },
        { kod: '600.27', ad: 'Çelik Jant Pres 13–16 İnç', birim: 'Adet', secenekler: aralik(200, 1000, 50) },
        { kod: '600.29', ad: 'Çelik Jant Pres 17–18 İnç', birim: 'Adet', secenekler: aralik(300, 2000, 50) },
        { kod: '600.30', ad: 'Çelik Jant Pres 19 İnç ve Üstü', birim: 'Adet', secenekler: aralik(400, 2500, 50) }
    ] },
    { ad: 'Diğer Hizmetler', satirlar: [
        { kod: '600200', ad: 'Oto, 4x4, Premium Araçlar İçin Nitrojen Hava', birim: 'Her 1 adet lastik için', secenekler: aralik(50, 250, 25) },
        { kod: '600.23', ad: 'Far Ayarı', birim: 'Araç başı', secenekler: aralik(100, 1500, 50) }
    ] }
];
const FIYAT_SATIRLARI = FIYAT_GRUPLARI.flatMap(g => g.satirlar);
// Aktarım ve saklama anahtarı: koddaki nokta alt çizgiye çevrilir ("600.94" → "600_94"). API gelen istekte
// noktalı anahtarları güvenlik gereği sildiği için (mongo-sanitize) cevaplar bu anahtarla taşınır; ekranda ve
// Excel'de her zaman asıl kod gösterilir.
for (const r of FIYAT_SATIRLARI) r.anahtar = r.kod.replace(/\./g, '_');

const TESIS_EVET_HAYIR = [
    { key: 'beklemeSalonu', soru: 'Bekleme salonu var mı?', kisa: 'Bekleme salonu' },
    { key: 'wifi', soru: 'Wifi internet hizmeti var mı?', kisa: 'Wifi' },
    { key: 'klima', soru: 'Klima var mı?', kisa: 'Klima' },
    { key: 'ikram', soru: 'İkram veriliyor mu? (çay, kahve vb.)', kisa: 'İkram (çay/kahve)' },
    { key: 'wc', soru: 'Kadın/Erkek WC var mı?', kisa: 'Kadın/Erkek WC' },
    { key: 'ikinciEl', soru: 'İkinci el satışınız var mı?', kisa: 'İkinci el satışı' }
];
const CALISAN_SAYISI = aralik(1, 150, 1);
const METREKARE = [...aralik(15, 100, 5), ...aralik(150, 1500, 50)];
const LASTIK_OTELI_YOK = 'yok';                 // "Lastik otelim yok"
const LASTIK_OTELI_YOK_ETIKET = 'Lastik otelim yok';
const LASTIK_OTELI_KAPASITE = aralik(50, 1500, 50);

const MARKA_YOK = 'Herhangi bir marka bayiliğim yok';
const MARKA_HEPSI = 'Hepsi';
const MARKA_DIGER = 'Diğer';
const MARKALAR = ['Accelera', 'Achilles', 'Anlas', 'Aplus', 'Apollo', 'Arivo', 'Atlas', 'Austone', 'Barum', 'BFGoodrich', 'Bridgestone', 'Continental', 'Cooper', 'Dayton', 'Debica', 'Delinte', 'Diplomat', 'Doublestar', 'Dunlop', 'Falken', 'Firestone', 'Fulda', 'General Tire', 'Gislaved', 'Giti', 'Goodride', 'Goodyear', 'GT Radial', 'Hankook', 'Hifly', 'Imperial', 'Kelly', 'Kenda', 'Kleber', 'Kormoran', 'Kumho', 'Landsail', 'Lassa', 'Laufenn', 'Leao', 'Linglong', 'Marshal', 'Matador', 'Maxxis', 'Michelin', 'Milestone', 'Minerva', 'Mirage', 'Nankang', 'Nexen', 'Nokian', 'Orium', 'Otani', 'Petlas', 'Pirelli', 'Powertrac', 'Riken', 'Roadstone', 'RoadX', 'Rotalla', 'Sailun', 'Sava', 'Semperit', 'Starmaxx', 'Strial', 'Sumitomo', 'Sunny', 'Taurus', 'Tigar', 'Toyo', 'Tracmax', 'Triangle', 'Uniroyal', 'Viking', 'Vredestein', 'Waterfall', 'Westlake', 'Windforce', 'Yokohama', 'Zeetex']
    .sort((a, b) => a.localeCompare(b, 'tr'));

// Görseller ve ek hizmetler (12 Ekim 2026) — HEPSİ İSTEĞE BAĞLI. Başlık başına en çok GORSEL_ADET dosya.
// Fotoğraf: JPG/PNG/WebP; yalnız vergi levhasında PDF de kabul edilir. Dosyalar sitede yayınlanmaz, yalnız admin panelinden açılır.
const GORSEL_ADET = 4;
const GORSEL_BOYUT_MB = 10;
const GORSEL_ALANLARI = [
    { key: 'disCephe', etiket: 'Dış Cephe Görseli', kisa: 'Dış cephe' },
    { key: 'servisIci', etiket: 'Servis İçi Görseli', kisa: 'Servis içi' },
    { key: 'satisBekleme', etiket: 'Lastik - Jant Satışının Yapıldığı Kısım veya Bekleme Salonunun Görseli', kisa: 'Satış alanı / bekleme salonu' },
    { key: 'lastikOteli', etiket: 'Varsa Lastik Oteli Görseli', kisa: 'Lastik oteli' },
    { key: 'rotLift', etiket: 'Varsa Rot Ayarı Yapılan Lift Görseli', kisa: 'Rot ayarı lifti' },
    { key: 'vergiLevhasi', etiket: 'Vergi Levhası Görseli', kisa: 'Vergi levhası', pdf: true }
];
const DOSYA_KIMLIK = /^[a-f0-9]{32}\.(jpg|png|webp|pdf)$/;   // sunucunun yükleme sırasında verdiği dosya adı
// Dosyalar web'den erişilen "public" klasörünün ve kod deposunun DIŞINDA tutulur (canlı ve dev aynı dizini kullanır)
const GORSEL_DIZIN = process.env.BAYI_FORMU_DIZIN || '/var/www/alastik-ozel/bayi-formu';
const EK_HIZMET_SORU = 'Varsa ek hizmetleriniz nelerdir?';
const EK_HIZMET_UZUNLUK = 1000;

// Telefon: 0 ile başlayan 11 hane (cep 05xx ya da sabit 0[2-4]xx). Dönüş: "0511 111 11 11" ya da null
function telefonBicimle(deger) {
    const d = String(deger || '').replace(/\D/g, '');
    if (!/^0[2-5]\d{9}$/.test(d)) return null;
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
}

// Form sayfasına verilen tanım
function tanim() {
    return {
        saatler: SAATLER, kapali: KAPALI, saatAlanlari: SAAT_ALANLARI,
        vermiyorum: VERMIYORUM, vermiyorumEtiket: VERMIYORUM_ETIKET, fiyatGruplari: FIYAT_GRUPLARI,
        evetHayir: EVET_HAYIR, tesisEvetHayir: TESIS_EVET_HAYIR,
        calisanSayisi: CALISAN_SAYISI, metrekare: METREKARE,
        lastikOteliYok: LASTIK_OTELI_YOK, lastikOteliYokEtiket: LASTIK_OTELI_YOK_ETIKET, lastikOteliKapasite: LASTIK_OTELI_KAPASITE,
        markalar: MARKALAR, markaYok: MARKA_YOK, markaHepsi: MARKA_HEPSI, markaDiger: MARKA_DIGER,
        gorselAlanlari: GORSEL_ALANLARI, gorselAdet: GORSEL_ADET, gorselBoyutMb: GORSEL_BOYUT_MB,
        ekHizmetSoru: EK_HIZMET_SORU, ekHizmetUzunluk: EK_HIZMET_UZUNLUK
    };
}

/**
 * Gönderilen cevapları doğrular. Listede olmayan hiçbir değer kabul edilmez.
 * il/ilçe doğrulaması çağıran tarafından yapılır (veritabanı gerekir) ve sonuç ilSonucu ile verilir.
 * Dönüş: { hatalar: { alan: mesaj }, temiz: {...} }
 */
function dogrula(b, ilSonucu) {
    const hatalar = {}; const temiz = { saatler: {}, fiyatlar: {}, tesis: {} };
    const metin = (v, max) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
    const g = b || {};

    temiz.bayiAdi = metin(g.bayiAdi, 150); if (temiz.bayiAdi.length < 2) hatalar.bayiAdi = 'Bayi adını yazın';
    if (!ilSonucu?.il) hatalar.cityId = 'İl seçin'; else { temiz.cityId = ilSonucu.il.cityId; temiz.cityName = ilSonucu.il.cityName; }
    if (!ilSonucu?.ilce) hatalar.districtId = 'İlçe seçin'; else { temiz.districtId = ilSonucu.ilce.districtId; temiz.districtName = ilSonucu.ilce.districtName; }
    temiz.adres = metin(g.adres, 500); if (temiz.adres.length < 10) hatalar.adres = 'Açık adresi yazın';
    temiz.telefon1 = telefonBicimle(g.telefon1); if (!temiz.telefon1) hatalar.telefon1 = 'Telefonu 0511 111 11 11 biçiminde yazın';
    if (String(g.telefon2 || '').trim()) { temiz.telefon2 = telefonBicimle(g.telefon2); if (!temiz.telefon2) hatalar.telefon2 = 'İkinci telefonu 0511 111 11 11 biçiminde yazın ya da boş bırakın'; }
    else temiz.telefon2 = '';

    const s = g.saatler || {};
    for (const a of SAAT_ALANLARI) {
        const v = String(s[a.key] ?? '');
        if (SAATLER.includes(v) || (a.kapaliOlabilir && v === KAPALI)) temiz.saatler[a.key] = v;
        else hatalar[`saatler.${a.key}`] = `${a.etiket} seçin`;
    }
    for (const a of SAAT_ALANLARI.filter(x => x.es)) {
        if ((temiz.saatler[a.key] === KAPALI) !== (temiz.saatler[a.es] === KAPALI) && temiz.saatler[a.key] && temiz.saatler[a.es]) {
            hatalar[`saatler.${a.key}`] = 'Açılış ve kapanıştan biri "Kapalı" ise diğeri de "Kapalı" olmalı';
        }
    }

    const f = g.fiyatlar || {};
    for (const r of FIYAT_SATIRLARI) {
        const v = f[r.anahtar];
        if (v === VERMIYORUM) temiz.fiyatlar[r.anahtar] = VERMIYORUM;
        else if (r.secenekler.includes(Number(v)) && String(v ?? '').trim() !== '') temiz.fiyatlar[r.anahtar] = Number(v);
        else hatalar[`fiyatlar.${r.anahtar}`] = 'Fiyat seçin ya da "Bu hizmeti vermiyorum" seçin';
    }

    const t = g.tesis || {};
    for (const a of TESIS_EVET_HAYIR) {
        if (EVET_HAYIR.includes(t[a.key])) temiz.tesis[a.key] = t[a.key]; else hatalar[`tesis.${a.key}`] = 'Evet ya da Hayır seçin';
    }
    if (CALISAN_SAYISI.includes(Number(t.calisanSayisi)) && String(t.calisanSayisi ?? '').trim() !== '') temiz.tesis.calisanSayisi = Number(t.calisanSayisi); else hatalar['tesis.calisanSayisi'] = 'Çalışan sayısını seçin';
    if (METREKARE.includes(Number(t.metrekare)) && String(t.metrekare ?? '').trim() !== '') temiz.tesis.metrekare = Number(t.metrekare); else hatalar['tesis.metrekare'] = 'Metrekareyi seçin';
    if (t.lastikOteliKapasite === LASTIK_OTELI_YOK) temiz.tesis.lastikOteliKapasite = LASTIK_OTELI_YOK;
    else if (LASTIK_OTELI_KAPASITE.includes(Number(t.lastikOteliKapasite)) && String(t.lastikOteliKapasite ?? '').trim() !== '') temiz.tesis.lastikOteliKapasite = Number(t.lastikOteliKapasite);
    else hatalar['tesis.lastikOteliKapasite'] = 'Lastik oteli kapasitesini seçin';
    const izinli = new Set([...MARKALAR, MARKA_YOK, MARKA_HEPSI, MARKA_DIGER]);
    let m = Array.isArray(t.markalar) ? [...new Set(t.markalar.map(String))].filter(x => izinli.has(x)) : [];
    if (m.includes(MARKA_YOK)) m = [MARKA_YOK]; else if (m.includes(MARKA_HEPSI)) m = [MARKA_HEPSI];
    if (m.length) temiz.tesis.markalar = m; else hatalar['tesis.markalar'] = 'En az bir seçenek işaretleyin';

    // İsteğe bağlı alanlar: boş bırakılabilir, hata üretmez. Tanınmayan dosya adı sessizce atılır.
    temiz.ekHizmetler = String(g.ekHizmetler ?? '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, EK_HIZMET_UZUNLUK);
    temiz.gorseller = {};
    const gr = g.gorseller || {};
    for (const a of GORSEL_ALANLARI) {
        const liste = Array.isArray(gr[a.key]) ? [...new Set(gr[a.key].map(String))] : [];
        temiz.gorseller[a.key] = liste.filter(x => DOSYA_KIMLIK.test(x) && (a.pdf || !x.endsWith('.pdf'))).slice(0, GORSEL_ADET);
    }

    return { hatalar, temiz };
}

module.exports = { SITE, KAPALI, VERMIYORUM, VERMIYORUM_ETIKET, SAAT_ALANLARI, FIYAT_GRUPLARI, FIYAT_SATIRLARI, TESIS_EVET_HAYIR, LASTIK_OTELI_YOK, LASTIK_OTELI_YOK_ETIKET, GORSEL_ALANLARI, GORSEL_ADET, GORSEL_BOYUT_MB, GORSEL_DIZIN, DOSYA_KIMLIK, EK_HIZMET_SORU, tanim, dogrula, telefonBicimle };
