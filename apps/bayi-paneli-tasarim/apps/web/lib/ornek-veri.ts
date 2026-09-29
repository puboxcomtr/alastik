/**
 * ÖRNEK VERİ — tasarım şablonunun tek veri kaynağı.
 *
 * Bu dosyadaki her şey uydurmadır ve yalnızca ekranların dolu görünmesi için
 * vardır. Veritabanı, ERP ya da API bağlantısı YOKTUR.
 *
 * GERÇEK VERİYE BAĞLARKEN
 *   Aşağıdaki tipleri koruyup fonksiyonların gövdesini kendi veri
 *   kaynağınızla değiştirmek yeterlidir; sayfalar yalnızca bu dosyadan
 *   okur, başka hiçbir yerde veri erişimi yoktur.
 *
 * NOT: Tutarlar tam sayı **kuruş**tur (1 TL = 100).
 */

/* ────────────────────────────── Tipler ────────────────────────────── */

export type Mevsim = "yaz" | "kis" | "dortMevsim";
export type UrunDurumu = "sifir" | "ikinciEl";
export type SiparisDurumu =
  | "SUBMITTED"
  | "CONFIRMED"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type Depo = { id: string; ad: string };

export type StokSatiri = {
  warehouseId: string;
  depoAd: string;
  kullanilabilir: number;
};

export type Fiyat = {
  /** Üstü çizili gösterilen liste fiyatı (KDV hariç). */
  listeBirimKurus: number;
  /** Bayiye uygulanan net birim fiyat (KDV hariç). */
  birimNetKurus: number;
  kdvDahilBirimKurus: number;
  fiyatKaynagi: "liste" | "ozel_fiyat";
};

export type Lastik = {
  id: string;
  stokKodu: string;
  marka: string;
  ebat: string;
  desen: string;
  yukHizEndeksi: string | null;
  mevsim: Mevsim;
  dotYili: number | null;
  urunDurumu: UrunDurumu;
  rft: boolean;
  cTipi: boolean;
  ev: boolean;
  xl: boolean;
  gorselUrl: string | null;
  stoklar: StokSatiri[];
  fiyat: Fiyat | null;
};

export type Jant = {
  id: string;
  stokKodu: string;
  marka: string;
  ebat: string;
  desen: string;
  aracMarkasi: string | null;
  jantCapi: number | null;
  /** 8.5J → 85 (ondalık kaçmasın diye 10 katı saklanır). */
  jantGenisligiX10: number | null;
  bijonAralikKodu: string | null;
  /** 66.45 → 6645 */
  gobekCapiX100: number | null;
  /** ET35 → 350 */
  etOffsetX10: number | null;
  stepne: boolean;
  takimSatis: boolean;
  minSiparisMiktari: number;
  urunDurumu: UrunDurumu;
  gorselUrl: string | null;
  stoklar: StokSatiri[];
  fiyat: Fiyat | null;
};

export type SiparisKalemi = {
  id: string;
  urunAdi: string;
  marka: string;
  stokKodu: string;
  depoAd: string;
  adet: number;
  listeBirimKurus: number;
  iskontoBps: number;
  kampanyaIndirimKurus: number;
  birimFiyatKurus: number;
  matrahKurus: number;
  kdvKurus: number;
  kdvBps: number;
  satirToplamKurus: number;
  ozelFiyat: boolean;
};

export type Siparis = {
  id: string;
  no: string;
  durum: SiparisDurumu;
  createdAt: Date;
  odemeTipi: "vadeli" | "pesin";
  vadeGun: number;
  matrahToplamKurus: number;
  kdvToplamKurus: number;
  toplamKurus: number;
  erpSiparisNo: string | null;
  iptalTalepNedeni: string | null;
  iptalNedeni: string | null;
  kalemler: SiparisKalemi[];
};

export type Fatura = {
  fisNo: string;
  tarih: Date;
  vadeTarihi: Date | null;
  odemePlani: string | null;
  netKurus: number;
  kalanKurus: number;
  /** Pozitif = gecikmiş gün, negatif = vadeye kalan gün, null = vadesiz. */
  gecikmeGun: number | null;
};

