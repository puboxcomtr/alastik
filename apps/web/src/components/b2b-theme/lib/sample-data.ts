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

export type Season = "yaz" | "kis" | "dortMevsim";
export type ProductStatus = "sifir" | "ikinciEl";
export type OrderStatus =
  | "SUBMITTED"
  | "CONFIRMED"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type Warehouse = { id: string; ad: string };

export type StockRow = {
  warehouseId: string;
  warehouseName: string;
  available: number;
};

export type Price = {
  /** Üstü çizili gösterilen liste fiyatı (KDV hariç). */
  listeBirimKurus: number;
  /** Bayiye uygulanan net birim fiyat (KDV hariç). */
  birimNetKurus: number;
  kdvDahilBirimKurus: number;
  priceSource: "liste" | "ozel_fiyat";
  /** İndirim oranı 0 (2.El vb.): fiyat KDV HARİÇ (net) + "KDV" gösterilir. */
  kdvHaric?: boolean;
};

export type Tire = {
  id: string;
  stockCode: string;
  marka: string;
  brandLogoUrl?: string | null;
  size: string;
  pattern: string;
  fullName?: string | null; // DIA tam ürün açıklaması (varsa ebat+desen yerine gösterilir)
  loadSpeedIndex: string | null;
  mevsim: Season;
  dotYear: number | null;
  productStatus: ProductStatus;
  rft: boolean;
  cTipi: boolean;
  ev: boolean;
  xl: boolean;
  imageUrl: string | null;
  /** Tüm ürün görselleri (2.El galeri için 2./3. görsel gösterimi). */
  images?: string[];
  stocks: StockRow[];
  fiyat: Price | null;
  /** XML (tedarikçi) kaynaklı ürün — ödeme yöntemi iskontosu uygulanmaz. */
  xml?: boolean;
  /** Sevkiyat süresi etiketi: kendi stok "Aynı Gün", XML ürün "1-2 Gün" (veya alanı). */
  sevkiyat?: string;
  /** Ürün detay sayfası slug'ı (customData.seoUrl); yoksa stok kodu. */
  slug?: string;
  /** AB Lastik Etiketi (yalnız dolu alanlar). Hepsi boşsa alan tanımsızdır. */
  label?: { yolTutus?: string; yakit?: string; gurultu?: string };
};

export type Rim = {
  id: string;
  stockCode: string;
  marka: string;
  size: string;
  pattern: string;
  vehicleBrand: string | null;
  rimDiameter: number | null;
  /** 8.5J → 85 (ondalık kaçmasın diye 10 katı saklanır). */
  rimWidthX10: number | null;
  bijonAralikKodu: string | null;
  /** 66.45 → 6645 */
  gobekCapiX100: number | null;
  /** ET35 → 350 */
  etOffsetX10: number | null;
  stepne: boolean;
  takimSatis: boolean;
  minSiparisMiktari: number;
  productStatus: ProductStatus;
  imageUrl: string | null;
  stocks: StockRow[];
  fiyat: Price | null;
};

export type OrderLine = {
  id: string;
  productName: string;
  marka: string;
  stockCode: string;
  warehouseName: string;
  adet: number;
  listeBirimKurus: number;
  discountBps: number;
  kampanyaIndirimKurus: number;
  birimFiyatKurus: number;
  matrahKurus: number;
  kdvKurus: number;
  kdvBps: number;
  satirToplamKurus: number;
  ozelFiyat: boolean;
};

export type Order = {
  id: string;
  no: string;
  durum: OrderStatus;
  createdAt: Date;
  paymentType: "vadeli" | "pesin";
  vadeGun: number;
  matrahToplamKurus: number;
  kdvToplamKurus: number;
  totalKurus: number;
  erpSiparisNo: string | null;
  cancelRequestReason: string | null;
  cancelReason: string | null;
  lines: OrderLine[];
};

