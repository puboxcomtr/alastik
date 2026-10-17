import { CrownIcon } from "./icons";

/**
 * Finansal iskonto etiketi.
 *  • Sepet satırı (ödeme yöntemi belli): Premium caride taçlı "Premium %7", diğerlerinde "%7 İskontolu".
 *  • Ürün listesi (personal): taçlı "Size Özel %5 İskontolu" — yalnız Premium cariye gösterilir (çağıran karar verir).
 */
export function FinancialDiscountTag({ pct, premium, personal }: { pct: number; premium: boolean; personal?: boolean }) {
  const rate = `%${pct.toLocaleString("tr-TR", { maximumFractionDigits: 2 })}`;
  return (
    <span className={`financial-tag${premium ? " financial-tag--premium" : ""}`}>
      {premium ? <CrownIcon size={11} filled /> : null}
      {personal ? `Size Özel ${rate} İskontolu` : premium ? `Premium ${rate}` : `${rate} İskontolu`}
    </span>
  );
}
