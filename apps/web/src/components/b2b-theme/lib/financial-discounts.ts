// Finansal iskontolar — panelde (Finansal İskontolar) tanımlanan, carinin tipine (Premium / Normal) göre
// ürün × ödeme yöntemi bazlı iskonto oranları. Eşleştirme SUNUCUDA yapılır; burası yalnız sorar ve gösterir.
// Sipariş ucu aynı kuralı uygular: listede/sepette görünen fiyat = sipariş tutarı.
import { API_ENDPOINTS } from "@src/config/api";

/** stokKodu → { ödemeYöntemi: oran(%) } (yalnız kuralı eşleşen ürün/yöntemler) */
export type FinancialDiscountMap = Record<string, Record<string, number>>;

/** Ödeme yöntemi (sunucudaki sıra ve adla): cari / havale / kkTek / kkTaksit */
// termDays: Cari Sipariş için carinin DIA ödeme planındaki vade günü
export type FinancialPaymentMethod = { id: string; title: string; termDays?: number };

/** Ürün başına kargo payı (TL, KDV dahil, 1 adet); excluded = fiyata dahil değil, sepette ayrı satır */
export type ProductShipping = { perUnit: number; excluded: boolean };

/** blocked: carinin vadesi geçen borcu var — oranlar ürün listesinde gösterilir ama sepette / siparişte uygulanmaz.
 *  shipping: stokKodu → kargo payı (sitede kargo ücreti kapalıysa boş). */
export type FinancialDiscounts = {
  tier: string;
  discounts: FinancialDiscountMap;
  methods?: FinancialPaymentMethod[];
  blocked?: boolean;
  shipping?: Record<string, ProductShipping>;
};

export const PREMIUM_TIER = "premium";
// Ürün listesinde gösterilen fiyatın ödeme yöntemi (taban: Cari Sipariş)
export const BASE_PAYMENT_METHOD = "cari";

const EMPTY: FinancialDiscounts = { tier: "", discounts: {} };

/** Verilen stok kodları için oturumdaki carinin finansal iskontolarını getirir. Hata/oturumsuzlukta boş döner. */
export async function fetchFinancialDiscounts(codes: string[]): Promise<FinancialDiscounts> {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  const unique = [...new Set(codes.filter(Boolean))];
  if (!token || unique.length === 0) return EMPTY;
  try {
    const res = await fetch(API_ENDPOINTS.b2b.finansalIskonto(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Site": "b2b" },
      body: JSON.stringify({ codes: unique }),
    });
    const json = await res.json();
    return json?.success && json.data
      ? {
          tier: json.data.tier || "",
          discounts: json.data.discounts || {},
          methods: json.data.methods || [],
          blocked: json.data.discountsBlocked === true,
          shipping: json.data.shipping || {},
        }
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** Sepet ve sepet paneli için: vadesi geçen borcu olan caride iskontolar uygulanmaz → oranlar boş döner. */
export async function fetchCartFinancialDiscounts(codes: string[]): Promise<FinancialDiscounts> {
  const result = await fetchFinancialDiscounts(codes);
  return result.blocked ? { ...result, discounts: {} } : result;
}

/** Ürünün birim kargo payı (kuruş, KDV dahil) ve fiyata dahil olup olmadığı; kargo yoksa 0 */
export function productShippingKurus(
  shipping: Record<string, ProductShipping> | null | undefined,
  stockCode: string,
): { kurus: number; excluded: boolean } {
  const s = shipping?.[stockCode];
  return s && s.perUnit > 0 ? { kurus: Math.round(s.perUnit * 100), excluded: s.excluded === true } : { kurus: 0, excluded: false };
}

/** Ürün + ödeme yöntemi için panel iskontosu; kural yoksa null (çağıran DIA oranına düşer). */
export function financialDiscountPct(map: FinancialDiscountMap | null | undefined, stockCode: string, methodId: string): number | null {
  const pct = map?.[stockCode]?.[methodId];
  return typeof pct === "number" ? pct : null;
}