export type Invoice = {
  fisNo: string;
  tarih: Date;
  vadeTarihi: Date | null;
  paymentPlan: string | null;
  netKurus: number;
  kalanKurus: number;
  /** Pozitif = gecikmiş gün, negatif = vadeye kalan gün, null = vadesiz. */
  gecikmeGun: number | null;
};

export type AccountLedgerRow = {
  tarih: Date;
  vadeTarihi: Date | null;
  belgeNo: string;
  txnType: string;
  source: "fatura" | "kasa";
  aciklama: string | null;
  borcKurus: number;
  alacakKurus: number;
  iptal: boolean;
};

export type Payment = {
  tarih: Date;
  belgeNo: string;
  kasaAdi: string;
  aciklama: string | null;
  tutarKurus: number;
};

export type PurchaseRow = {
  donem: string;
  tireQty: number;
  rimQty: number;
  orderQty: number;
  tutarKurus: number;
};

export type InstallmentOption = {
  banka: string;
  installments: Array<{ adet: number; aciklama: string }>;
};

export type Banner = {
  id: string;
  title: string;
  imageUrl: string;
  link: string | null;
};

/* ─────────────────────── Sabitler / kimlik ─────────────────────── */

/** Şablonda "bugün" sabittir; ekran görüntüleri her açılışta değişmesin. */
export const TODAY = new Date("2026-08-12T09:30:00Z");

function gunEkle(temel: Date, gun: number): Date {
  return new Date(temel.getTime() + gun * 86_400_000);
}

export const VAT_BPS = 2000; // %20

export const WAREHOUSES: Warehouse[] = [
  { id: "d1", ad: "Merkez Depo" },
  { id: "d2", ad: "İstanbul Anadolu" },
  { id: "d3", ad: "İzmir" },
  { id: "d4", ad: "Ankara" },
];

export const DEALER = {
  unvan: "ÖRNEK LASTİK OTOMOTİV SAN. VE TİC. LTD. ŞTİ.",
  kisaUnvan: "Örnek Lastik",
  accountCode: "120.01.0042",
  eposta: "ornek@bayi.com",
  sehir: "İSTANBUL",
  creditLimitKurus: 1_500_000_00,
  paymentTermDays: 60,
  discountBps: 1200, // %12
  sonSenkronAt: new Date("2026-08-12T08:45:00Z"),
};

export const CONTACT = {
  telefon: "0212 000 00 00",
  whatsapp: "905000000000",
};

