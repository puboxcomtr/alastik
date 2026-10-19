import { API_ENDPOINTS } from "@src/config/api";

export type FinancialDiscountMap = Record<string, Record<string, number>>;

export type FinancialPaymentMethod = { id: string; title: string; termDays?: number };

export type ProductShipping = { perUnit: number; excluded: boolean };

export type FinancialDiscounts = {
  tier: string;
  discounts: FinancialDiscountMap;
  methods?: FinancialPaymentMethod[];
  blocked?: boolean;
  shipping?: Record<string, ProductShipping>;
  freeDelivery?: boolean;
};

export const PREMIUM_TIER = "premium";
export const BASE_PAYMENT_METHOD = "cari";

const EMPTY: FinancialDiscounts = { tier: "", discounts: {} };

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
          freeDelivery: json.data.freeDelivery === true,
        }
      : EMPTY;
  } catch {
    return EMPTY;
  }
}

export async function fetchCartFinancialDiscounts(codes: string[]): Promise<FinancialDiscounts> {
  const result = await fetchFinancialDiscounts(codes);
  return result.blocked ? { ...result, discounts: {} } : result;
}

export function catalogShipping(financial: FinancialDiscounts): Record<string, ProductShipping> | undefined {
  return financial.freeDelivery ? undefined : financial.shipping;
}

export function productShippingKurus(
  shipping: Record<string, ProductShipping> | null | undefined,
  stockCode: string,
): { kurus: number; excluded: boolean } {
  const s = shipping?.[stockCode];
  return s && s.perUnit > 0 ? { kurus: Math.round(s.perUnit * 100), excluded: s.excluded === true } : { kurus: 0, excluded: false };
}

export function financialDiscountPct(map: FinancialDiscountMap | null | undefined, stockCode: string, methodId: string): number | null {
  const pct = map?.[stockCode]?.[methodId];
  return typeof pct === "number" ? pct : null;
}