export type CariHareket = {
  tarih: Date;
  vadeTarihi: Date | null;
  belgeNo: string;
  islemTipi: string;
  kaynak: "fatura" | "kasa";
  aciklama: string | null;
  borcKurus: number;
  alacakKurus: number;
  iptal: boolean;
};

export type Odeme = {
  tarih: Date;
  belgeNo: string;
  kasaAdi: string;
  aciklama: string | null;
  tutarKurus: number;
};

export type AlimSatiri = {
  donem: string;
  lastikAdet: number;
  jantAdet: number;
  siparisAdet: number;
  tutarKurus: number;
};

export type TaksitSecenegi = {
  banka: string;
  taksitler: Array<{ adet: number; aciklama: string }>;
};

export type Banner = {
  id: string;
  baslik: string;
  gorselUrl: string;
  link: string | null;
};

/* ─────────────────────── Sabitler / kimlik ─────────────────────── */

/** Şablonda "bugün" sabittir; ekran görüntüleri her açılışta değişmesin. */
export const BUGUN = new Date("2026-08-12T09:30:00Z");

function gunEkle(temel: Date, gun: number): Date {
  return new Date(temel.getTime() + gun * 86_400_000);
}

export const KDV_BPS = 2000; // %20

export const DEPOLAR: Depo[] = [
  { id: "d1", ad: "Merkez Depo" },
  { id: "d2", ad: "İstanbul Anadolu" },
  { id: "d3", ad: "İzmir" },
  { id: "d4", ad: "Ankara" },
];

export const BAYI = {
  unvan: "ÖRNEK LASTİK OTOMOTİV SAN. VE TİC. LTD. ŞTİ.",
  kisaUnvan: "Örnek Lastik",
  cariKodu: "120.01.0042",
  eposta: "ornek@bayi.com",
  sehir: "İSTANBUL",
  krediLimitiKurus: 1_500_000_00,
  odemeVadeGun: 60,
  iskontoBps: 1200, // %12
  sonSenkronAt: new Date("2026-08-12T08:45:00Z"),
};

export const ILETISIM = {
  telefon: "0212 000 00 00",
  whatsapp: "905000000000",
};

export const BANNERLAR: Banner[] = [
  {
    id: "b1",
    baslik: "Kış lastiğinde sezon öncesi bayi fiyatları",
    gorselUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 260">
           <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#14161a"/><stop offset="1" stop-color="#2b2f36"/></linearGradient></defs>
           <rect width="1200" height="260" fill="url(#g)"/>
           <circle cx="1040" cy="130" r="150" fill="#e6cf17" opacity="0.12"/>
           <text x="60" y="115" fill="#e6cf17" font-family="system-ui,sans-serif" font-size="42" font-weight="700">Kış Sezonu Bayi Fiyatları</text>
           <text x="60" y="165" fill="#f3f3f1" font-family="system-ui,sans-serif" font-size="24">Stoklarla sınırlı · örnek görsel</text>
         </svg>`,
      ),
    link: "/lastik",
  },
  {
    id: "b2",
    baslik: "Jant kataloğu güncellendi",
    gorselUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 260">
           <rect width="1200" height="260" fill="#101a2b"/>
           <circle cx="1010" cy="130" r="120" fill="none" stroke="#4b7bd6" stroke-width="26" opacity="0.35"/>
           <text x="60" y="115" fill="#8fb4ff" font-family="system-ui,sans-serif" font-size="42" font-weight="700">Yeni Jant Kataloğu</text>
           <text x="60" y="165" fill="#dbe6ff" font-family="system-ui,sans-serif" font-size="24">Çap, bijon ve ET ile süzün · örnek görsel</text>
         </svg>`,
      ),
    link: "/jant",
  },
];

/* ─────────────────────── Katalog üretimi ─────────────────────── */

/**
 * Sabit (deterministik) sözde-rastgele üretici. `Math.random` kullanılmaz:
 * liste her derlemede aynı çıksın, ekran görüntüleri oynamasın.
 */
