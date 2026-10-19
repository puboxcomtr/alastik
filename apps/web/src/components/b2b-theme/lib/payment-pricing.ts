import { financialDiscountPct, productShippingKurus, type FinancialDiscountMap, type ProductShipping } from "./financial-discounts";

export type B2bPaymentMethod = { id: string; title: string; discountPct: number; disabled?: boolean; termDays?: number };

export type B2bCreditLimit = {
  hasLimit: boolean; closed: boolean; reason: string | null; methodId: string; totalLimitKurus: number; remainingLimitKurus: number;
  orderingClosed?: boolean; orderingClosedReason?: string | null; orderingClosedMessage?: string;
  cartClosed?: boolean; cartClosedMessage?: string;
};

export const CREDIT_CLOSED_LABELS: Record<string, string> = { no_limit: "Limit Tanımsız", exceeded: "Limit Aşıldı" };

export type B2bPricing = {
  segment: string;
  methods: B2bPaymentMethod[];
  brandMap: Record<string, Record<string, number>>;
  defaultDiscounts: Record<string, number>;
  creditLimit?: B2bCreditLimit;
};

function normBrand(name: string): string {
  return (name || "").trim().toUpperCase()
    .replace(/İ/g, "I").replace(/Ş/g, "S").replace(/Ğ/g, "G")
    .replace(/Ü/g, "U").replace(/Ö/g, "O").replace(/Ç/g, "C");
}

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
  indirimToplamKurus: number;
  kargoToplamKurus: number;
  ayriKargoKurus: number;
};

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
    const payPct = effectiveLineDiscountPct(pricing, l.urun, methodId, financial);
    kdvDahil += Math.round(satir * (1 - payPct / 100));
    const kargo = productShippingKurus(shipping, l.urun.stockCode || "");
    if (kargo.kurus > 0) {
      kargoToplam += kargo.kurus * l.adet;
      if (kargo.excluded) ayriKargo += kargo.kurus * l.adet;
    }
  }
  kdvDahil += kargoToplam;
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