export const BANNERS: Banner[] = [
  {
    id: "b1",
    title: "Kış lastiğinde sezon öncesi bayi fiyatları",
    imageUrl:
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
    link: "/",
  },
  {
    id: "b2",
    title: "Jant kataloğu güncellendi",
    imageUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 260">
           <rect width="1200" height="260" fill="#101a2b"/>
           <circle cx="1010" cy="130" r="120" fill="none" stroke="#4b7bd6" stroke-width="26" opacity="0.35"/>
           <text x="60" y="115" fill="#8fb4ff" font-family="system-ui,sans-serif" font-size="42" font-weight="700">Yeni Jant Kataloğu</text>
           <text x="60" y="165" fill="#dbe6ff" font-family="system-ui,sans-serif" font-size="24">Çap, bijon ve ET ile süzün · örnek görsel</text>
         </svg>`,
      ),
    link: "/",
  },
];

/* ─────────────────────── Katalog üretimi ─────────────────────── */

/**
 * Sabit (deterministik) sözde-rastgele üretici. `Math.random` kullanılmaz:
 * liste her derlemede aynı çıksın, ekran görüntüleri oynamasın.
 */
function tohum(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

const BRANDS = [
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

const SEASONS: Season[] = ["yaz", "kis", "dortMevsim"];

function makeStock(anahtar: string): StockRow[] {
  return WAREHOUSES.map((d, i) => {
    const r = tohum(`${anahtar}-stok-${d.id}`);
    // Her ürün her depoda bulunmaz; bazı depolar bilinçli olarak sıfır.
    const adet = r < 0.28 ? 0 : Math.floor(r * 34) + (i === 0 ? 4 : 0);
    return { warehouseId: d.id, warehouseName: d.ad, available: adet };
  });
}

function makePrice(anahtar: string, tabanKurus: number): Price {
  const ozel = tohum(`${anahtar}-ozel`) > 0.88;
  const discountRate = ozel ? 0.78 : 1 - DEALER.discountBps / 10000;
  const net = Math.round((tabanKurus * discountRate) / 100) * 100;
  return {
    listeBirimKurus: tabanKurus,
    birimNetKurus: net,
    kdvDahilBirimKurus: Math.round((net * (10000 + VAT_BPS)) / 10000),
    priceSource: ozel ? "ozel_fiyat" : "liste",
  };
}

function makeTire(sira: number): Tire {
  const anahtar = `lastik-${sira}`;
  const marka = BRANDS[Math.floor(tohum(`${anahtar}-marka`) * BRANDS.length)]!;
  const mevsim = SEASONS[Math.floor(tohum(`${anahtar}-mevsim`) * SEASONS.length)]!;
  const desenler = DESENLER[mevsim]!;
  const pattern = desenler[Math.floor(tohum(`${anahtar}-desen`) * desenler.length)]!;
  const size = EBATLAR[Math.floor(tohum(`${anahtar}-ebat`) * EBATLAR.length)]!;
  const ikinciEl = tohum(`${anahtar}-durum`) > 0.86;
  const taban = 180_000 + Math.floor(tohum(`${anahtar}-fiyat`) * 620_000);

  return {
    id: anahtar,
    stockCode: `LST-${String(1000 + sira)}`,
    marka,
    size,
    pattern,
    loadSpeedIndex: YUK_HIZ[Math.floor(tohum(`${anahtar}-yh`) * YUK_HIZ.length)]!,
    mevsim,
    dotYear: 2023 + Math.floor(tohum(`${anahtar}-dot`) * 4),
    productStatus: ikinciEl ? "ikinciEl" : "sifir",
    rft: tohum(`${anahtar}-rft`) > 0.78,
    cTipi: tohum(`${anahtar}-ct`) > 0.88,
    ev: tohum(`${anahtar}-ev`) > 0.82,
    xl: tohum(`${anahtar}-xl`) > 0.6,
    imageUrl: null,
    stocks: makeStock(anahtar),
    fiyat: makePrice(anahtar, Math.round(taban / 100) * 100),
  };
}

const VEHICLE_BRANDS = ["BMW", "Mercedes", "Audi", "Volkswagen", "Ford", "Renault", "Toyota"];
const BIJONLAR = ["5x112", "5x120", "5x108", "4x100", "5x114.3"];
const RIM_PATTERNS = ["Style 442", "AMG Line", "S-Line", "GTI Replica", "ST Line", "Sport Line"];

function makeRim(sira: number): Rim {
  const anahtar = `jant-${sira}`;
  const cap = 15 + Math.floor(tohum(`${anahtar}-cap`) * 6);
  const genislikX10 = 60 + Math.floor(tohum(`${anahtar}-gen`) * 30) * 5;
  const arac = VEHICLE_BRANDS[Math.floor(tohum(`${anahtar}-arac`) * VEHICLE_BRANDS.length)]!;
  const bijon = BIJONLAR[Math.floor(tohum(`${anahtar}-bijon`) * BIJONLAR.length)]!;
  const pattern = RIM_PATTERNS[Math.floor(tohum(`${anahtar}-desen`) * RIM_PATTERNS.length)]!;
  const takim = tohum(`${anahtar}-takim`) > 0.72;
  const taban = 320_000 + Math.floor(tohum(`${anahtar}-fiyat`) * 1_400_000);

  return {
    id: anahtar,
    stockCode: `JNT-${String(2000 + sira)}`,
    marka: "Replica",
    size: `${cap}x${(genislikX10 / 10).toFixed(1)}`,
    pattern,
    vehicleBrand: arac,
    rimDiameter: cap,
    rimWidthX10: genislikX10,
    bijonAralikKodu: bijon,
    gobekCapiX100: 5710 + Math.floor(tohum(`${anahtar}-gobek`) * 1500),
    etOffsetX10: 250 + Math.floor(tohum(`${anahtar}-et`) * 25) * 10,
    stepne: tohum(`${anahtar}-stepne`) > 0.9,
    takimSatis: takim,
    minSiparisMiktari: takim ? 4 : 1,
    productStatus: tohum(`${anahtar}-durum`) > 0.85 ? "ikinciEl" : "sifir",
    imageUrl: null,
    stocks: makeStock(anahtar),
    fiyat: makePrice(anahtar, Math.round(taban / 100) * 100),
  };
}

export const TIRES: Tire[] = Array.from({ length: 96 }, (_, i) => makeTire(i + 1));
export const RIMS: Rim[] = Array.from({ length: 42 }, (_, i) => makeRim(i + 1));

/** Filtre açılırlarını besleyen seçenek listeleri. */
export const TIRE_OPTIONS = {
  brands: [...new Set(TIRES.map((l) => l.marka))].sort(),
  ebatlar: [...new Set(TIRES.map((l) => l.size))].sort(),
  dotlar: [...new Set(TIRES.map((l) => l.dotYear).filter((d): d is number => d !== null))].sort(
    (a, b) => b - a,
  ),
  warehouses: WAREHOUSES,
};

export const RIM_OPTIONS = {
  caplar: [...new Set(RIMS.map((j) => j.rimDiameter).filter((c): c is number => c !== null))].sort(
    (a, b) => a - b,
  ),
  bijonlar: [...new Set(RIMS.map((j) => j.bijonAralikKodu).filter((b): b is string => b !== null))].sort(),
  vehicleBrands: [
    ...new Set(RIMS.map((j) => j.vehicleBrand).filter((a): a is string => a !== null)),
  ].sort(),
  warehouses: WAREHOUSES,
};

/* ─────────────────────────── Siparişler ─────────────────────────── */

function makeLine(
  no: string,
  sira: number,
  urun: Tire,
  adet: number,
  warehouseName: string,
): OrderLine {
  const fiyat = urun.fiyat!;
  const matrah = fiyat.birimNetKurus * adet;
  const kdv = Math.round((matrah * VAT_BPS) / 10000);
  return {
    id: `${no}-k${sira}`,
    productName: `${urun.size} ${urun.pattern}`,
    marka: urun.marka,
    stockCode: urun.stockCode,
    warehouseName,
    adet,
    listeBirimKurus: fiyat.listeBirimKurus,
    discountBps: fiyat.priceSource === "ozel_fiyat" ? 0 : DEALER.discountBps,
    kampanyaIndirimKurus:
      fiyat.priceSource === "ozel_fiyat"
        ? (fiyat.listeBirimKurus - fiyat.birimNetKurus) * adet
        : 0,
    birimFiyatKurus: fiyat.birimNetKurus,
    matrahKurus: matrah,
    kdvKurus: kdv,
    kdvBps: VAT_BPS,
    satirToplamKurus: matrah + kdv,
    ozelFiyat: fiyat.priceSource === "ozel_fiyat",
  };
}

function makeOrder(
  sira: number,
  durum: OrderStatus,
  gunOnce: number,
  productIndexes: number[],
  ekstra: Partial<Order> = {},
): Order {
  const no = `SP${String(24_100 + sira)}`;
  const lines = productIndexes.map((ui, i) =>
    makeLine(no, i + 1, TIRES[ui]!, [4, 8, 2, 16, 6][i % 5]!, WAREHOUSES[i % WAREHOUSES.length]!.ad),
  );
  const matrah = lines.reduce((t, k) => t + k.matrahKurus, 0);
  const kdv = lines.reduce((t, k) => t + k.kdvKurus, 0);
  return {
    id: no.toLowerCase(),
    no,
    durum,
    createdAt: gunEkle(TODAY, -gunOnce),
    paymentType: "vadeli",
    vadeGun: DEALER.paymentTermDays,
    matrahToplamKurus: matrah,
    kdvToplamKurus: kdv,
    totalKurus: matrah + kdv,
    erpSiparisNo: null,
    cancelRequestReason: null,
    cancelReason: null,
    lines,
    ...ekstra,
  };
}

export const ORDERS: Order[] = [
  makeOrder(1, "SUBMITTED", 1, [0, 4, 9]),
  makeOrder(2, "CONFIRMED", 4, [12, 3], { erpSiparisNo: "ERP-2026-0188" }),
  makeOrder(3, "PREPARING", 7, [7, 18, 22, 31]),
  makeOrder(4, "SHIPPED", 12, [5], {
    cancelRequestReason: "Müşteri ebat değiştirmek istiyor",
  }),
  makeOrder(5, "DELIVERED", 26, [2, 14], { erpSiparisNo: "ERP-2026-0151" }),
  makeOrder(6, "DELIVERED", 41, [8, 11, 25]),
  makeOrder(7, "CANCELLED", 55, [16], { cancelReason: "Stok yetersizliği" }),
];

/* ───────────────────────── Cari / finans ───────────────────────── */

export const INVOICES: Invoice[] = [
  { fisNo: "SFT2026000412", tarih: gunEkle(TODAY, -78), vadeTarihi: gunEkle(TODAY, -18), paymentPlan: "60 Gün Vadeli", netKurus: 148_500_00, kalanKurus: 148_500_00, gecikmeGun: 18 },
  { fisNo: "SFT2026000455", tarih: gunEkle(TODAY, -66), vadeTarihi: gunEkle(TODAY, -6), paymentPlan: "60 Gün Vadeli", netKurus: 92_300_00, kalanKurus: 92_300_00, gecikmeGun: 6 },
  { fisNo: "SFT2026000501", tarih: gunEkle(TODAY, -49), vadeTarihi: gunEkle(TODAY, 11), paymentPlan: "60 Gün Vadeli", netKurus: 214_750_00, kalanKurus: 214_750_00, gecikmeGun: -11 },
  { fisNo: "SFT2026000538", tarih: gunEkle(TODAY, -33), vadeTarihi: gunEkle(TODAY, 27), paymentPlan: "60 Gün Vadeli", netKurus: 63_900_00, kalanKurus: 63_900_00, gecikmeGun: -27 },
  { fisNo: "SFT2026000572", tarih: gunEkle(TODAY, -14), vadeTarihi: gunEkle(TODAY, 46), paymentPlan: "60 Gün Vadeli", netKurus: 121_400_00, kalanKurus: 121_400_00, gecikmeGun: -46 },
  { fisNo: "SFT2026000590", tarih: gunEkle(TODAY, -5), vadeTarihi: gunEkle(TODAY, 55), paymentPlan: "60 Gün Vadeli", netKurus: 47_250_00, kalanKurus: 47_250_00, gecikmeGun: -55 },
];

const ACIK_TOPLAM = INVOICES.reduce((t, f) => t + f.kalanKurus, 0);

/** Henüz ERP'ye işlenmemiş siparişlerin toplamı (limit hesabına dahildir). */
export const PENDING_ORDER_KURUS = ORDERS.filter(
  (s) => s.durum !== "CANCELLED" && s.durum !== "DELIVERED" && !s.erpSiparisNo,
).reduce((t, s) => t + s.totalKurus, 0);

export const ACCOUNT_SUMMARY = {
  unvan: DEALER.unvan,
  accountCode: DEALER.accountCode,
  sonSenkronAt: DEALER.sonSenkronAt,
  borcAlacakYonu: "B" as "B" | "A",
  borcToplamKurus: 1_842_600_00,
  alacakToplamKurus: 1_154_050_00,
  balanceKurus: 688_550_00,
  creditLimitKurus: DEALER.creditLimitKurus,
  pendingOrderKurus: PENDING_ORDER_KURUS,
  overdueKurus: INVOICES.filter((f) => (f.gecikmeGun ?? 0) > 0).reduce(
    (t, f) => t + f.kalanKurus,
    0,
  ),
  ortalamaGecikmeGun: 12,
  buAyVadesiKurus: 214_750_00,
  gelecek30GunKurus: 278_650_00,
  totalTermKurus: ACIK_TOPLAM,
  paymentPlan: "60 Gün Vadeli",
  sonOdemeTarihi: gunEkle(TODAY, -9),
  invoices: INVOICES,
};

export const TOTAL_RISK_KURUS = ACCOUNT_SUMMARY.balanceKurus + PENDING_ORDER_KURUS;
export const REMAINING_LIMIT_KURUS = DEALER.creditLimitKurus - TOTAL_RISK_KURUS;

export const ACCOUNT_LEDGER: AccountLedgerRow[] = [
  { tarih: gunEkle(TODAY, -78), vadeTarihi: gunEkle(TODAY, -18), belgeNo: "SFT2026000412", txnType: "Satış Faturası", source: "fatura", aciklama: null, borcKurus: 148_500_00, alacakKurus: 0, iptal: false },
  { tarih: gunEkle(TODAY, -74), vadeTarihi: null, belgeNo: "THS2026000208", txnType: "Nakit Tahsilat", source: "kasa", aciklama: "Merkez kasa", borcKurus: 0, alacakKurus: 100_000_00, iptal: false },
  { tarih: gunEkle(TODAY, -66), vadeTarihi: gunEkle(TODAY, -6), belgeNo: "SFT2026000455", txnType: "Satış Faturası", source: "fatura", aciklama: null, borcKurus: 92_300_00, alacakKurus: 0, iptal: false },
  { tarih: gunEkle(TODAY, -60), vadeTarihi: null, belgeNo: "IAD2026000031", txnType: "İade Faturası", source: "fatura", aciklama: "2 adet hasarlı ürün iadesi", borcKurus: 0, alacakKurus: 18_400_00, iptal: false },
  { tarih: gunEkle(TODAY, -49), vadeTarihi: gunEkle(TODAY, 11), belgeNo: "SFT2026000501", txnType: "Satış Faturası", source: "fatura", aciklama: null, borcKurus: 214_750_00, alacakKurus: 0, iptal: false },
  { tarih: gunEkle(TODAY, -44), vadeTarihi: null, belgeNo: "SFT2026000499", txnType: "Satış Faturası", source: "fatura", aciklama: "Hatalı kesildi", borcKurus: 12_000_00, alacakKurus: 0, iptal: true },
  { tarih: gunEkle(TODAY, -38), vadeTarihi: null, belgeNo: "THS2026000244", txnType: "Kredi Kartı Tahsilat", source: "kasa", aciklama: "Sanal POS", borcKurus: 0, alacakKurus: 150_000_00, iptal: false },
  { tarih: gunEkle(TODAY, -33), vadeTarihi: gunEkle(TODAY, 27), belgeNo: "SFT2026000538", txnType: "Satış Faturası", source: "fatura", aciklama: null, borcKurus: 63_900_00, alacakKurus: 0, iptal: false },
  { tarih: gunEkle(TODAY, -21), vadeTarihi: null, belgeNo: "THS2026000271", txnType: "Nakit Tahsilat", source: "kasa", aciklama: "Merkez kasa", borcKurus: 0, alacakKurus: 75_000_00, iptal: false },
  { tarih: gunEkle(TODAY, -14), vadeTarihi: gunEkle(TODAY, 46), belgeNo: "SFT2026000572", txnType: "Satış Faturası", source: "fatura", aciklama: null, borcKurus: 121_400_00, alacakKurus: 0, iptal: false },
  { tarih: gunEkle(TODAY, -9), vadeTarihi: null, belgeNo: "THS2026000288", txnType: "Nakit Tahsilat", source: "kasa", aciklama: "Merkez kasa", borcKurus: 0, alacakKurus: 60_000_00, iptal: false },
  { tarih: gunEkle(TODAY, -5), vadeTarihi: gunEkle(TODAY, 55), belgeNo: "SFT2026000590", txnType: "Satış Faturası", source: "fatura", aciklama: null, borcKurus: 47_250_00, alacakKurus: 0, iptal: false },
];

export const PAYMENTS: Payment[] = ACCOUNT_LEDGER.filter(
  (h) => h.source === "kasa" && !h.iptal,
).map((h) => ({
  tarih: h.tarih,
  belgeNo: h.belgeNo,
  kasaAdi: h.txnType.includes("Kredi") ? "Sanal POS Kasası" : "Merkez Kasa",
  aciklama: h.aciklama,
  tutarKurus: h.alacakKurus,
}));

export const PURCHASE_ROWS: PurchaseRow[] = [
  { donem: "2026 · Ocak", tireQty: 148, rimQty: 12, orderQty: 9, tutarKurus: 486_300_00 },
  { donem: "2026 · Şubat", tireQty: 96, rimQty: 8, orderQty: 6, tutarKurus: 318_900_00 },
  { donem: "2026 · Mart", tireQty: 212, rimQty: 24, orderQty: 14, tutarKurus: 742_100_00 },
  { donem: "2026 · Nisan", tireQty: 174, rimQty: 16, orderQty: 11, tutarKurus: 601_450_00 },
  { donem: "2026 · Mayıs", tireQty: 132, rimQty: 4, orderQty: 8, tutarKurus: 429_700_00 },
  { donem: "2026 · Haziran", tireQty: 268, rimQty: 32, orderQty: 17, tutarKurus: 918_250_00 },
  { donem: "2026 · Temmuz", tireQty: 196, rimQty: 20, orderQty: 12, tutarKurus: 674_800_00 },
  { donem: "2026 · Ağustos", tireQty: 74, rimQty: 8, orderQty: 5, tutarKurus: 251_600_00 },
];

export const INSTALLMENT_OPTIONS: InstallmentOption[] = [
  {
    banka: "Örnek Bank",
    installments: [
      { adet: 3, aciklama: "Peşin fiyatına" },
      { adet: 6, aciklama: "Vade farkı uygulanır" },
      { adet: 9, aciklama: "Vade farkı uygulanır" },
    ],
  },
  {
    banka: "Deneme Bankası",
    installments: [
      { adet: 2, aciklama: "Peşin fiyatına" },
      { adet: 6, aciklama: "Vade farkı uygulanır" },
    ],
  },
  {
    banka: "Test Finans",
    installments: [
      { adet: 3, aciklama: "Peşin fiyatına" },
      { adet: 12, aciklama: "Vade farkı uygulanır" },
    ],
  },
];

/**
 * Sepet ödeme yöntemleri (bayiye özel iskontolarla). discountBps = binde
 * (800 = %8.00). indirim tutarı sepet toplamından hesaplanır.
 * NOT: Şablon verisidir; gerçekte panelden/cari koşullarından gelmeli.
 */
export type PaymentMethod = {
  id: string;
  title: string;
  subtitle?: string;
  discountBps: number;
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: "kk-tek", title: "Anında K.K. Tek Çekim", discountBps: 800 },
  { id: "kk-taksit", title: "Anında Kredi Kartı Taksit", discountBps: 600 },
  { id: "premium-30", title: "Premium Bayi Özel 30 Gün", subtitle: "30 Gün", discountBps: 700 },
];

/* ─────────────────────────── Yardımcılar ─────────────────────────── */

export function findProduct(id: string): Tire | Rim | undefined {
  return TIRES.find((l) => l.id === id) ?? RIMS.find((j) => j.id === id);
}

export function findOrder(id: string): Order | undefined {
  return ORDERS.find((s) => s.id === id);
}

export function totalStock(stocks: StockRow[]): number {
  return stocks.reduce((t, s) => t + s.available, 0);
}
