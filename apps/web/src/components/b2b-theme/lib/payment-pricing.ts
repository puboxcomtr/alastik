// b2b ödeme yöntemi fiyatlaması — API'den gelen (DIA kampanyası kaynaklı)
// marka bazlı iskonto haritasını sepette satır satır uygular.
// Panelde tanımlı finansal iskonto (cari tipine göre) eşleşen satırda DIA oranının YERİNE geçer.
import { financialDiscountPct, productShippingKurus, type FinancialDiscountMap, type ProductShipping } from "./financial-discounts";

// disabled: yöntem bu cari için kapalı (ör. cari limiti aşıldığında Cari Sipariş)
// termDays: Cari Sipariş için carinin DIA ödeme planındaki vade günü
export type B2bPaymentMethod = { id: string; title: string; discountPct: number; disabled?: boolean; termDays?: number };

/** Cari limiti (sunucudan): vadeli yöntemin (methodId) kalan limiti. closed: vadeli alım kapalı
 *  (reason "no_limit" = limit tanımlı değil, "exceeded" = limit aşıldı, "overdue" = vadesi geçen borç).
 *  orderingClosed: limit tanımsız, bitmiş ya da vadesi geçen borç — hiçbir ödeme yöntemiyle sipariş verilemez (mesaj sunucudan).
 *  cartClosed: vadesi geçen borç — sepete ürün eklemek de kapalı. */
export type B2bCreditLimit = {
  hasLimit: boolean; closed: boolean; reason: string | null; methodId: string; totalLimitKurus: number; remainingLimitKurus: number;
  orderingClosed?: boolean; orderingClosedReason?: string | null; orderingClosedMessage?: string;
  cartClosed?: boolean; cartClosedMessage?: string;
};

// Kapalı vadeli yöntemin yanında gösterilen kısa neden
// (vadesi geçen borçta yöntem sunucudan hiç gelmez, etiketi yoktur)
export const CREDIT_CLOSED_LABELS: Record<string, string> = { no_limit: "Limit Tanımsız", exceeded: "Limit Aşıldı" };

export type B2bPricing = {
  segment: string;
  methods: B2bPaymentMethod[];
  brandMap: Record<string, Record<string, number>>;
  defaultDiscounts: Record<string, number>;
  creditLimit?: B2bCreditLimit;
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

/** Satırın ödeme iskontosu: XML üründe yok; panel kuralı varsa o, yoksa DIA (marka bazlı) oranı. */
export function effectiveLineDiscountPct(
  pricing: B2bPricing | null,
  urun: { marka: string; xml?: boolean; stockCode?: string },
  methodId: string,
  financial?: FinancialDiscountMap | null,
): number {
  if (urun.xml) return 0;
  const panel = urun.stockCode ? financialDiscountPct(financial, urun.stockCode, methodId) : null;
  return panel ?? lineDiscountPct(pricing, urun.marka, methodId);
}

export type CartLineLike = {
  urun: { marka: string; xml?: boolean; stockCode?: string };
  kdvDahilBirimKurus: number;
  adet: number;
};

export type DiscountedTotals = {
  matrahToplamKurus: number;
  kdvToplamKurus: number;
  totalKurus: number;
  indirimToplamKurus: number; // orijinale göre toplam tasarruf (yalnız ürünler; kargoya iskonto uygulanmaz)
  // Kargo: toplam pay (KDV dahil) ve bunun fiyata dahil OLMAYAN (sepette ayrı satır) kısmı
  kargoToplamKurus: number;
  ayriKargoKurus: number;
};

/**
 * Seçilen ödeme yöntemine göre sepet toplamlarını (satır satır iskontolu) hesaplar.
 * XML ürünlerde iskonto yok. Kargo payı iskontosuz eklenir (fiyata dahil ya da ayrı satır).
 */
export function computeDiscountedTotals(
  lines: CartLineLike[],
  pricing: B2bPricing | null,
  methodId: string,
  financial?: FinancialDiscountMap | null,
  shipping?: Record<string, ProductShipping> | null,
): DiscountedTotals {
  let kargoToplam = 0;
  let ayriKargo = 0;
  let kdvDahil = 0;
  let origKdvDahil = 0;
  for (const l of lines) {
    const satir = l.kdvDahilBirimKurus * l.adet;
    origKdvDahil += satir;
    // XML (tedarikçi) ürünlerde ödeme iskontosu uygulanmaz.
    const payPct = effectiveLineDiscountPct(pricing, l.urun, methodId, financial);
    kdvDahil += Math.round(satir * (1 - payPct / 100));
    const kargo = productShippingKurus(shipping, l.urun.stockCode || "");
    if (kargo.kurus > 0) {
      kargoToplam += kargo.kurus * l.adet;
      if (kargo.excluded) ayriKargo += kargo.kurus * l.adet;
    }
  }
  kdvDahil += kargoToplam;
  // Ara Toplam / KDV: ürünler + fiyata dahil kargo; ayrı satırdaki kargo (KDV dahil) ayrıca gösterilir
  const satirlarKdvDahil = kdvDahil - ayriKargo;
  const matrah = Math.round(satirlarKdvDahil / 1.2);
  return {
    matrahToplamKurus: matrah,
    kdvToplamKurus: satirlarKdvDahil - matrah,
    totalKurus: kdvDahil,
    indirimToplamKurus: Math.max(0, origKdvDahil - (kdvDahil - kargoToplam)),
    kargoToplamKurus: kargoToplam,
    ayriKargoKurus: ayriKargo,
  };
}
