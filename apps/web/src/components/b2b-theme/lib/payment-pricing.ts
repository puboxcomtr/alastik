// b2b ödeme yöntemi fiyatlaması — API'den gelen (DIA kampanyası kaynaklı)
// marka bazlı iskonto haritasını sepette satır satır uygular.

export type B2bPaymentMethod = { id: string; title: string; discountPct: number };

export type B2bPricing = {
  segment: string;
  methods: B2bPaymentMethod[];
  brandMap: Record<string, Record<string, number>>;
  defaultDiscounts: Record<string, number>;
  gelAlBonus?: number; // "Gel Al" teslimatının ek iskonto artışı (DIA'dan)
};

/** Marka adını backend ile aynı biçimde normalize eder (Türkçe → ASCII fold). */
function normBrand(name: string): string {
  return (name || "").trim().toUpperCase()
    .replace(/İ/g, "I").replace(/Ş/g, "S").replace(/Ğ/g, "G")
    .replace(/Ü/g, "U").replace(/Ö/g, "O").replace(/Ç/g, "C");
}

/** Bir ürünün, seçilen ödeme yöntemine göre iskonto yüzdesi (marka bazlı). */
export function lineDiscountPct(
  pricing: B2bPricing | null,
  marka: string,
  methodId: string,
): number {
  if (!pricing || !methodId) return 0;
  const b = normBrand(marka);
  const bm = pricing.brandMap[b];
  if (bm && bm[methodId] != null) return bm[methodId];
  if (pricing.defaultDiscounts[methodId] != null) return pricing.defaultDiscounts[methodId];
  return 0;
}

export type CartLineLike = {
  urun: { marka: string; xml?: boolean };
  kdvDahilBirimKurus: number;
  adet: number;
};

export type DiscountedTotals = {
  matrahToplamKurus: number;
  kdvToplamKurus: number;
  totalKurus: number;
  indirimToplamKurus: number; // orijinale göre toplam tasarruf
};

/**
 * Seçilen ödeme yöntemi + teslimat yöntemine göre sepet toplamlarını (satır satır
 * iskontolu) hesaplar. "Gel Al" teslimatı seçiliyse ödeme iskontosunun üstüne
 * DIA'dan gelen Gel-Al artışı (gelAlBonus) eklenir. XML ürünlerde iskonto yok.
 */
export function computeDiscountedTotals(
  lines: CartLineLike[],
  pricing: B2bPricing | null,
  methodId: string,
  gelAl = false,
): DiscountedTotals {
  const bonus = gelAl ? (pricing?.gelAlBonus ?? 0) : 0;
  let kdvDahil = 0;
  let origKdvDahil = 0;
  for (const l of lines) {
    const satir = l.kdvDahilBirimKurus * l.adet;
    origKdvDahil += satir;
    // XML (tedarikçi) ürünlerde ödeme/teslimat iskontosu uygulanmaz.
    // Ödeme ve Gel Al iskontoları ZİNCİRLİ uygulanır (DIA çoklu indirim ile birebir).
    const payPct = l.urun.xml ? 0 : lineDiscountPct(pricing, l.urun.marka, methodId);
    const gaPct = l.urun.xml ? 0 : bonus;
    kdvDahil += Math.round(satir * (1 - payPct / 100) * (1 - gaPct / 100));
  }
  const matrah = Math.round(kdvDahil / 1.2);
  return {
    matrahToplamKurus: matrah,
    kdvToplamKurus: kdvDahil - matrah,
    totalKurus: kdvDahil,
    indirimToplamKurus: Math.max(0, origKdvDahil - kdvDahil),
  };
}
