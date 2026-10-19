
const TL = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatKurus(kurus: number): string {
  return `${TL.format(kurus / 100)}₺`;
}

export function formatDate(d: Date): string {
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Taslak",
  SUBMITTED: "Alındı",
  CONFIRMED: "Onaylandı",
  PREPARING: "Hazırlanıyor",
  SHIPPED: "Kargoda",
  DELIVERED: "Teslim",
  CANCELLED: "İptal",
};