function tohum(metin: string): number {
  let h = 2166136261;
  for (let i = 0; i < metin.length; i++) {
    h ^= metin.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

const MARKALAR = [
  "Michelin",
  "Bridgestone",
  "Goodyear",
  "Pirelli",
  "Continental",
  "Lassa",
  "Petlas",
  "Hankook",
];

const DESENLER: Record<string, string[]> = {
  yaz: ["Primacy 4", "Turanza T005", "EfficientGrip", "Cinturato P7", "PremiumContact 6"],
  kis: ["Alpin 6", "Blizzak LM005", "UltraGrip 9", "Sottozero 3", "WinterContact TS870"],
  dortMevsim: ["CrossClimate 2", "Weather Control A005", "Vector 4Seasons", "Cinturato AS", "AllSeasonContact"],
};

const EBATLAR = [
  "205/55 R16",
  "225/45 R17",
  "195/65 R15",
  "215/60 R16",
  "235/45 R18",
  "175/65 R14",
  "245/45 R18",
  "225/55 R17",
  "185/65 R15",
  "255/40 R19",
  "205/60 R16",
  "215/55 R17",
];

const YUK_HIZ = ["91V", "94W", "88H", "95H", "98Y", "82T"];

const MEVSIMLER: Mevsim[] = ["yaz", "kis", "dortMevsim"];

function stokUret(anahtar: string): StokSatiri[] {
  return DEPOLAR.map((d, i) => {
    const r = tohum(`${anahtar}-stok-${d.id}`);
    // Her ürün her depoda bulunmaz; bazı depolar bilinçli olarak sıfır.
    const adet = r < 0.28 ? 0 : Math.floor(r * 34) + (i === 0 ? 4 : 0);
    return { warehouseId: d.id, depoAd: d.ad, kullanilabilir: adet };
  });
}

function fiyatUret(anahtar: string, tabanKurus: number): Fiyat {
  const ozel = tohum(`${anahtar}-ozel`) > 0.88;
  const iskontoOran = ozel ? 0.78 : 1 - BAYI.iskontoBps / 10000;
  const net = Math.round((tabanKurus * iskontoOran) / 100) * 100;
  return {
    listeBirimKurus: tabanKurus,
    birimNetKurus: net,
    kdvDahilBirimKurus: Math.round((net * (10000 + KDV_BPS)) / 10000),
    fiyatKaynagi: ozel ? "ozel_fiyat" : "liste",
  };
}

function lastikUret(sira: number): Lastik {
  const anahtar = `lastik-${sira}`;
  const marka = MARKALAR[Math.floor(tohum(`${anahtar}-marka`) * MARKALAR.length)]!;
  const mevsim = MEVSIMLER[Math.floor(tohum(`${anahtar}-mevsim`) * MEVSIMLER.length)]!;
  const desenler = DESENLER[mevsim]!;
  const desen = desenler[Math.floor(tohum(`${anahtar}-desen`) * desenler.length)]!;
  const ebat = EBATLAR[Math.floor(tohum(`${anahtar}-ebat`) * EBATLAR.length)]!;
  const ikinciEl = tohum(`${anahtar}-durum`) > 0.86;
  const taban = 180_000 + Math.floor(tohum(`${anahtar}-fiyat`) * 620_000);

  return {
    id: anahtar,
    stokKodu: `LST-${String(1000 + sira)}`,
    marka,
    ebat,
    desen,
    yukHizEndeksi: YUK_HIZ[Math.floor(tohum(`${anahtar}-yh`) * YUK_HIZ.length)]!,
    mevsim,
    dotYili: 2023 + Math.floor(tohum(`${anahtar}-dot`) * 4),
    urunDurumu: ikinciEl ? "ikinciEl" : "sifir",
    rft: tohum(`${anahtar}-rft`) > 0.78,
    cTipi: tohum(`${anahtar}-ct`) > 0.88,
    ev: tohum(`${anahtar}-ev`) > 0.82,
    xl: tohum(`${anahtar}-xl`) > 0.6,
    gorselUrl: null,
    stoklar: stokUret(anahtar),
    fiyat: fiyatUret(anahtar, Math.round(taban / 100) * 100),
  };
}

const ARAC_MARKALARI = ["BMW", "Mercedes", "Audi", "Volkswagen", "Ford", "Renault", "Toyota"];
const BIJONLAR = ["5x112", "5x120", "5x108", "4x100", "5x114.3"];
const JANT_DESEN = ["Style 442", "AMG Line", "S-Line", "GTI Replica", "ST Line", "Sport Line"];

function jantUret(sira: number): Jant {
  const anahtar = `jant-${sira}`;
  const cap = 15 + Math.floor(tohum(`${anahtar}-cap`) * 6);
  const genislikX10 = 60 + Math.floor(tohum(`${anahtar}-gen`) * 30) * 5;
  const arac = ARAC_MARKALARI[Math.floor(tohum(`${anahtar}-arac`) * ARAC_MARKALARI.length)]!;
  const bijon = BIJONLAR[Math.floor(tohum(`${anahtar}-bijon`) * BIJONLAR.length)]!;
  const desen = JANT_DESEN[Math.floor(tohum(`${anahtar}-desen`) * JANT_DESEN.length)]!;
  const takim = tohum(`${anahtar}-takim`) > 0.72;
  const taban = 320_000 + Math.floor(tohum(`${anahtar}-fiyat`) * 1_400_000);

  return {
    id: anahtar,
    stokKodu: `JNT-${String(2000 + sira)}`,
    marka: "Replica",
    ebat: `${cap}x${(genislikX10 / 10).toFixed(1)}`,
    desen,
    aracMarkasi: arac,
    jantCapi: cap,
    jantGenisligiX10: genislikX10,
    bijonAralikKodu: bijon,
    gobekCapiX100: 5710 + Math.floor(tohum(`${anahtar}-gobek`) * 1500),
    etOffsetX10: 250 + Math.floor(tohum(`${anahtar}-et`) * 25) * 10,
    stepne: tohum(`${anahtar}-stepne`) > 0.9,
    takimSatis: takim,
    minSiparisMiktari: takim ? 4 : 1,
    urunDurumu: tohum(`${anahtar}-durum`) > 0.85 ? "ikinciEl" : "sifir",
    gorselUrl: null,
    stoklar: stokUret(anahtar),
    fiyat: fiyatUret(anahtar, Math.round(taban / 100) * 100),
  };
}

export const LASTIKLER: Lastik[] = Array.from({ length: 96 }, (_, i) => lastikUret(i + 1));
export const JANTLAR: Jant[] = Array.from({ length: 42 }, (_, i) => jantUret(i + 1));

/** Filtre açılırlarını besleyen seçenek listeleri. */
export const LASTIK_SECENEKLERI = {
  markalar: [...new Set(LASTIKLER.map((l) => l.marka))].sort(),
  ebatlar: [...new Set(LASTIKLER.map((l) => l.ebat))].sort(),
  dotlar: [...new Set(LASTIKLER.map((l) => l.dotYili).filter((d): d is number => d !== null))].sort(
    (a, b) => b - a,
  ),
  depolar: DEPOLAR,
};

export const JANT_SECENEKLERI = {
  caplar: [...new Set(JANTLAR.map((j) => j.jantCapi).filter((c): c is number => c !== null))].sort(
    (a, b) => a - b,
  ),
  bijonlar: [...new Set(JANTLAR.map((j) => j.bijonAralikKodu).filter((b): b is string => b !== null))].sort(),
  aracMarkalari: [
    ...new Set(JANTLAR.map((j) => j.aracMarkasi).filter((a): a is string => a !== null)),
  ].sort(),
  depolar: DEPOLAR,
};

/* ─────────────────────────── Siparişler ─────────────────────────── */

function kalemUret(
  no: string,
  sira: number,
  urun: Lastik,
  adet: number,
  depoAd: string,
): SiparisKalemi {
  const fiyat = urun.fiyat!;
  const matrah = fiyat.birimNetKurus * adet;
  const kdv = Math.round((matrah * KDV_BPS) / 10000);
  return {
    id: `${no}-k${sira}`,
    urunAdi: `${urun.ebat} ${urun.desen}`,
    marka: urun.marka,
    stokKodu: urun.stokKodu,
    depoAd,
    adet,
    listeBirimKurus: fiyat.listeBirimKurus,
    iskontoBps: fiyat.fiyatKaynagi === "ozel_fiyat" ? 0 : BAYI.iskontoBps,
    kampanyaIndirimKurus:
      fiyat.fiyatKaynagi === "ozel_fiyat"
        ? (fiyat.listeBirimKurus - fiyat.birimNetKurus) * adet
        : 0,
    birimFiyatKurus: fiyat.birimNetKurus,
    matrahKurus: matrah,
    kdvKurus: kdv,
    kdvBps: KDV_BPS,
    satirToplamKurus: matrah + kdv,
    ozelFiyat: fiyat.fiyatKaynagi === "ozel_fiyat",
  };
}

function siparisUret(
  sira: number,
  durum: SiparisDurumu,
  gunOnce: number,
  urunIndexleri: number[],
  ekstra: Partial<Siparis> = {},
): Siparis {
  const no = `SP${String(24_100 + sira)}`;
  const kalemler = urunIndexleri.map((ui, i) =>
    kalemUret(no, i + 1, LASTIKLER[ui]!, [4, 8, 2, 16, 6][i % 5]!, DEPOLAR[i % DEPOLAR.length]!.ad),
  );
  const matrah = kalemler.reduce((t, k) => t + k.matrahKurus, 0);
  const kdv = kalemler.reduce((t, k) => t + k.kdvKurus, 0);
  return {
    id: no.toLowerCase(),
    no,
    durum,
    createdAt: gunEkle(BUGUN, -gunOnce),
    odemeTipi: "vadeli",
    vadeGun: BAYI.odemeVadeGun,
    matrahToplamKurus: matrah,
    kdvToplamKurus: kdv,
    toplamKurus: matrah + kdv,
    erpSiparisNo: null,
    iptalTalepNedeni: null,
    iptalNedeni: null,
    kalemler,
    ...ekstra,
  };
}

export const SIPARISLER: Siparis[] = [
  siparisUret(1, "SUBMITTED", 1, [0, 4, 9]),
  siparisUret(2, "CONFIRMED", 4, [12, 3], { erpSiparisNo: "ERP-2026-0188" }),
  siparisUret(3, "PREPARING", 7, [7, 18, 22, 31]),
  siparisUret(4, "SHIPPED", 12, [5], {
    iptalTalepNedeni: "Müşteri ebat değiştirmek istiyor",
  }),
  siparisUret(5, "DELIVERED", 26, [2, 14], { erpSiparisNo: "ERP-2026-0151" }),
  siparisUret(6, "DELIVERED", 41, [8, 11, 25]),
  siparisUret(7, "CANCELLED", 55, [16], { iptalNedeni: "Stok yetersizliği" }),
];

/* ───────────────────────── Cari / finans ───────────────────────── */

export const FATURALAR: Fatura[] = [
  { fisNo: "SFT2026000412", tarih: gunEkle(BUGUN, -78), vadeTarihi: gunEkle(BUGUN, -18), odemePlani: "60 Gün Vadeli", netKurus: 148_500_00, kalanKurus: 148_500_00, gecikmeGun: 18 },
  { fisNo: "SFT2026000455", tarih: gunEkle(BUGUN, -66), vadeTarihi: gunEkle(BUGUN, -6), odemePlani: "60 Gün Vadeli", netKurus: 92_300_00, kalanKurus: 92_300_00, gecikmeGun: 6 },
  { fisNo: "SFT2026000501", tarih: gunEkle(BUGUN, -49), vadeTarihi: gunEkle(BUGUN, 11), odemePlani: "60 Gün Vadeli", netKurus: 214_750_00, kalanKurus: 214_750_00, gecikmeGun: -11 },
  { fisNo: "SFT2026000538", tarih: gunEkle(BUGUN, -33), vadeTarihi: gunEkle(BUGUN, 27), odemePlani: "60 Gün Vadeli", netKurus: 63_900_00, kalanKurus: 63_900_00, gecikmeGun: -27 },
  { fisNo: "SFT2026000572", tarih: gunEkle(BUGUN, -14), vadeTarihi: gunEkle(BUGUN, 46), odemePlani: "60 Gün Vadeli", netKurus: 121_400_00, kalanKurus: 121_400_00, gecikmeGun: -46 },
  { fisNo: "SFT2026000590", tarih: gunEkle(BUGUN, -5), vadeTarihi: gunEkle(BUGUN, 55), odemePlani: "60 Gün Vadeli", netKurus: 47_250_00, kalanKurus: 47_250_00, gecikmeGun: -55 },
];

const ACIK_TOPLAM = FATURALAR.reduce((t, f) => t + f.kalanKurus, 0);

/** Henüz ERP'ye işlenmemiş siparişlerin toplamı (limit hesabına dahildir). */
export const BEKLEYEN_SIPARIS_KURUS = SIPARISLER.filter(
  (s) => s.durum !== "CANCELLED" && s.durum !== "DELIVERED" && !s.erpSiparisNo,
).reduce((t, s) => t + s.toplamKurus, 0);

export const CARI_OZET = {
  unvan: BAYI.unvan,
  cariKodu: BAYI.cariKodu,
  sonSenkronAt: BAYI.sonSenkronAt,
  borcAlacakYonu: "B" as "B" | "A",
  borcToplamKurus: 1_842_600_00,
  alacakToplamKurus: 1_154_050_00,
  bakiyeKurus: 688_550_00,
  krediLimitiKurus: BAYI.krediLimitiKurus,
  bekleyenSiparisKurus: BEKLEYEN_SIPARIS_KURUS,
  vadesiGecenKurus: FATURALAR.filter((f) => (f.gecikmeGun ?? 0) > 0).reduce(
    (t, f) => t + f.kalanKurus,
    0,
  ),
  ortalamaGecikmeGun: 12,
  buAyVadesiKurus: 214_750_00,
  gelecek30GunKurus: 278_650_00,
  toplamVadeliKurus: ACIK_TOPLAM,
  odemePlani: "60 Gün Vadeli",
  sonOdemeTarihi: gunEkle(BUGUN, -9),
  faturalar: FATURALAR,
};

export const TOPLAM_RISK_KURUS = CARI_OZET.bakiyeKurus + BEKLEYEN_SIPARIS_KURUS;
export const KALAN_LIMIT_KURUS = BAYI.krediLimitiKurus - TOPLAM_RISK_KURUS;

export const CARI_HAREKETLER: CariHareket[] = [
  { tarih: gunEkle(BUGUN, -78), vadeTarihi: gunEkle(BUGUN, -18), belgeNo: "SFT2026000412", islemTipi: "Satış Faturası", kaynak: "fatura", aciklama: null, borcKurus: 148_500_00, alacakKurus: 0, iptal: false },
  { tarih: gunEkle(BUGUN, -74), vadeTarihi: null, belgeNo: "THS2026000208", islemTipi: "Nakit Tahsilat", kaynak: "kasa", aciklama: "Merkez kasa", borcKurus: 0, alacakKurus: 100_000_00, iptal: false },
  { tarih: gunEkle(BUGUN, -66), vadeTarihi: gunEkle(BUGUN, -6), belgeNo: "SFT2026000455", islemTipi: "Satış Faturası", kaynak: "fatura", aciklama: null, borcKurus: 92_300_00, alacakKurus: 0, iptal: false },
  { tarih: gunEkle(BUGUN, -60), vadeTarihi: null, belgeNo: "IAD2026000031", islemTipi: "İade Faturası", kaynak: "fatura", aciklama: "2 adet hasarlı ürün iadesi", borcKurus: 0, alacakKurus: 18_400_00, iptal: false },
  { tarih: gunEkle(BUGUN, -49), vadeTarihi: gunEkle(BUGUN, 11), belgeNo: "SFT2026000501", islemTipi: "Satış Faturası", kaynak: "fatura", aciklama: null, borcKurus: 214_750_00, alacakKurus: 0, iptal: false },
  { tarih: gunEkle(BUGUN, -44), vadeTarihi: null, belgeNo: "SFT2026000499", islemTipi: "Satış Faturası", kaynak: "fatura", aciklama: "Hatalı kesildi", borcKurus: 12_000_00, alacakKurus: 0, iptal: true },
  { tarih: gunEkle(BUGUN, -38), vadeTarihi: null, belgeNo: "THS2026000244", islemTipi: "Kredi Kartı Tahsilat", kaynak: "kasa", aciklama: "Sanal POS", borcKurus: 0, alacakKurus: 150_000_00, iptal: false },
  { tarih: gunEkle(BUGUN, -33), vadeTarihi: gunEkle(BUGUN, 27), belgeNo: "SFT2026000538", islemTipi: "Satış Faturası", kaynak: "fatura", aciklama: null, borcKurus: 63_900_00, alacakKurus: 0, iptal: false },
  { tarih: gunEkle(BUGUN, -21), vadeTarihi: null, belgeNo: "THS2026000271", islemTipi: "Nakit Tahsilat", kaynak: "kasa", aciklama: "Merkez kasa", borcKurus: 0, alacakKurus: 75_000_00, iptal: false },
  { tarih: gunEkle(BUGUN, -14), vadeTarihi: gunEkle(BUGUN, 46), belgeNo: "SFT2026000572", islemTipi: "Satış Faturası", kaynak: "fatura", aciklama: null, borcKurus: 121_400_00, alacakKurus: 0, iptal: false },
  { tarih: gunEkle(BUGUN, -9), vadeTarihi: null, belgeNo: "THS2026000288", islemTipi: "Nakit Tahsilat", kaynak: "kasa", aciklama: "Merkez kasa", borcKurus: 0, alacakKurus: 60_000_00, iptal: false },
  { tarih: gunEkle(BUGUN, -5), vadeTarihi: gunEkle(BUGUN, 55), belgeNo: "SFT2026000590", islemTipi: "Satış Faturası", kaynak: "fatura", aciklama: null, borcKurus: 47_250_00, alacakKurus: 0, iptal: false },
];

export const ODEMELER: Odeme[] = CARI_HAREKETLER.filter(
  (h) => h.kaynak === "kasa" && !h.iptal,
).map((h) => ({
  tarih: h.tarih,
  belgeNo: h.belgeNo,
  kasaAdi: h.islemTipi.includes("Kredi") ? "Sanal POS Kasası" : "Merkez Kasa",
  aciklama: h.aciklama,
  tutarKurus: h.alacakKurus,
}));

export const ALIM_ADETLERI: AlimSatiri[] = [
  { donem: "2026 · Ocak", lastikAdet: 148, jantAdet: 12, siparisAdet: 9, tutarKurus: 486_300_00 },
  { donem: "2026 · Şubat", lastikAdet: 96, jantAdet: 8, siparisAdet: 6, tutarKurus: 318_900_00 },
  { donem: "2026 · Mart", lastikAdet: 212, jantAdet: 24, siparisAdet: 14, tutarKurus: 742_100_00 },
  { donem: "2026 · Nisan", lastikAdet: 174, jantAdet: 16, siparisAdet: 11, tutarKurus: 601_450_00 },
  { donem: "2026 · Mayıs", lastikAdet: 132, jantAdet: 4, siparisAdet: 8, tutarKurus: 429_700_00 },
  { donem: "2026 · Haziran", lastikAdet: 268, jantAdet: 32, siparisAdet: 17, tutarKurus: 918_250_00 },
  { donem: "2026 · Temmuz", lastikAdet: 196, jantAdet: 20, siparisAdet: 12, tutarKurus: 674_800_00 },
  { donem: "2026 · Ağustos", lastikAdet: 74, jantAdet: 8, siparisAdet: 5, tutarKurus: 251_600_00 },
];

export const TAKSIT_SECENEKLERI: TaksitSecenegi[] = [
  {
    banka: "Örnek Bank",
    taksitler: [
      { adet: 3, aciklama: "Peşin fiyatına" },
      { adet: 6, aciklama: "Vade farkı uygulanır" },
      { adet: 9, aciklama: "Vade farkı uygulanır" },
    ],
  },
  {
    banka: "Deneme Bankası",
    taksitler: [
      { adet: 2, aciklama: "Peşin fiyatına" },
      { adet: 6, aciklama: "Vade farkı uygulanır" },
    ],
  },
  {
    banka: "Test Finans",
    taksitler: [
      { adet: 3, aciklama: "Peşin fiyatına" },
      { adet: 12, aciklama: "Vade farkı uygulanır" },
    ],
  },
];

/* ─────────────────────────── Yardımcılar ─────────────────────────── */

export function urunBul(id: string): Lastik | Jant | undefined {
  return LASTIKLER.find((l) => l.id === id) ?? JANTLAR.find((j) => j.id === id);
}

export function siparisBul(id: string): Siparis | undefined {
  return SIPARISLER.find((s) => s.id === id);
}

export function toplamStok(stoklar: StokSatiri[]): number {
  return stoklar.reduce((t, s) => t + s.kullanilabilir, 0);
}
