import type { OrderStatus } from "@components/b2b-theme/lib/sample-data";
import { CheckIcon, CloseIcon } from "./icons";

const SIRA: OrderStatus[] = [
  "SUBMITTED",
  "CONFIRMED",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
];

/** 5 adımlı sipariş ilerleme göstergesi (tamamlananlar sarı). */
export function OrderSteps({ durum }: { durum: OrderStatus }) {
  if (durum === "CANCELLED") {
    return (
      <div className="steps">
        <span className="dot cancelled">
          <CloseIcon size={12} />
        </span>
        <span className="bar" />
        <span className="note" style={{ marginLeft: "0.5rem" }}>
          Sipariş iptal edildi
        </span>
      </div>
    );
  }
  const aktif = Math.max(0, SIRA.indexOf(durum));
  return (
    <div className="steps">
      {SIRA.map((s, i) => (
        <span key={s} style={{ display: "contents" }}>
          {i > 0 ? <span className={`bar${i <= aktif ? " done" : ""}`} /> : null}
          <span className={`dot${i <= aktif ? " done" : ""}`} title={s}>
            {i < aktif ? <CheckIcon size={11} /> : i + 1}
          </span>
        </span>
      ))}
    </div>
  );
}
